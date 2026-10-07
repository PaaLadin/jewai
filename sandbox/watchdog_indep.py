"""Independent watchdog. Does NOT depend on agents, panels, or chat.
Every 10 min: check activity logs. If stale -> poll via CDP -> reload ext -> F5 chat.
"""
import sys, time, json, subprocess, argparse
from pathlib import Path
from datetime import datetime


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
WD_LOG = ROOT / "watchdog_indep.log"
WD_HEARTBEAT = ROOT / "watchdog_indep.heartbeat"

AGENT_LOG = ROOT / "agent.log"
LEAD_HB_LOG = ROOT / "lead_heartbeat.log"
ASSIST_LOG = ROOT / "assistant" / "log.md"
ASSIST_OUT = ROOT / "assistant" / "outbox.json"

BRIDGE_KICK = ROOT / "sandbox" / "bridge_kick.py"
RELOAD_EXT = ROOT / "sandbox" / "reload_extension.py"
RELOAD_CHAT = ROOT / "sandbox" / "reload_chat.py"
RESTART_A = ROOT / "sandbox" / "restart_agent_a.py"

ap = argparse.ArgumentParser()
ap.add_argument("--check-sec", type=int, default=600)
ap.add_argument("--stale-sec", type=int, default=600)
ap.add_argument("--poll-wait", type=int, default=180)
ap.add_argument("--reload-wait", type=int, default=120)
ap.add_argument("--f5-wait", type=int, default=180)
ap.add_argument("--cooldown", type=int, default=900)
ap.add_argument("--once", action="store_true")
args = ap.parse_args()


def log(msg):
    line = "[" + datetime.now().isoformat(timespec="seconds") + "] " + msg
    print(line, flush=True)
    try:
        with WD_LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def heartbeat():
    try:
        WD_HEARTBEAT.write_text(datetime.now().isoformat(timespec="seconds"), encoding="utf-8")
    except Exception:
        pass


def activity_fresh():
    now = time.time()
    for p in (AGENT_LOG, LEAD_HB_LOG, ASSIST_LOG, ASSIST_OUT):
        if p.exists():
            age = now - p.stat().st_mtime
            if age < args.stale_sec:
                return True, p.name, int(age)
    return False, None, None


def run(args_list, timeout=90):
    try:
        r = subprocess.run(args_list, capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8", errors="replace",
                           creationflags=_nw_flags())
        return r.returncode, (r.stdout or "")[:400], (r.stderr or "")[:200]
    except Exception as e:
        return -1, "", repr(e)[:200]


def do_poll():
    log("STAGE1 poll via CDP kick to chat A")
    rc, out, err = run([sys.executable, str(BRIDGE_KICK),
                        "--port", "9222",
                        "--text", "[watchdog-indep] are you alive? touch activity file or respond.",
                        "--wait-empty", "10"])
    log("poll rc=" + str(rc) + " out=" + out[:120])
    return rc == 0


def do_reload_ext(port):
    log("STAGE2 reload extension on port " + str(port))
    rc, out, err = run([sys.executable, str(RELOAD_EXT), "--port", str(port)])
    log("reload_ext rc=" + str(rc) + " out=" + out[:160])
    return rc == 0


def do_f5(port):
    log("STAGE3 F5 chat on port " + str(port))
    rc, out, err = run([sys.executable, str(RELOAD_CHAT), "--port", str(port)])
    log("f5 rc=" + str(rc) + " out=" + out[:160])
    return rc == 0


def do_restart_agent():
    log("STAGE4 restart agent A")
    rc, out, err = run([sys.executable, str(RESTART_A)], timeout=60)
    log("restart rc=" + str(rc) + " out=" + out[:200])
    return rc == 0


def sleep_with_heartbeat(sec):
    """Sleep, updating heartbeat every 30s so we can see we are alive."""
    step = 30
    left = sec
    while left > 0:
        heartbeat()
        s = min(step, left)
        time.sleep(s)
        left -= s


def cycle():
    heartbeat()
    ok, src, age = activity_fresh()
    if ok:
        log("OK fresh via " + str(src) + " age=" + str(age) + "s")
        return "fresh"

    log("STALE: no activity in " + str(args.stale_sec) + "s")
    do_poll()

    sleep_with_heartbeat(args.poll_wait)
    ok, src, age = activity_fresh()
    if ok:
        log("recovered after poll via " + str(src) + " age=" + str(age) + "s")
        return "recovered-after-poll"

    do_reload_ext(9222)
    do_reload_ext(9223)

    sleep_with_heartbeat(args.reload_wait)
    ok, src, age = activity_fresh()
    if ok:
        log("recovered after reload via " + str(src) + " age=" + str(age) + "s")
        return "recovered-after-reload"

    do_f5(9222)
    do_f5(9223)

    sleep_with_heartbeat(args.f5_wait)
    ok, src, age = activity_fresh()
    if ok:
        log("recovered after F5 via " + str(src) + " age=" + str(age) + "s")
        return "recovered-after-f5"

    do_restart_agent()

    sleep_with_heartbeat(60)
    ok, src, age = activity_fresh()
    if ok:
        log("recovered after agent restart via " + str(src))
        return "recovered-after-restart"

    log("ALL STAGES FAILED. Sleeping 15 min before retry.")
    return "failed"


def main():
    log("=== watchdog_indep start ===")
    log("check=" + str(args.check_sec) + "s stale=" + str(args.stale_sec) + "s cooldown=" + str(args.cooldown) + "s")
    cycles = 0
    max_cycles = 1 if args.once else 10**9
    while cycles < max_cycles:
        cycles += 1
        try:
            r = cycle()
            log("cycle " + str(cycles) + " result: " + r)
        except Exception as e:
            log("cycle error: " + repr(e)[:200])
        if args.once:
            break
        sleep_with_heartbeat(args.check_sec)
    log("=== watchdog_indep stop ===")


if __name__ == "__main__":
    main()