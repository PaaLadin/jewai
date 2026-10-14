"""LEGACY: la_watchdog.py переименован в la_rebirth_monitor.py (2026-10-14). Оставлен для истории/совместимости. Новый - la_rebirth_monitor.py."""
"""la_watchdog.py - внешний сторож для Лады (LA, local_ai).

Пинкует Ладу по расписанию (не полагается на её память).
Фаза 1: RAG-сторож. Читает новые сообщения чатов, отдаёт Ладе
на фильтрацию (что полезно для базы знаний).

Usage:
  python sandbox/la_watchdog.py --once         # один прогон
  python sandbox/la_watchdog.py --loop 1800    # каждые 30 мин
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.request

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
CHAT = os.path.join(ROOT, "sandbox", "council_chat", "chat.jsonl")
STATE = os.path.join(ROOT, "projects", "local_ai", "la_state.json")
LA_URL = "http://127.0.0.1:8090/query"


def load_state():
    if os.path.exists(STATE):
        try:
            with io.open(STATE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_ts": 0}


def save_state(st):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with io.open(STATE, "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False)


def new_messages(since_ts):
    out = []
    if not os.path.exists(CHAT):
        return out
    with io.open(CHAT, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                j = json.loads(line)
            except Exception:
                continue
            ts = j.get("ts", 0)
            if ts > since_ts:
                out.append(j)
    return out


def useful(msgs):
    """Фильтр: содержательные сообщения (для RAG)."""
    keep = []
    for m in msgs:
        txt = (m.get("text") or "").strip()
        if not txt or len(txt) < 30:
            continue
        low = txt.lower()
        if "[agent report]" in low or "[alive" in low:
            continue
        if "wait-empty" in low or txt.startswith("sent "):
            continue
        keep.append(m)
    return keep


def ask_la(msgs):
    """Отдать Ладе пачку сообщений на оценку."""
    lines = []
    for m in msgs[:15]:
        lines.append("%s->%s: %s" % (m.get("from","?"), m.get("to","?"), (m.get("text","") or "")[:300]))
    head = ("Ниже - новые сообщения из чата агентов проекта. "
            "Оцени: есть ли среди них полезное для базы знаний "
            "(идеи, решения, ссылки, правила)? Если да - перечисли "
            "кратко, что стоит сохранить. Если нет - ответь НЕТ.")
    prompt = head + "\n\n" + "\n".join(lines)
    payload = json.dumps({"text": prompt}).encode("utf-8")
    req = urllib.request.Request(LA_URL, data=payload,
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        j = json.loads(r.read().decode("utf-8", "replace"))
    return j.get("answer", "")


def run_once():
    st = load_state()
    msgs = new_messages(st.get("last_ts", 0))
    print("new=%d" % len(msgs))
    if not msgs:
        return
    # берём порцию: не более BATCH за прогон, двигаем last_ts по ней
    BATCH = 15
    batch = msgs[:BATCH]
    us = useful(batch)
    print("batch=%d useful=%d" % (len(batch), len(us)))
    if us:
        try:
            ans = ask_la(us)
            print("LA: %s" % ans[:300])
        except Exception as e:
            print("LA ERR: %r" % e)
    st["last_ts"] = max(m.get("ts", 0) for m in batch)
    save_state(st)


REBIRTH_TABLE = os.path.join(ROOT, "logs", "rebirth", "series_table.json")
REBIRTH_STATE = os.path.join(ROOT, "logs", "rebirth", "reminders.jsonl")
PANEL_SCRIPT = os.path.join(ROOT, "sandbox", "read_panel_state.py")
CDP = {"A": 9222, "B": 9223, "C": 9224, "D": 9225}
KICK_PY = os.path.join(ROOT, "sandbox", "bridge_kick.py")


def _probe_lastid(ch):
    """Читает lastId канала через read_panel_state.py (API отдаёт null)."""
    import subprocess, re
    try:
        r = subprocess.run([sys.executable, PANEL_SCRIPT, str(CDP[ch])],
                           capture_output=True, text=True, timeout=30, cwd=ROOT)
        txt = (r.stdout or "") + (r.stderr or "")
        m = re.search(r"lastId\s+([A-Z]{4}\d{4})", txt)
        return m.group(1) if m else None
    except Exception:
        return None


def _num(idstr):
    """AAAB0088 -> 88 (числовая часть). Для метрики внутри серии."""
    try:
        return int(idstr[4:])
    except Exception:
        return None


def _load_series():
    if not os.path.exists(REBIRTH_TABLE):
        return None
    try:
        with io.open(REBIRTH_TABLE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _reminder_fired(ch, level):
    """Не спамить: напоминание уровня level каналу ch не чаще 30 мин."""
    if not os.path.exists(REBIRTH_STATE):
        return False
    cutoff = time.time() - 1800
    try:
        with io.open(REBIRTH_STATE, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    j = json.loads(line)
                except Exception:
                    continue
                if j.get("ch") == ch and j.get("level") == level and j.get("ts", 0) > cutoff:
                    return True
    except Exception:
        pass
    return False


def _log_reminder(ch, level, last_id, cmds):
    os.makedirs(os.path.dirname(REBIRTH_STATE), exist_ok=True)
    with io.open(REBIRTH_STATE, "a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": time.time(), "ch": ch, "level": level,
                            "last_id": last_id, "cmds": cmds}, ensure_ascii=False) + "\n")


def _kick(ch, text):
    import subprocess
    try:
        subprocess.run([sys.executable, KICK_PY, "--port", str(CDP[ch]),
                        "--text", text, "--wait-empty", "5"],
                       capture_output=True, text=True, timeout=30, cwd=ROOT)
    except Exception:
        pass


def rebirth_monitor():
    """Проверяет пороги 500/700/850 по каждому каналу, кикает напоминания."""
    tab = _load_series()
    if not tab:
        print("no series_table.json")
        return
    th = tab.get("rebirth", {}).get("thresholds", {"info":500,"warn":700,"critical":850})
    _summary = []
    for ch, info in tab.get("channels", {}).items():
        lid = _probe_lastid(ch)
        if not lid:
            print("%s: lastId probe FAIL" % ch)
            continue
        n = _num(lid)
        start = _num(info.get("range", [None, None])[0] or "")
        if n is None or start is None:
            print("%s: parse FAIL (%s)" % (ch, lid))
            continue
        cmds = n - start
        print("%s: %s cmds=%d" % (ch, lid, cmds))
        _summary.append("%s=%d" % (ch, cmds))
        level = None
        if cmds >= th.get("critical", 850):
            level = "critical"
        elif cmds >= th.get("warn", 700):
            level = "warn"
        elif cmds >= th.get("info", 500):
            level = "info"
        if not level or _reminder_fired(ch, level):
            continue
        ns = info.get("next_series")
        nr = info.get("next_range", ["?","?"])
        msg = ("[LA>%s] cmds=%d (%s). %s\\n"
               "Текущая: %s, %s, %s-%s.\\n"
               "Следующая: %s, %s-%s.\\n"
               "Готовь TODO, HANDOVER, PROMPT_%s. "
               "При готовности дай оп-блок rebirth_ready." % (
                   ch, cmds, lid,
                   "ПОРА ПЕРЕРОЖДАТЬСЯ" if level=="critical" else "готовь перерождение",
                   info.get("current_series"), info.get("name"),
                   info.get("range", ["?","?"])[0], info.get("range", ["?","?"])[1],
                   ns, nr[0], nr[1], ns))
        _kick(ch, msg)
        _log_reminder(ch, level, lid, cmds)
        print("  -> kicked %s (%s)" % (ch, level))
        _alog("reminder %s level=%s cmds=%d" % (ch, level, cmds))
    _alog("monitor ok: " + " ".join(_summary))
    # hold-режим: если чат канала переполнен — сам ставим ready (триггер №2)
    _check_limit_and_ready(tab)
    # после обхода — проверить флаги готовности
    auto_rebirth_check()


AUTO_LOG = os.path.join(ROOT, "logs", "rebirth", "watchdog.log")
MASTER = os.path.join(ROOT, "sandbox", "rebirth_master.py")
LOCK = os.path.join(ROOT, "logs", "rebirth", "rebirth.lock")


def _alog(msg):
    os.makedirs(os.path.dirname(AUTO_LOG), exist_ok=True)
    with io.open(AUTO_LOG, "a", encoding="utf-8") as f:
        f.write("[%s] %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), msg))


def _lock_free():
    if not os.path.exists(LOCK):
        return True
    try:
        with io.open(LOCK, "r", encoding="utf-8") as f:
            d = json.load(f)
        # lock старше 1 часа — протух
        return (time.time() - d.get("ts", 0)) > 3600
    except Exception:
        return True


def _check_limit_and_ready(tab):
    """Hold-режим: если канал в hold_<CH>.flag и чат переполнен —
    сами ставим ready_<CH>.json, чтобы master переродил (триггер №2)."""
    import subprocess as _sp
    CHAT_LIMIT = os.path.join(ROOT, "sandbox", "chat_limit.py")
    for ch in ("A", "B", "C", "D", "E", "F"):
        hold = os.path.join(REBIRTH_TABLE.replace("series_table.json", ""),
                            "hold_%s.flag" % ch)
        if not os.path.exists(hold):
            continue
        cdp = CDP.get(ch)
        if not cdp:
            continue
        try:
            r = _sp.run([sys.executable, CHAT_LIMIT, "--port", str(cdp)],
                               capture_output=True, text=True, timeout=30, cwd=ROOT)
            if "LIMIT" in (r.stdout or ""):
                flag = os.path.join(os.path.dirname(hold), "ready_%s.json" % ch)
                if not os.path.exists(flag):
                    with io.open(flag, "w", encoding="utf-8") as f:
                        json.dump({"channel": ch, "ts": time.time(),
                                   "source": "watchdog chat-limit"}, f)
                    _alog("CHAT-LIMIT %s -> ready flag set (hold mode)" % ch)
        except Exception as e:
            _alog("chat-limit check %s ERR: %r" % (ch, e))


def auto_rebirth_check():
    """Ловит флаг ready_<CH>.json -> запускает rebirth_master --live.
    Одно перерождение за раз (lock). Пишет лог."""
    if not _lock_free():
        _alog("lock busy, skip")
        return
    for ch in ("A", "B", "C", "D"):
        flag = os.path.join(ROOT, "logs", "rebirth", "ready_%s.json" % ch)
        if not os.path.exists(flag):
            continue
        # проверим свежесть флага (не старше 2 часов)
        try:
            age = time.time() - os.path.getmtime(flag)
        except Exception:
            age = 99999
        if age > 7200:
            _alog("flag %s stale (%.0fs), skip" % (ch, age))
            continue
        _alog("READY flag found for %s -> launch rebirth_master --live" % ch)
        try:
            import subprocess
            r = subprocess.run([sys.executable, MASTER, "--channel", ch, "--live"],
                               capture_output=True, text=True, timeout=280, cwd=ROOT)
            _alog("rebirth_master %s rc=%d" % (ch, r.returncode))
            for line in ((r.stdout or "") + (r.stderr or "")).splitlines():
                _alog("  " + line)
        except Exception as e:
            _alog("rebirth_master ERR: %r" % e)
        # после запуска — убрать флаг, чтобы не зациклиться
        try:
            os.remove(flag)
            _alog("flag %s removed" % ch)
        except Exception:
            pass
        return  # одно за раз


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--loop", type=int, default=0)
    ap.add_argument("--rebirth-monitor", action="store_true")
    a = ap.parse_args()
    if a.loop:
        while True:
            if a.rebirth_monitor:
                rebirth_monitor()
            else:
                run_once()
            time.sleep(a.loop)
    elif a.rebirth_monitor:
        rebirth_monitor()
    else:
        run_once()


if __name__ == "__main__":
    main()
