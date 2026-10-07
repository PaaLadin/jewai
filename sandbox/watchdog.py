"""Watchdog для agent.py. Пишет лог и, при N подряд фейлах, ALERT.json."""
import sys, time, json, argparse, urllib.request
from pathlib import Path
from datetime import datetime


def _nw_flags():
    """Windows: без окна cmd."""
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NO_WINDOW

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
DEFAULT_URL = "http://127.0.0.1:8766/ping"
DEFAULT_LOG = ROOT / "watchdog.log"
DEFAULT_ALERT = ROOT / "ALERT.json"
TOKEN_FILE = ROOT / ".agent_token"


def now():
    return datetime.now().isoformat(timespec="seconds")


def log_line(path, text):
    line = f"[{now()}] {text}"
    print(line, flush=True)
    try:
        with path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def ping(url, token, timeout=3):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={"X-Token": token})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", "replace")
        return True, round(time.time() - t0, 3), body
    except Exception as e:
        return False, round(time.time() - t0, 3), repr(e)


def write_alert(path, payload):
    try:
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False),
                        encoding="utf-8")
    except Exception:
        pass


def clear_alert(path, log_path=None):
    try:
        if path.exists():
            path.unlink()
            if log_path:
                log_line(log_path, f"alert cleared: {path.name}")
    except Exception:
        pass


def dom_check(cdp_port, stale_sec):
    """Второе измерение: свежесть dsbHeartbeat. Возвращает (ok, info)."""
    if not cdp_port:
        return None, "no cdp port"
    import subprocess as _sp
    try:
        r = _sp.run([sys.executable, str(ROOT / "sandbox" / "read_heartbeat.py"),
                     str(cdp_port), "--stale-sec", str(stale_sec)],
                    capture_output=True, text=True, timeout=25,
                    encoding="utf-8", errors="replace",
                    creationflags=_nw_flags())
        out = (r.stdout or "").strip()
        stale = '"stale": true' in out or '"stale": True' in out
        return (not stale), out[:160]
    except Exception as e:
        return None, "dom err " + str(e)[:80]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--interval", type=int, default=10)
    ap.add_argument("--threshold", type=int, default=3)
    ap.add_argument("--log", default=str(DEFAULT_LOG))
    ap.add_argument("--alert", default=str(DEFAULT_ALERT))
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--check-dom", action="store_true",
                    help="второе измерение: свежесть DOM-маркера dsbHeartbeat")
    ap.add_argument("--cdp-port", type=int, default=0,
                    help="CDP-порт канала для --check-dom")
    ap.add_argument("--dom-stale-sec", type=int, default=15)
    args = ap.parse_args()

    log_path = Path(args.log)
    alert_path = Path(args.alert)
    token = TOKEN_FILE.read_text(encoding="utf-8").strip() if TOKEN_FILE.exists() else ""

    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_line(log_path, "watchdog start url=" + args.url +
             " threshold=" + str(args.threshold) + " interval=" + str(args.interval) + "s")

    # если alert от прошлого прогона уже существует — стартуем с порога
    prior_fails = 0
    if alert_path.exists():
        try:
            d = json.loads(alert_path.read_text(encoding="utf-8"))
            prior_fails = int(d.get("consecutive_fails", args.threshold))
        except Exception:
            prior_fails = args.threshold
        log_line(log_path, f"prior alert found, prior_fails={prior_fails}")

    fails = prior_fails
    cycles = 0
    max_cycles = 1 if args.once else 10**9

    while cycles < max_cycles:
        cycles += 1
        ok, el, info = ping(args.url, token)
        if ok:
            # успех — безусловно снимаем alert, если он есть
            if fails >= args.threshold:
                log_line(log_path, f"RECOVERED after {fails} fails ({el}s)")
            else:
                log_line(log_path, f"OK ({el}s) {info[:80]}")
            clear_alert(alert_path, log_path)
            fails = 0
        else:
            fails += 1
            log_line(log_path, f"FAIL#{fails} ({el}s) {info[:160]}")
            if fails >= args.threshold:
                payload = {
                    "when": now(),
                    "url": args.url,
                    "consecutive_fails": fails,
                    "last_error": info,
                    "hint": "agent.py упал или завис. Проверь окно PowerShell.",
                }
                write_alert(alert_path, payload)
                log_line(log_path, f"ALERT written: {alert_path}")

        if args.check_dom:
            dok, dinfo = dom_check(args.cdp_port, args.dom_stale_sec)
            if dok is False:
                log_line(log_path, "PANEL-STUCK " + dinfo)
            elif dok is None:
                log_line(log_path, "PANEL-UNKNOWN " + dinfo)
            else:
                log_line(log_path, "panel OK " + dinfo)

        if args.once:
            break
        time.sleep(args.interval)

    log_line(log_path, f"watchdog stop cycles={cycles} fails={fails}")
    sys.exit(0 if fails < args.threshold else 1)


if __name__ == "__main__":
    main()