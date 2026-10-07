"""recovery_loop.py — персональный recovery-сторож канала.
Раз в interval сек проверяет панель через read_panel_state; если content
мёртв (нет вывода / no-answer) — recover_chat. Cooldown между recover.
  python recovery_loop.py --port 9222 --cooldown 300 --interval 60
Stop-файл: logs/svc/recovery_<port>.stop
"""
import sys, io, time, subprocess, argparse
from pathlib import Path
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception: pass


def _nw_flags():
    """Windows: без окна cmd."""
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NO_WINDOW

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
LOG = ROOT / "recovery_loop.log"


def log(m):
    line = "[" + time.strftime("%H:%M:%S") + "] " + m
    print(line, flush=True)
    try:
        with LOG.open("a", encoding="utf-8") as f: f.write(line + "\n")
    except Exception: pass


def panel_alive(port):
    """read_panel_state -> есть ли текст панели."""
    try:
        r = subprocess.run([sys.executable, str(ROOT/"sandbox"/"read_panel_state.py"), str(port)],
                           capture_output=True, text=True, timeout=25,
                           encoding="utf-8", errors="replace",
                           creationflags=_nw_flags())
        out = (r.stdout or "").strip()
        return r.returncode == 0 and len(out) > 20
    except Exception:
        return False


def recover(port):
    try:
        r = subprocess.run([sys.executable, str(ROOT/"sandbox"/"recover_chat.py"), str(port)],
                           capture_output=True, text=True, timeout=90,
                           encoding="utf-8", errors="replace",
                           creationflags=_nw_flags())
        return r.returncode == 0
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, required=True)
    ap.add_argument("--cooldown", type=int, default=300)
    ap.add_argument("--interval", type=int, default=60)
    a = ap.parse_args()
    stop = ROOT / "logs" / "svc" / ("recovery_%d.stop" % a.port)
    log("recovery_loop start port=%d cooldown=%d interval=%d" % (a.port, a.cooldown, a.interval))
    last = 0
    while True:
        if stop.exists():
            log("stop file, exit"); return
        ok = panel_alive(a.port)
        if not ok:
            if time.time() - last >= a.cooldown:
                log("port %d panel DEAD -> recover" % a.port)
                recover(a.port)
                last = time.time()
            else:
                log("port %d dead, cooldown %ds" % (a.port, int(a.cooldown-(time.time()-last))))
        else:
            log("port %d OK" % a.port)
        time.sleep(a.interval)


if __name__ == "__main__":
    main()