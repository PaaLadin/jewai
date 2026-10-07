"""Council Chat — общий чат для оператора и всех AI-каналов.

Порт 8770. Без внешних зависимостей.

API:
  GET  /                    -> index.html
  GET  /dashboard.html      -> dashboard.html (пульт, CRT)
  GET  /style.css           -> стили
  GET  /app.js              -> клиент
  GET  /mnemo.js            -> клиент мнемосхемы (B)
  GET  /api/messages        -> все сообщения (JSON)
  GET  /api/status          -> статус по mnemonic_contract.md v1.2
  GET  /api/activity?since= -> свежие события
  GET  /api/logs?name=X     -> хвост лога (chat|agent|svc|server)
  GET  /api/state           -> карта каналов
  POST /api/send            -> {from, to, text}
  POST /api/svc             -> {channel, kind, action} — этап 3 (501)
  POST /api/reload          -> {channel, what} — этап 3 (501)
  POST /api/close, /api/pause, /api/resume, /api/open

v1.2 (усиленный Б, апрув C DCCA0012.approve):
  - Вместо процентов от диапазона — cmds_from_start.
  - Пороги 500/800/1200 (эмпирика: 1A.5=844, 2A=1437).
  - Только для A. B/C/D — серая лампа (нет наблюдений).
"""
import sys as _sys, io as _io
try:
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding='utf-8',
                                      errors='replace', line_buffering=True)
except Exception:
    pass

import json, os, time, threading, subprocess, socket
import urllib.request
import urllib.parse as _up
import urllib.parse as _up
import urllib.parse as _up
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# --- Портирование (jewai): ROOT от файла, порты из config.json ---
_HERE = Path(__file__).resolve().parent  # sandbox/council_chat/
ROOT = _HERE.parent.parent
CHAT_DIR = ROOT / "sandbox" / "council_chat"

_cfg = {}
_cfg_path = ROOT / "config.json"
if _cfg_path.exists():
    try:
        _cfg = json.loads(_cfg_path.read_text(encoding="utf-8"))
    except Exception as _e:
        print("config.json read err:", _e)

CHAT_FILE = CHAT_DIR / "chat.jsonl"
TODO_DIR = CHAT_DIR / "todos"
TODO_DIR.mkdir(parents=True, exist_ok=True)

PORT = int(_cfg.get("chat_port", 8770))
BIND = str(_cfg.get("bind", "127.0.0.1"))
BRIDGE_KICK = ROOT / "sandbox" / "bridge_kick.py"
MEETING_FILE = CHAT_DIR / "meeting.json"
PAUSE_ALL_FILE = CHAT_DIR / "pause_all.json"
FLAGS_DIR = CHAT_DIR / "flags"
FLAGS_DIR.mkdir(parents=True, exist_ok=True)
HEALTH_TTL = 60
CDP_TIMEOUT = 6


def _build_channels(cfg):
    colors = ["#00ff66", "#33d6ff", "#c573ff", "#ffb000",
              "#ff5577", "#55ffd0", "#ffaa33", "#88aaff",
              "#ddaaff", "#aaff88"]
    dnames = {"A": "Аркадий", "B": "Борис", "C": "Семён", "D": "Димон"}
    letters = cfg.get("letters", list("ABCD"))
    ch_in = cfg.get("channels", {})
    ch = {}
    pre = {}
    for i, L in enumerate(letters):
        info = ch_in.get(L, {}) if isinstance(ch_in, dict) else {}
        ch[L] = {
            "name": info.get("name", dnames.get(L, "Агент " + L)),
            "agent": int(info.get("agent", 8760 + i)),
            "cdp": int(info.get("cdp", 9220 + i)),
            "color": colors[i % len(colors)],
            "todo": "TODO_" + L + ".md",
        }
        pre[L] = info.get("prefix", "AAAA" if L == "A" else (L + L + "AA"))
    return ch, pre


if _cfg:
    CHANNELS, CHANNEL_PREFIXES = _build_channels(_cfg)
else:
    CHANNELS = {
        "A": {"name": "Аркадий", "agent": 8766, "cdp": 9222,
              "color": "#00ff66", "todo": "TODO_A.md"},
        "B": {"name": "Борис", "agent": 8767, "cdp": 9223,
              "color": "#33d6ff", "todo": "TODO_B.md"},
        "C": {"name": "Семён", "agent": 8768, "cdp": 9224,
              "color": "#c573ff", "todo": "TODO_C.md"},
        "D": {"name": "Димон", "agent": 8769, "cdp": 9225,
              "color": "#ffb000", "todo": "TODO_D.md"},
    }
    CHANNEL_PREFIXES = {"A": "AAAA", "B": "BBAA",
                        "C": "CCAA", "D": "DDAA"}

CHANNELS_WITH_RISK = (list(CHANNELS.keys())[:1] or ("A",))

# Источник startId — logs/session_<CH>.json (формат: {"start": "AAAA4000"}).
# Если файл отсутствует — start = None, лампа серая.
SESSION_JSON = ROOT / "logs" / "session_{CH}.json"

# Категории ресурсов для отслеживания активности (mtime).
RESOURCE_PATHS = {
    "rag":     [ROOT / "algorithms", ROOT / "council", ROOT / "assistant"],
    "sandbox": [ROOT / "sandbox"],
    "council": [CHAT_DIR],
    "doh":     [],
}

MTIME_EXCLUDE_NAMES = {"chat.jsonl"}
MTIME_EXCLUDE_DIRS = {"runs", "_test", "recipes", "todos", "__pycache__", "node_modules"}

_lock = threading.Lock()
_dedup_send = {}
_DEDUP_WINDOW = 5.0
def _dedup_check(frm, to, text):
    import time as _t
    now = _t.time()
    key = (frm, to, text)
    last = _dedup_send.get(key)
    if last and (now - last) < _DEDUP_WINDOW:
        return False
    _dedup_send[key] = now
    if len(_dedup_send) > 30:
        for k in list(_dedup_send):
            if now - _dedup_send[k] > _DEDUP_WINDOW:
                del _dedup_send[k]
    return True
_status_cache = {"ts": 0, "data": None}
STATUS_TTL = 2


def append_message(msg):
    with _lock:
        with CHAT_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(msg, ensure_ascii=False) + "\n")


def load_messages():
    if not CHAT_FILE.exists():
        return []
    out = []
    with CHAT_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    return out


def _no_window_flags(detach=False):
    """Windows: скрыть окно cmd/python. Иначе — 0."""
    if _sys.platform != "win32":
        return 0
    f = subprocess.CREATE_NO_WINDOW
    if detach:
        f |= subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    return f


def kick(port, text):
    try:
        subprocess.Popen(
            [_sys.executable, str(BRIDGE_KICK), "--port", str(port), "--text", text, "--wait-empty", "10"],
            cwd=str(ROOT),
            creationflags=_no_window_flags(detach=True),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception as e:
        print("kick fail", port, e)


def kick_all(text):
    for ch in CHANNELS.values():
        kick(ch["cdp"], text)


def append_to_todo(ch_key, msg):
    ch = CHANNELS.get(ch_key)
    if not ch:
        return
    p = TODO_DIR / ch["todo"]
    line = "[%s] %s\n" % (time.strftime("%H:%M:%S"), msg.get("text", ""))
    with _lock:
        with p.open("a", encoding="utf-8") as f:
            f.write(line)


def ping_agent(port, timeout=1):
    try:
        with urllib.request.urlopen(
            "http://127.0.0.1:%d/ping" % port, timeout=timeout
        ) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        return None


def tcp_alive(port, timeout=0.5):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        r = s.connect_ex(("127.0.0.1", port))
        s.close()
        return r == 0
    except Exception:
        return False


def newest_mtime(paths, max_depth=3):
    best = 0.0
    for base in paths:
        if not base.exists():
            continue
        try:
            stack = [(base, 0)]
            while stack:
                d, depth = stack.pop()
                if depth > max_depth:
                    continue
                try:
                    with os.scandir(d) as it:
                        for e in it:
                            if e.name in MTIME_EXCLUDE_NAMES:
                                continue
                            if e.name in MTIME_EXCLUDE_DIRS:
                                continue
                            if e.name.startswith("."):
                                continue
                            try:
                                if e.is_file(follow_symlinks=False):
                                    m = e.stat(follow_symlinks=False).st_mtime
                                    if m > best:
                                        best = m
                                elif e.is_dir(follow_symlinks=False):
                                    stack.append((Path(e.path), depth + 1))
                            except Exception:
                                continue
                except Exception:
                    continue
        except Exception:
            continue
    return best


def last_chat_activity_by_channel():
    out = {"A": 0, "B": 0, "C": 0, "D": 0}
    for m in load_messages():
        frm = m.get("from")
        if frm in out:
            ts = m.get("ts", 0)
            if ts > out[frm]:
                out[frm] = ts
    return out


def parse_last_id(last_id_str):
    """'DDAA0803' -> (prefix, number) или None."""
    if not last_id_str or not isinstance(last_id_str, str):
        return None
    s = last_id_str.strip().upper()
    if len(s) < 8:
        return None
    pref = s[:4]
    digits = s[4:]
    if not digits.isdigit():
        return None
    return (pref, int(digits))


def read_start_id(ch_key):
    """Читает startId из logs/session_<CH>.json.
    Формат: {"start": "AAAA4000"}. Если файла нет — None.
    """
    p = Path(str(SESSION_JSON).replace("{CH}", ch_key))
    if not p.exists():
        return None
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        return d.get("start")
    except Exception:
        return None


def read_last_id(ch_key):
    """Читает lastId. Источник: панель через CDP — этап 3.
    Пока None. Кэшировать не нужно — вызывается редко.
    """
    return None


def risk_level(cmds, ch_key):
    if ch_key not in CHANNELS_WITH_RISK:
        return "grey"
    if cmds is None:
        return "grey"
    if cmds < RISK_WARN:
        return "green"
    if cmds < RISK_RED:
        return "yellow"
    if cmds < RISK_ALARM:
        return "red"
    return "blink"


def compute_progress(last_id_str, start_id_str, ch_key):
    """Возвращает dict:
       {cmds_from_start, risk, reason}.
    Логика — см. session_progress.py, где прогоняются кейсы.
    """
    expected = CHANNEL_PREFIXES.get(ch_key)
    if not expected:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_channel"}

    parsed_last = parse_last_id(last_id_str)
    if parsed_last is None:
        return {"cmds_from_start": None,
                "risk": risk_level(None, ch_key),
                "reason": "none"}

    pref_last, num_last = parsed_last

    if pref_last != expected:
        if pref_last[:3] == expected[:3]:
            return {"cmds_from_start": 0,
                    "risk": risk_level(0, ch_key),
                    "reason": "series_change"}
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "foreign_prefix"}

    if not start_id_str:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_start"}

    parsed_start = parse_last_id(start_id_str)
    if parsed_start is None:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_start"}

    pref_start, num_start = parsed_start
    if pref_start != expected:
        return {"cmds_from_start": 0, "risk": risk_level(0, ch_key),
                "reason": "series_change"}

    if num_last < num_start:
        return {"cmds_from_start": 0, "risk": risk_level(0, ch_key),
                "reason": "panel_reset"}

    cmds = num_last - num_start
    return {"cmds_from_start": cmds, "risk": risk_level(cmds, ch_key),
            "reason": "ok"}


def collect_status():
    """Состояние по mnemonic_contract.md v1.2."""
    now = time.time()
    if _status_cache["data"] is not None and (now - _status_cache["ts"]) < STATUS_TTL:
        return _status_cache["data"]

    res = {}
    for key, paths in RESOURCE_PATHS.items():
        if key == "doh":
            res[key] = {"last_access_ts": now if tcp_alive(9999) else 0}
        else:
            res[key] = {"last_access_ts": newest_mtime(paths)}

    chat_act = last_chat_activity_by_channel()
    channels_out = {}
    for ch_key, ch in CHANNELS.items():
        ping = ping_agent(ch["agent"])
        own_logs = ROOT / "logs" / ch_key
        mt = newest_mtime([own_logs], max_depth=2)
        last_act = max(chat_act.get(ch_key, 0), mt)
        last_id = read_last_id(ch_key)  # этап 3, пока None
        start_id = read_start_id(ch_key)
        prog = compute_progress(last_id, start_id, ch_key)
        svc_wd, svc_rec = read_svc_state(ch_key)
        svc_prm = read_svc_params(ch_key)
        channels_out[ch_key] = {
            "agent_ping": bool(ping),
            "panel_alive": None,
            "last_activity_ts": last_act,
            "lastId": last_id,
            "startId": start_id,
            "cmds_from_start": prog["cmds_from_start"],
            "risk": prog["risk"],
            "risk_reason": prog["reason"],
            "svc_watchdog": svc_wd,
            "svc_recovery": svc_rec,
            "svc_params": svc_prm,
        }

    links = {}
    for ch_key in CHANNELS:
        ts = channels_out[ch_key]["last_activity_ts"]
        links["chan%s_agent" % ch_key] = {"active": bool(ts and (now - ts) < 5),
                                          "last_ts": ts}
    for res_key, info in res.items():
        ts = info["last_access_ts"]
        for ch_key in CHANNELS:
            links["agent%s_%s" % (ch_key, res_key)] = {
                "active": bool(ts and (now - ts) < 5),
                "last_ts": ts,
            }
    links["mainframe_panel"] = {"active": True, "last_ts": now}

    # === ЖИВЫЕ ЛИНКИ МЕЖДУ АГЕНТАМИ (2D, задача оператора 16:50) ===
    # Источник: реальный трафик from->to в chat.jsonl.
    # Пара X->Y: ключ xlink_XY, last_ts последнего сообщения.
    pair_ts = {}
    bcast_ts = {}
    for m in load_messages():
        frm = m.get("from"); to = m.get("to"); ts = m.get("ts", 0)
        if frm not in CHANNELS:
            continue
        if to in CHANNELS and to != frm:
            k = "xlink_" + frm + to
            if ts > pair_ts.get(k, 0):
                pair_ts[k] = ts
        elif to == "ALL":
            if ts > bcast_ts.get(frm, 0):
                bcast_ts[frm] = ts
    for k, ts in pair_ts.items():
        links[k] = {"active": bool(ts and (now - ts) < 5), "last_ts": ts}
    # broadcast: зажигает исходящие из источника (X -> все)
    for frm, ts in bcast_ts.items():
        links["xlink_" + frm + "*"] = {"active": bool(ts and (now - ts) < 5),
                                       "last_ts": ts}
    # агент -> mainframe (совместимость с mnemo.js; связь через council-сообщения)
    for ch_key in CHANNELS:
        ts = max(bcast_ts.get(ch_key, 0),
                 max((v for k, v in pair_ts.items() if k[6:8] == ch_key), default=0))
        links["agent%s_mainframe" % ch_key] = {
            "active": bool(ts and (now - ts) < 5), "last_ts": ts}

    meeting_on = False
    paused_all = False
    try:
        if MEETING_FILE.exists():
            meeting_on = bool(json.loads(MEETING_FILE.read_text(encoding="utf-8")).get("on"))
    except Exception:
        pass
    try:
        if PAUSE_ALL_FILE.exists():
            paused_all = bool(json.loads(PAUSE_ALL_FILE.read_text(encoding="utf-8")).get("on"))
    except Exception:
        pass
    out = {
        "ok": True,
        "ts": now,
        "channels": channels_out,
        "resources": res,
        "mainframe": {"alive": True, "meeting": meeting_on, "paused_all": paused_all},
        "links": links,
    }
    _status_cache["ts"] = now
    _status_cache["data"] = out
    return out


def collect_activity(since):
    if since is None or since <= 0:
        since = time.time() - 60
    events = []
    for m in load_messages():
        ts = m.get("ts", 0)
        if ts > since:
            events.append({
                "ts": ts,
                "kind": "chat",
                "channel": m.get("from", "?"),
                "target": m.get("to", "ALL"),
            })
    return {"events": events[-200:]}


_health_cache = {"ts": 0, "data": None}
_warm_evt = threading.Event()
_alive_state = {}


def _chat_file(ch_key):
    return CHAT_DIR / ("chat_%s.jsonl" % ch_key.upper())


def load_personal(ch_key):
    p = _chat_file(ch_key)
    if not p.exists():
        return []
    out = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except Exception:
            continue
    return out


def append_personal(ch_key, msg):
    p = _chat_file(ch_key)
    with _lock:
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(msg, ensure_ascii=False) + "\n")


def next_personal_id(ch_key, from_role):
    """Монотонный id для пары. from_role: 'operator' или буква канала.
    Формат: [OP<CH><NNNN>] оператор->агент, [<CH>AA<NNNN>] агент->оператор.
    """
    ch = ch_key.upper()
    # двойная буква канала = первые две буквы префикса (AA, BB, CC, DD)
    dbl = CHANNEL_PREFIXES.get(ch, ch + ch)[:2]
    if from_role == "operator":
        pref = "Z" + ch + "AA"
    else:
        pref = from_role.upper()[:1] + "Z" + "AA"
    nums = []
    for m in load_personal(ch_key):
        mid = (m.get("id") or "")
        if mid.startswith(pref):
            tail = mid[len(pref):]
            if tail.isdigit():
                nums.append(int(tail))
    n = (max(nums) + 1) if nums else 1
    return "%s%04d" % (pref, n)


def read_svc_params(ch_key):
    """Читает logs/svc/<kind>_<CH>.pid -> params. Возвращает dict."""
    svc_dir = ROOT / "logs" / "svc"
    out = {}
    for kind in ("watchdog", "recovery"):
        p = svc_dir / ("%s_%s.pid" % (kind, ch_key))
        if not p.exists():
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            prm = {}
            if "interval" in d: prm["interval"] = d["interval"]
            if "threshold" in d: prm["threshold"] = d["threshold"]
            if "cooldown" in d: prm["cooldown"] = d["cooldown"]
            out[kind] = prm
        except Exception:
            pass
    return out


def read_svc_state(ch_key):
    """Читает logs/svc/watchdog_<CH>.json. Возвращает (wd, rec)."""
    svc_dir = ROOT / "logs" / "svc"
    wd = None
    rec = None
    for kind, var in (("watchdog", "wd"), ("recovery", "rec")):
        p = svc_dir / f"{kind}_{ch_key}.json"
        if not p.exists():
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
            state = d.get("state", "off")
            val = (state == "on")
            if kind == "watchdog":
                wd = val
            else:
                rec = val
        except Exception:
            pass
    return wd, rec


def svc_status(ch_key):

    try:
        r = subprocess.run([_sys.executable, str(ROOT / "sandbox" / "svc.py"), "status",
                            "--channel", ch_key], capture_output=True, text=True,
                           timeout=CDP_TIMEOUT, encoding="utf-8", errors="replace",
                           creationflags=_no_window_flags())
        out = (r.stdout or "").strip().splitlines()
        jline = "{}"
        for ln in reversed(out):
            if ln.strip().startswith("{"):
                jline = ln.strip(); break
        d = json.loads(jline)
        sv = d.get("services", {})
        return bool(sv.get("watchdog", {}).get("on")), bool(sv.get("recovery", {}).get("on"))
    except Exception as _e:
        try:
            (ROOT / "svc_status_err.log").write_text(repr(_e), encoding="utf-8")
        except Exception:
            pass
        return None, None


def panel_lastid(cdp):
    try:
        r = subprocess.run([_sys.executable, str(ROOT / "sandbox" / "read_panel_lastid.py"),
                            str(cdp)], capture_output=True, text=True, timeout=CDP_TIMEOUT,
                           encoding="utf-8", errors="replace",
                           creationflags=_no_window_flags())
        d = json.loads(r.stdout or "{}")
        return d.get("lastId"), d.get("session_min")
    except Exception:
        return None, None


def panel_content(cdp):
    """True=жива, False=мертва, None=timeout. Не роняет health."""
    try:
        r = subprocess.run([_sys.executable, str(ROOT / "sandbox" / "read_heartbeat.py"), str(cdp)],
                           capture_output=True, text=True, timeout=CDP_TIMEOUT,
                           encoding="utf-8", errors="replace",
                           creationflags=_no_window_flags())
        if r.returncode == -1 or "TimeoutExpired" in (r.stderr or ""):
            return None
        return (r.returncode == 0)
    except Exception:
        return None


def alive_button_state(ch, now):
    """grey/yellow/green по _alive_state."""
    st = _alive_state.get(ch)
    if not st:
        return "grey"
    if st.get("ack_ts") and (now - st["ack_ts"]) < 10:
        return "green"
    if st.get("push_ts") and (now - st["push_ts"]) < 45:
        return "yellow"
    return "grey"


def collect_health():
    now = time.time()
    if _health_cache["data"] is not None and (now - _health_cache["ts"]) < HEALTH_TTL:
        return _health_cache["data"]
    # если prewarm ещё идёт - НЕ блокируем на 20с, отдаём warming сразу
    if not _warm_evt.is_set() and _health_cache["data"] is None:
        return {"ok": True, "warming": True, "ts": now,
                "matrix": {}, "alerts": [],
                "note": "first warm-up in progress, retry in 2s"}
    base = collect_status()
    matrix = {}
    alerts = []
    # ВСЁ параллельно: heartbeat + lastid + svc на каждый канал.
    with ThreadPoolExecutor(max_workers=12) as ex:
        hb = {k: ex.submit(panel_content, ch["cdp"]) for k, ch in CHANNELS.items()}
        lid = {k: ex.submit(panel_lastid, ch["cdp"]) for k, ch in CHANNELS.items()}
        svc = {k: ex.submit(svc_status, k) for k in CHANNELS}
        gres = {}
        for k in CHANNELS:
            lastid, sess = lid[k].result()
            wd, rec = svc[k].result()
            gres[k] = (wd, rec, lastid, sess, hb[k].result())

    for ch_key, ch in CHANNELS.items():
        c = base["channels"].get(ch_key, {})
        wd, rec, lastid, sess, content = gres[ch_key]
        cmds = c.get("cmds_from_start")
        agent = c.get("agent_ping")
        last_act = c.get("last_activity_ts")
        matrix[ch_key] = {
            "content": content, "agent": agent, "watchdog": wd, "recovery": rec,
            "lastId": lastid, "session_min": sess, "last_activity": last_act,
            "cmds_from_start": cmds, "risk": c.get("risk"),
            "alive_button": alive_button_state(ch_key, now),
        }
        # триггеры (поправка C1: универсальный для B/C/D)
        if content is False and agent is True:
            alerts.append({"channel": ch_key, "kind": "content_dead", "text": "panel dead, agent alive -> reload"})
        if agent is False and content is True:
            alerts.append({"channel": ch_key, "kind": "agent_dead", "text": "agent down -> restart"})
        if content is None:
            alerts.append({"channel": ch_key, "kind": "panel_timeout", "text": "CDP no answer >" + str(CDP_TIMEOUT) + "s"})
        if wd is False and last_act and (now - last_act) < 300:
            alerts.append({"channel": ch_key, "kind": "watchdog_off", "text": "channel active without watchdog"})
    out = {"ok": True, "ts": now, "matrix": matrix, "alerts": alerts}
    _health_cache["ts"] = now
    _health_cache["data"] = out
    return out


def flag_path(ch):
    return FLAGS_DIR / ("alive_%s.json" % ch)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a, **kw):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        elif isinstance(body, str):
            body = body.encode("utf-8")
        try:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception:
            pass

    def do_GET(self):
        if self.path.startswith("/api/say/"):
            parts = self.path.split("?", 1)
            ch = parts[0].replace("/api/say/", "").strip("/")
            q = _up.parse_qs(parts[1]) if len(parts) > 1 else {}
            txt = q.get("text", [""])[0]
            to = q.get("to", ["ALL"])[0]
            if ch in CHANNELS and txt:
                msg = {"ts": time.time(), "time": time.strftime("%H:%M:%S"),
                       "from": ch, "to": to, "text": txt}
                append_message(msg)
                self._send(200, {"ok": True, "msg": msg})
                return
            self._send(400, {"error": "bad", "ch": ch, "text": txt})
            return
        if self.path == "/" or self.path == "/index.html":
            p = CHAT_DIR / "index.html"
            if p.exists():
                self._send(200, p.read_text(encoding="utf-8"), "text/html; charset=utf-8")
            else:
                self._send(404, "not found", "text/plain")
        elif self.path == "/dashboard.html" or self.path == "/dashboard":
            p = CHAT_DIR / "dashboard.html"
            if p.exists():
                self._send(200, p.read_text(encoding="utf-8"), "text/html; charset=utf-8")
            else:
                self._send(404, "not found", "text/plain")
        elif self.path == "/roadmap.html" or self.path == "/roadmap":
            rm_file = ROOT / "game" / "ROADMAP.html"
            if rm_file.exists():
                body = rm_file.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            self.send_response(404); self.end_headers(); return
        elif self.path == "/projects.html" or self.path == "/projects":
            proj_file = ROOT / "sandbox" / "council_chat" / "projects.html"
            if proj_file.exists():
                body = proj_file.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            self.send_response(404); self.end_headers(); return
        elif self.path == "/style.css":
            p = CHAT_DIR / "style.css"
            self._send(200, p.read_text(encoding="utf-8"), "text/css; charset=utf-8")
        elif self.path == "/app.js":
            p = CHAT_DIR / "app.js"
            self._send(200, p.read_text(encoding="utf-8"), "application/javascript; charset=utf-8")
        elif self.path == "/mnemo.js":
            p = CHAT_DIR / "mnemo.js"
            if p.exists():
                self._send(200, p.read_text(encoding="utf-8"), "application/javascript; charset=utf-8")
            else:
                self._send(404, "no mnemo", "text/plain")
        elif self.path.startswith("/api/messages"):
            self._send(200, load_messages())
        elif self.path.startswith("/api/activity"):
            q = _up.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
            since = float(q.get("since", ["0"])[0]) if q.get("since") else None
            self._send(200, collect_activity(since))
        elif self.path == "/api/status":
            self._send(200, collect_status())
        elif self.path == "/api/meeting":
            on = False
            try:
                if MEETING_FILE.exists():
                    on = bool(json.loads(MEETING_FILE.read_text(encoding="utf-8")).get("on"))
            except Exception:
                pass
            self._send(200, {"on": on})

        elif self.path == "/api/health":
            self._send(200, collect_health())
        elif self.path.startswith("/api/alive"):
            q = _up.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
            ch = q.get("ch", [""])[0].upper()
            if ch in CHANNELS:
                self._send(200, {"ch": ch, "pending": flag_path(ch).exists(),
                                 "button": alive_button_state(ch, time.time())})
            else:
                self._send(200, {"flags": {k: flag_path(k).exists() for k in CHANNELS}})
        elif self.path.startswith("/api/roadmap"):
            q = _up.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
            name = (q.get("name") or ["game"])[0]
            state_dir = ROOT / "logs" / "roadmap_state"
            state_dir.mkdir(parents=True, exist_ok=True)
            state_file = state_dir / (name + ".json")
            body = b"{}"
            if state_file.exists():
                try:
                    body = state_file.read_bytes()
                except Exception:
                    body = b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except Exception:
                pass
            return
        elif self.path.startswith("/api/chat_index"):
            counts = {}
            for k in CHANNELS:
                counts[k] = len(load_personal(k))
            self._send(200, {"ok": True, "channels": list(CHANNELS.keys()),
                             "counts": counts})
        elif self.path.startswith("/api/chat/"):
            ch_key = self.path.split("/api/chat/", 1)[1].split("?")[0].upper()
            if ch_key not in CHANNELS:
                self._send(404, {"ok": False, "error": "unknown channel",
                                 "ch": ch_key})
                return
            msgs = load_personal(ch_key)
            self._send(200, {"ok": True, "channel": ch_key,
                             "messages": msgs[-200:], "count": len(msgs)})
        elif self.path == "/api/state":
            self._send(200, {"channels": CHANNELS, "ok": True})
        elif self.path.startswith("/api/logs"):
            q = _up.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
            name = (q.get("name", ["chat"])[0] or "chat").strip()
            tails = {"chat": CHAT_DIR / "chat.jsonl", "agent": ROOT / "agent.log",
                     "svc": ROOT / "svc.log", "server": CHAT_DIR / "server_out.log"}
            fp = tails.get(name)
            if fp is None:
                self._send(404, {"error": "unknown log", "name": name})
            elif not fp.exists():
                self._send(200, {"name": name, "content": "(empty)"})
            else:
                try:
                    ls = fp.read_text(encoding="utf-8", errors="replace").splitlines()
                    self._send(200, {"name": name, "content": "\n".join(ls[-200:])})
                except Exception as e:
                    self._send(200, {"name": name, "content": "err " + str(e)[:100]})
        elif self.path.startswith("/fs/"):
            # /fs/<относительный путь от ROOT>
            import urllib.parse as _upq
            rel = _upq.unquote(self.path[4:]).replace("\\", "/").lstrip("/")
            try:
                target = (ROOT / rel).resolve()
                target.relative_to(ROOT.resolve())
            except Exception:
                self._send(403, {"error": "forbidden"}); return
            if target.is_dir():
                target = target / "index.html"
            if not target.exists() or not target.is_file():
                self._send(404, {"error": "not found", "path": str(rel)}); return
            ext = target.suffix.lower()
            ctype = {
                ".html": "text/html; charset=utf-8",
                ".htm":  "text/html; charset=utf-8",
                ".js":   "application/javascript; charset=utf-8",
                ".css":  "text/css; charset=utf-8",
                ".json": "application/json; charset=utf-8",
                ".svg":  "image/svg+xml",
                ".png":  "image/png",
                ".jpg":  "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif":  "image/gif",
                ".md":   "text/plain; charset=utf-8",
                ".txt":  "text/plain; charset=utf-8",
            }.get(ext, "application/octet-stream")
            try:
                body = target.read_bytes()
            except Exception as e:
                self._send(500, {"error": repr(e)[:120]}); return
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            try:
                self.wfile.write(body)
            except Exception:
                pass
            return

        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(n) if n else b""
        try:
            data = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            data = {}

        if self.path == "/api/send":
            frm = data.get("from", "operator")
            to = data.get("to", "ALL")
            text = data.get("text", "").strip()
            if not text:
                self._send(400, {"error": "empty text"})
                return
            # PAUSE-ALL: пишет только оператор (задача оператора 16:46)
            if frm != "operator":
                try:
                    _pa = PAUSE_ALL_FILE.exists() and bool(json.loads(PAUSE_ALL_FILE.read_text(encoding="utf-8")).get("on"))
                except Exception:
                    _pa = False
                if _pa:
                    self._send(403, {"ok": False, "error": "paused_all: only operator can write"})
                    return
            msg = {"ts": time.time(), "time": time.strftime("%H:%M:%S"),
                   "from": frm, "to": to, "text": text}
            # Дедупликация: одно и то же (from,to,text) в течение 5 сек
            # не пишем второй раз (защита от дабл-клика и эха).
            if not _dedup_check(frm, to, text):
                self._send(200, {"ok": True, "dedup": True, "msg": msg})
                return
            append_message(msg)
            if frm == "operator":
                if to == "ALL":
                    kick_all("[COUNCIL] Новая задача от оператора. Прочитай council_chat/chat.jsonl последнюю строку.")
                elif to in CHANNELS:
                    ch = CHANNELS[to]
                    kick(ch["cdp"], "[COUNCIL] Оператор обратился к тебе. Прочитай council_chat/chat.jsonl последнюю строку.")
                    append_to_todo(to, msg)
            self._send(200, {"ok": True, "msg": msg})

        elif self.path == "/api/svc":
            ch_key = (data.get("channel") or "").upper()
            kind = (data.get("kind") or "").lower()
            action = (data.get("action") or "").lower()
            if ch_key not in CHANNELS or kind not in ("watchdog", "recovery") \
               or action not in ("start", "stop"):
                self._send(400, {"ok": False, "error": "bad params",
                                 "channel": ch_key, "kind": kind,
                                 "action": action})
                return
            try:
                args = [_sys.executable, str(ROOT / "sandbox" / "svc.py"),
                        action, "--channel", ch_key, "--kind", kind]
                if action == "start":
                    if kind == "watchdog":
                        args += ["--interval", str(int(data.get("interval", 30))),
                                 "--threshold", str(int(data.get("threshold", 3)))]
                    else:
                        args += ["--cooldown", str(int(data.get("cooldown", 300)))]
                r = subprocess.run(args, capture_output=True, text=True,
                                   timeout=CDP_TIMEOUT, encoding="utf-8",
                                   errors="replace", creationflags=_no_window_flags())
                out = (r.stdout or "").strip()
                err = (r.stderr or "").strip()
                # читаем актуальное состояние
                wd, rec = read_svc_state(ch_key)
                resp = {"ok": r.returncode == 0, "channel": ch_key,
                        "kind": kind, "action": action,
                        "rc": r.returncode,
                        "out": out[-400:], "err": err[-400:],
                        "watchdog": wd, "recovery": rec}
            except Exception as e:
                resp = {"ok": False, "error": repr(e)[:200]}
            self._send(200, resp)

        elif self.path == "/api/reload":
            self._send(501, {"ok": False, "error": "not implemented yet",
                             "detail": "/api/reload — этап 3", "request": data})

        elif self.path == "/api/meeting":
            on = bool(data.get("on", False))
            if on:
                kick_all("[HALT] СОВЕЩАНИЕ. СТОП рабочим операциям (run/write/sandbox). Общение в чате РАЗРЕШЕНО. Работай только языком, не инструментами. Ждать [RESUME].")
            else:
                for ch_key, ch in CHANNELS.items():
                    kick(ch["cdp"], "[RESUME] Совещание окончено. Возобновляй работу.")
            try:
                MEETING_FILE.write_text(
                    json.dumps({"on": on, "ts": time.time()}, ensure_ascii=False),
                    encoding="utf-8")
            except Exception as e:
                print("meeting write err", e)
            self._send(200, {"ok": True, "meeting": on})

        elif self.path.startswith("/api/chat/"):
            ch_key = self.path.split("/api/chat/", 1)[1].split("?")[0].upper()
            if ch_key not in CHANNELS:
                self._send(404, {"ok": False, "error": "unknown channel"})
                return
            frm = (data.get("from") or "operator").strip()
            text = (data.get("text") or "").strip()
            if not text:
                self._send(400, {"ok": False, "error": "empty text"})
                return
            # ACL: писать в чат X может только оператор или сам X
            if frm != "operator" and frm.upper() != ch_key:
                self._send(403, {"ok": False, "error": "forbidden_from",
                                 "channel": ch_key, "from": frm})
                return
            mid = (data.get("id") or "").strip() or next_personal_id(ch_key, frm)
            msg = {"ts": time.time(), "time": time.strftime("%H:%M:%S"),
                   "id": mid, "from": frm, "to": ("operator" if frm != "operator" else ch_key),
                   "text": text}
            append_personal(ch_key, msg)
            if frm == "operator":
                kick(CHANNELS[ch_key]["cdp"],
                     "[%s] %s" % (mid, text[:80]))
            self._send(200, {"ok": True, "id": mid, "channel": ch_key,
                             "ts": msg["ts"]})

        elif self.path == "/api/pause_all":
            on = bool(data.get("on", False))
            if on:
                kick_all("[PAUSE-ALL] СТОП ВСЕМ. Чат закрыт для агентов. Пишет только оператор. Не писать, не кикать, не работать. Ждать [RESUME].")
            else:
                for ch_key, ch in CHANNELS.items():
                    kick(ch["cdp"], "[RESUME] Пауза снята. Возобновляй работу.")
            try:
                PAUSE_ALL_FILE.write_text(
                    json.dumps({"on": on, "ts": time.time()}, ensure_ascii=False),
                    encoding="utf-8")
            except Exception as e:
                print("pause_all write err", e)
            self._send(200, {"ok": True, "paused_all": on})

        elif self.path == "/api/alive":
            ch = (data.get("ch") or "").upper()
            if ch not in CHANNELS:
                self._send(400, {"error": "bad channel", "ch": ch}); return
            fp = flag_path(ch)
            try:
                fp.write_text(json.dumps({"ts": time.time(), "ch": ch}, ensure_ascii=False), encoding="utf-8")
            except Exception as e:
                self._send(500, {"error": str(e)[:100]}); return
            _alive_state[ch] = {"push_ts": time.time()}
            kick(CHANNELS[ch]["cdp"], "[COUNCIL] ALIVE? " + ch + " - reply in chat.")
            self._send(200, {"ok": True, "ch": ch, "flag": str(fp)})

        elif self.path == "/api/alive_ack":
            ch = (data.get("ch") or "").upper()
            if ch in _alive_state:
                _alive_state[ch]["ack_ts"] = time.time()
            else:
                _alive_state[ch] = {"ack_ts": time.time()}
            self._send(200, {"ok": True, "ch": ch})

        elif self.path == "/api/roadmap":
            try:
                name = data.get("name", "game")
                state = data.get("state", {})
                state_dir = ROOT / "logs" / "roadmap_state"
                state_dir.mkdir(parents=True, exist_ok=True)
                state_file = state_dir / (name + ".json")
                state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
                resp = {"ok": True, "file": str(state_file), "keys": len(state)}
            except Exception as e:
                resp = {"ok": False, "error": repr(e)[:200]}
            body = json.dumps(resp, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        elif self.path == "/api/close":
            kick_all("[COUNCIL] Чат закрыт. Продолжай работу. Инструкции — в своём TODO.")
            self._send(200, {"ok": True})

        elif self.path == "/api/pause":
            kick_all("[COUNCIL] PAUSE. Приостанови работу, слушай чат.")
            self._send(200, {"ok": True})

        elif self.path == "/api/resume":
            kick_all("[COUNCIL] RESUME. Продолжай работу.")
            self._send(200, {"ok": True})

        elif self.path == "/api/open":
            kick_all("[COUNCIL] Оператор открыл штабной чат. Приостанови текущую работу, слушай чат.")
            self._send(200, {"ok": True})

        else:
            self._send(404, {"error": "not found"})


def prewarm():
    """Фоновое заполнение health-кэша при старте, чтобы первый запрос был hot."""
    import time as _t
    _t.sleep(2)
    try:
        collect_health()
        print("prewarm health ok", flush=True)
    except Exception as e:
        print("prewarm err", e, flush=True)
    finally:
        _warm_evt.set()


def main():
    print("council_chat server on http://%s:%d" % (BIND, PORT))
    print("  channels: " + ", ".join("%s:%d" % (k, v["agent"])
                                       for k, v in CHANNELS.items()))
    threading.Thread(target=prewarm, daemon=True).start()
    httpd = ThreadingHTTPServer((BIND, PORT), Handler)
    httpd.serve_forever()


if __name__ == "__main__":
    main()