"""guard.py - independent system guard. Heals: server 8770, autorestart,
rebirth_monitor, svc watchdogs. Run via Task Scheduler: guard.py --once (every 5 min).
"""
import argparse, json, os, socket, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOGDIR = ROOT / "logs" / "runtime"
LOGFILE = LOGDIR / "guard.log"
STATE = ROOT / "runtime" / "lp_spawned.json"
PYW = str(Path(sys.executable).with_name("pythonw.exe"))
PY = sys.executable
FLAGS = 0x00000008 | 0x00000200 if sys.platform == "win32" else 0


def log(msg):
    line = "[%s] %s" % (time.strftime("%Y-%m-%d %H:%M:%S"), msg)
    try:
        LOGDIR.mkdir(parents=True, exist_ok=True)
        with open(LOGFILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
    print(line, flush=True)


def spawn(args):
    try:
        p = subprocess.Popen(args, cwd=str(ROOT), stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             creationflags=FLAGS)
        return p.pid
    except Exception as e:
        log("spawn ERR %r: %r" % (args, e))
        return None


def port_alive(port):
    try:
        s = socket.create_connection(("127.0.0.1", int(port)), timeout=2)
        s.close()
        return True
    except Exception:
        return False


def pid_alive(pid):
    if not pid:
        return False
    try:
        import ctypes
        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x1000, False, int(pid))
        if not h:
            return False
        try:
            code = ctypes.c_ulong()
            ok = k.GetExitCodeProcess(h, ctypes.byref(code))
            return bool(ok) and code.value == 259
        finally:
            k.CloseHandle(h)
    except Exception:
        return False


def wmic_find(marker):
    out = []
    try:
        r = subprocess.run(["wmic", "process", "where",
                            "name='python.exe' or name='pythonw.exe'",
                            "get", "ProcessId,CommandLine", "/format:csv"],
                           capture_output=True, text=True, timeout=20)
        for line in (r.stdout or "").splitlines():
            if marker not in line:
                continue
            parts = line.strip().split(",")
            if parts and parts[-1].strip().isdigit():
                out.append(int(parts[-1].strip()))
    except Exception as e:
        log("wmic ERR %r" % (e,))
    return out


def _state_load():
    try:
        return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}
    except Exception:
        return {}


def _state_save(st):
    try:
        STATE.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def check_server():
    if port_alive(8770):
        return None
    log("SERVER 8770 DEAD -> restart")
    pid = spawn([PYW, str(ROOT / "sandbox" / "council_chat" / "server.py")])
    if pid:
        time.sleep(3)
        if port_alive(8770):
            log("SERVER 8770 restarted pid=%d" % pid)
            return pid
        log("SERVER 8770 restart FAILED")
    return None


def check_autorestart():
    if wmic_find("autorestart.py"):
        return None
    log("AUTORESTART DEAD -> restart")
    pid = spawn([PYW, str(ROOT / "sandbox" / "autorestart.py")])
    if pid:
        log("AUTORESTART restarted pid=%d" % pid)
    return pid


def check_rebirth():
    found = wmic_find("la_rebirth_monitor")
    if found:
        st = _state_load()
        if st.get("rebirth") != found[0]:
            st["rebirth"] = found[0]
            _state_save(st)
        return None
    log("REBIRTH_MONITOR DEAD -> restart")
    pid = spawn([PYW, str(ROOT / "sandbox" / "la_rebirth_monitor.py"),
                 "--loop", "1200", "--rebirth-monitor"])
    if pid:
        st = _state_load()
        st["rebirth"] = pid
        _state_save(st)
        log("REBIRTH_MONITOR restarted pid=%d" % pid)
    return pid


def check_la():
    if port_alive(8090):
        return None
    log("LA orchestrator 8090 DEAD -> restart")
    srv = ROOT / "projects" / "local_ai" / "server.py"
    if not srv.exists():
        log("LA server.py MISSING")
        return None
    pid = spawn([PYW, str(srv)])
    if pid:
        time.sleep(4)
        if port_alive(8090):
            log("LA 8090 restarted pid=%d" % pid)
            return pid
        log("LA 8090 restart FAILED")
    return None


def check_watchdogs():
    svcdir = ROOT / "logs" / "svc"
    if not svcdir.exists():
        return []
    healed = []
    for jf in svcdir.glob("watchdog_*.json"):
        ch = jf.stem.replace("watchdog_", "")
        try:
            st = json.loads(jf.read_text(encoding="utf-8"))
        except Exception:
            continue
        if st.get("state") != "on":
            continue
        if pid_alive(st.get("pid")):
            continue
        log("WATCHDOG %s DEAD (state=on) -> svc start" % ch)
        try:
            r = subprocess.run([PY, str(ROOT / "sandbox" / "svc.py"),
                                "start", "--channel", ch, "--kind", "watchdog",
                                "--interval", "300", "--threshold", "3"],
                               capture_output=True, text=True, timeout=30, cwd=str(ROOT))
            if r.returncode == 0:
                healed.append(ch)
                log("WATCHDOG %s healed" % ch)
        except Exception as e:
            log("WATCHDOG %s heal ERR %r" % (ch, e))
    return healed


def once():
    check_server()
    check_autorestart()
    check_rebirth()
    check_la()
    check_watchdogs()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--loop", type=int, default=0)
    a = ap.parse_args()
    if a.loop:
        log("guard loop start interval=%d" % a.loop)
        while True:
            try:
                once()
            except Exception as e:
                log("loop ERR %r" % e)
            time.sleep(a.loop)
    else:
        once()


if __name__ == "__main__":
    main()