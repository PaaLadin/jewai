"""svc.py — управление персональными watchdog/recovery по каналам A/B/C/D.
Привязка портов: A=8766, B=8767, C=8768, D=8769.
Каналы: A=9222, B=9223, C=9224, D=9225 (CDP).
Команды:
  svc.py start --channel A --kind watchdog --interval 10 --threshold 3
  svc.py start --channel A --kind recovery --cooldown 300
  svc.py stop  --channel A --kind watchdog
  svc.py status --channel A
Пиды в logs/svc/."""
import sys, os, io, json, time, subprocess, argparse
from pathlib import Path

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass


def _nw_flags(detach=False):
    """Windows: без окна cmd."""
    if sys.platform != "win32":
        return 0
    f = subprocess.CREATE_NO_WINDOW
    if detach:
        f |= subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    return f

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SVC_DIR = ROOT / "logs" / "svc"
SVC_DIR.mkdir(parents=True, exist_ok=True)
LOG = ROOT / "svc.log"

# Порты: читаются из config.json, хардкод - fallback.
def _load_ports():
    agent = {"A": 8766, "B": 8767, "C": 8768, "D": 8769, "E": 8771, "F": 8772}
    cdp = {"A": 9222, "B": 9223, "C": 9224, "D": 9225, "E": 9226, "F": 9227}
    cfg_file = ROOT / "config.json"
    if not cfg_file.exists():
        return agent, cdp
    try:
        d = json.loads(cfg_file.read_text(encoding="utf-8"))
        ch = d.get("channels", {})
        for k, v in ch.items():
            if isinstance(v, dict):
                if "agent" in v:
                    agent[k] = int(v["agent"])
                if "cdp" in v:
                    cdp[k] = int(v["cdp"])
    except Exception:
        pass
    return agent, cdp

AGENT_PORT, CDP_PORT = _load_ports()


def log(msg):
    line = "[" + time.strftime("%H:%M:%S") + "] " + msg
    print(line, flush=True)
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def wd_state_file(ch):
    return SVC_DIR / ("watchdog_%s.json" % ch)


def write_wd_state(ch, **kw):
    """Записать состояние watchdog для канала (DCCA0022)."""
    p = wd_state_file(ch)
    cur = {}
    if p.exists():
        try:
            cur = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            cur = {}
    cur.update(kw)
    try:
        p.write_text(json.dumps(cur, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def rec_state_file(ch):
    return SVC_DIR / ("recovery_%s.json" % ch)


def write_rec_state(ch, **kw):
    # состояние recovery для канала (формат как watchdog_*.json)
    p = rec_state_file(ch)
    cur = {}
    if p.exists():
        try:
            cur = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            cur = {}
    cur.update(kw)
    try:
        p.write_text(json.dumps(cur, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def pidfile(ch, kind):
    return SVC_DIR / ("%s_%s.pid" % (kind, ch))


def is_running(pid):
    if sys.platform == "win32":
        try:
            r = subprocess.run(["tasklist", "/FI", "PID eq %d" % pid, "/FO", "CSV", "/NH"],
                               capture_output=True, text=True, timeout=10,
                               encoding="utf-8", errors="replace",
                               creationflags=_nw_flags())
            return str(pid) in (r.stdout or "")
        except Exception:
            return False
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def read_pid(ch, kind):
    pf = pidfile(ch, kind)
    if not pf.exists():
        return None
    try:
        d = json.loads(pf.read_text(encoding="utf-8"))
        if is_running(d["pid"]):
            return d
        pf.unlink()
        return None
    except Exception:
        return None


def spawn(args, ch, kind, meta):
    p = subprocess.Popen(args, cwd=str(ROOT / "sandbox"),
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL,
                         creationflags=_nw_flags(detach=True))
    meta["pid"] = p.pid
    meta["started"] = time.time()
    meta["channel"] = ch
    meta["kind"] = kind
    pidfile(ch, kind).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return p.pid


def start(ch, kind, interval, threshold, cooldown, check_dom=True, dom_stale=15):
    if kind == "watchdog":
        r = read_pid(ch, kind)
        if r:
            print(json.dumps({"ok": True, "already": True, "pid": r["pid"], "channel": ch, "kind": kind}))
            return 0
        agent = AGENT_PORT[ch]
        args = [str(Path(sys.executable).with_name("pythonw.exe")), str(ROOT / "sandbox" / "watchdog.py"),
                "--url", "http://127.0.0.1:%d/ping" % agent,
                "--interval", str(interval), "--threshold", str(threshold),
                "--log", str(ROOT / ("svc_watchdog_%s.log" % ch)),
                "--alert", str(ROOT / ("ALERT_%s.json" % ch))]
        if check_dom:
            args += ["--check-dom", "--cdp-port", str(CDP_PORT[ch]),
                     "--dom-stale-sec", str(dom_stale)]
        meta = {"interval": interval, "threshold": threshold, "agent": agent,
                "check_dom": bool(check_dom), "dom_stale": dom_stale}
        pid = spawn(args, ch, kind, meta)
        if kind == "watchdog":
            write_wd_state(ch, state="on", pid=pid, on_by=getattr(start, "_by", "unknown"),
                           on_at=time.time())
        log("watchdog %s started pid=%d interval=%d threshold=%d" % (ch, pid, interval, threshold))
        print(json.dumps({"ok": True, "pid": pid, "channel": ch, "kind": kind,
                          "params": meta}))
        return 0
    if kind == "recovery":
        r = read_pid(ch, kind)
        if r:
            print(json.dumps({"ok": True, "already": True, "pid": r["pid"], "channel": ch, "kind": kind}))
            return 0
        cdp = CDP_PORT[ch]
        args = [str(Path(sys.executable).with_name("pythonw.exe")), str(ROOT / "sandbox" / "recovery_loop.py"),
                "--port", str(cdp), "--cooldown", str(cooldown)]
        if not (ROOT / "sandbox" / "recovery_loop.py").exists():
            # нет цикла — разовый recover
            args = [str(Path(sys.executable).with_name("pythonw.exe")), str(ROOT / "sandbox" / "recover_chat.py"), str(cdp)]
        meta = {"cooldown": cooldown, "cdp": cdp}
        pid = spawn(args, ch, kind, meta)
        write_rec_state(ch, state="on", pid=pid, started=time.time(),
                        cdp=cdp, cooldown=cooldown,
                        on_by=getattr(start, "_by", "unknown"), on_at=time.time())
        log("recovery %s started pid=%d cooldown=%d" % (ch, pid, cooldown))
        print(json.dumps({"ok": True, "pid": pid, "channel": ch, "kind": kind, "params": meta}))
        return 0
    print(json.dumps({"ok": False, "error": "unknown kind " + kind}))
    return 2


def stop(ch, kind):
    r = read_pid(ch, kind)
    if not r:
        # Процесса нет (или pid-файл протух). Всё равно пишем state=off:
        # иначе стухший on остаётся в *_<CH>.json, и панель рисует
        # сервис живым. Дыра найдена C (11.10, recovery_C pid=9604).
        try:
            if kind == "watchdog":
                write_wd_state(ch, state="off", off_by=getattr(stop, "_by", "unknown"),
                               off_at=time.time(), reason="no_proc")
            elif kind == "recovery":
                write_rec_state(ch, state="off", pid=None,
                                off_by=getattr(stop, "_by", "unknown"),
                                off_at=time.time(), reason="no_proc")
        except Exception:
            pass
        print(json.dumps({"ok": True, "was_running": False, "channel": ch, "kind": kind}))
        return 0
    pid = r["pid"]
    try:
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                       capture_output=True, timeout=15,
                       creationflags=_nw_flags())
    except Exception as e:
        log("kill err: " + repr(e)[:120])
    try:
        pidfile(ch, kind).unlink()
    except Exception:
        pass
    if kind == "watchdog":
        write_wd_state(ch, state="off", off_by=getattr(stop, "_by", "unknown"),
                       off_at=time.time())
    elif kind == "recovery":
        write_rec_state(ch, state="off", pid=None,
                        off_by=getattr(stop, "_by", "unknown"), off_at=time.time())
    log("%s %s stopped pid=%d" % (kind, ch, pid))
    print(json.dumps({"ok": True, "stopped": pid, "channel": ch, "kind": kind}))
    return 0


def status(ch):
    out = {"channel": ch, "agent": AGENT_PORT[ch], "cdp": CDP_PORT[ch], "services": {}}
    for kind in ("watchdog", "recovery"):
        r = read_pid(ch, kind)
        if r:
            out["services"][kind] = {"on": True, "pid": r["pid"],
                                     "uptime": round(time.time() - r.get("started", time.time())),
                                     "params": {k: v for k, v in r.items()
                                                if k not in ("pid", "started", "channel", "kind")}}
        else:
            out["services"][kind] = {"on": False}
    print(json.dumps(out, ensure_ascii=False))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["start", "stop", "status"])
    ap.add_argument("--channel", required=True, choices=list(AGENT_PORT.keys()))
    ap.add_argument("--kind", choices=["watchdog", "recovery"])
    ap.add_argument("--interval", type=int, default=300)
    ap.add_argument("--threshold", type=int, default=3)
    ap.add_argument("--cooldown", type=int, default=300)
    ap.add_argument("--no-dom", action="store_true",
                    help="отключить проверку DOM-маркера (второе измерение)")
    ap.add_argument("--dom-stale-sec", type=int, default=15)
    ap.add_argument("--by", default="unknown",
                    help="кто включает/выключает (D/operator/C/4A)")
    a = ap.parse_args()
    start._by = a.by
    stop._by = a.by
    if a.cmd == "start":
        return start(a.channel, a.kind or "watchdog", a.interval, a.threshold,
                     a.cooldown, check_dom=not a.no_dom, dom_stale=a.dom_stale_sec)
    if a.cmd == "stop":
        return stop(a.channel, a.kind or "watchdog")
    return status(a.channel)


if __name__ == "__main__":
    sys.exit(main())