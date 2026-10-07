"""Guard — timer that wakes helper if lead doesn't send 'done' in time.

Usage:
  python guard.py start --target 9222 --timeout 180 --label "reload ext" [--notify-port 9223]
  python guard.py done
  python guard.py status
  python guard.py cancel

Files:
  guard_signal.txt  — state: "armed <ts> target=... timeout=..." / "done <ts>"
  guard.log         — log
"""
import sys, os, json, time, subprocess, argparse
from pathlib import Path
from datetime import datetime

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SB = ROOT / "sandbox"
SIGNAL = ROOT / "guard_signal.txt"
LOG = ROOT / "guard.log"
PID_FILE = ROOT / "guard.pid"


def log(msg):
    line = "[" + datetime.now().isoformat(timespec="seconds") + "] " + msg
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
    print(line, flush=True)


def write_signal(text):
    try:
        SIGNAL.write_text(text, encoding="utf-8")
    except Exception:
        pass


def read_signal():
    if not SIGNAL.exists():
        return ""
    try:
        return SIGNAL.read_text(encoding="utf-8").strip()
    except Exception:
        return ""


def kick_helper(port, text):
    script = SB / "bridge_kick.py"
    if not script.exists():
        log("bridge_kick.py missing")
        return False
    try:
        r = subprocess.run(
            [sys.executable, str(script), "--port", str(port), "--text", text, "--wait-empty", "10"],
            capture_output=True, text=True, timeout=30,
            encoding="utf-8", errors="replace")
        log(f"kick {port} rc={r.returncode}")
        return r.returncode == 0
    except Exception as e:
        log(f"kick err: {repr(e)[:120]}")
        return False


def voice_alarm(reason):
    script = SB / "voice.py"
    if not script.exists():
        log("voice.py missing")
        return
    try:
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        subprocess.Popen([sys.executable, str(script), "alarm", reason],
                         creationflags=flags,
                         stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL)
    except Exception as e:
        log(f"voice err: {repr(e)[:120]}")


def run_daemon(target_port, timeout_sec, label, notify_port):
    """Running in background. Sleeps and checks signal."""
    my_pid = os.getpid()
    try:
        PID_FILE.write_text(str(my_pid), encoding="utf-8")
    except Exception:
        pass

    started = time.time()
    write_signal(f"armed {datetime.now().isoformat(timespec='seconds')} target={target_port} timeout={timeout_sec} label={label} pid={my_pid}")
    log(f"armed target={target_port} timeout={timeout_sec} label={label} notify={notify_port}")

    check_every = 5
    while time.time() - started < timeout_sec:
        sig = read_signal()
        if sig.startswith("done"):
            log("done signal received, exiting")
            try: PID_FILE.unlink()
            except Exception: pass
            return
        if sig.startswith("cancel"):
            log("cancel signal received, exiting")
            try: PID_FILE.unlink()
            except Exception: pass
            return
        time.sleep(check_every)

    # timeout expired — check one last time
    sig = read_signal()
    if sig.startswith("done") or sig.startswith("cancel"):
        log("late signal, exiting")
        try: PID_FILE.unlink()
        except Exception: pass
        return

    # ALERT
    log("TIMEOUT, sending alert")
    alert_text = (
        f"[GUARD-ALERT] target={target_port} timeout={timeout_sec} "
        f"label=\"{label}\" no-done-signal. "
        f"Выполни algorithms/mutual_rescue.md раздел RESCUE."
    )
    kick_helper(notify_port, alert_text)
    log("alert sent, exiting")
    try: PID_FILE.unlink()
    except Exception: pass


def cmd_start(args):
    # kill any previous guard daemon
    if PID_FILE.exists():
        try:
            old_pid = int(PID_FILE.read_text(encoding="utf-8").strip())
            os.kill(old_pid, 9)
        except Exception:
            pass
        try: PID_FILE.unlink()
        except Exception: pass

    flags = 0
    if sys.platform == "win32":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

    pythonexe = sys.executable
    pw = Path(pythonexe).parent / "pythonw.exe"
    if pw.exists():
        pythonexe = str(pw)

    proc = subprocess.Popen(
        [pythonexe, str(Path(__file__)),
         "--daemon",
         "--target", str(args.target),
         "--timeout", str(args.timeout),
         "--label", args.label,
         "--notify-port", str(args.notify_port)],
        creationflags=flags,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=str(SB))
    print(f"guard started pid={proc.pid} target={args.target} timeout={args.timeout} notify={args.notify_port}")


def cmd_done(_args):
    write_signal(f"done {datetime.now().isoformat(timespec='seconds')}")
    log("done signaled")
    print("done")


def cmd_cancel(_args):
    write_signal(f"cancel {datetime.now().isoformat(timespec='seconds')}")
    log("cancel signaled")
    print("cancel")


def cmd_status(_args):
    sig = read_signal()
    pid = ""
    if PID_FILE.exists():
        try:
            pid = PID_FILE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    print("signal:", sig or "(none)")
    print("pid:", pid or "(none)")
    if pid:
        try:
            alive = os.path.exists(f"/proc/{pid}") if os.name != "nt" else True
            print("alive: (windows check not implemented, assume true if pid set)")
        except Exception:
            pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="")
    ap.add_argument("--target", type=int, default=9222)
    ap.add_argument("--timeout", type=int, default=180)
    ap.add_argument("--label", default="critical op")
    ap.add_argument("--notify-port", type=int, default=9223)
    ap.add_argument("--daemon", action="store_true")
    args = ap.parse_args()

    if args.daemon:
        run_daemon(args.target, args.timeout, args.label, args.notify_port)
        return

    if args.daemon:
        return  # already handled above

    if args.cmd == "start":
        cmd_start(args)
    elif args.cmd == "done":
        cmd_done(args)
    elif args.cmd == "cancel":
        cmd_cancel(args)
    elif args.cmd == "status":
        cmd_status(args)
    else:
        print("usage: guard.py {start|done|cancel|status} [--target N --timeout N --label STR --notify-port N]")
        print("   or: guard.py --daemon --target N --timeout N --label STR --notify-port N")


if __name__ == "__main__":
    main()