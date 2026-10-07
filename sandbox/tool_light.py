"""tool_light.py - лёгкий часовой обходчик зомби-сервисов.

Раз в час смотрит: живы ли персональные watchdog/recovery процессы,
и есть ли под них активная задача. Если процесс висит без задачи
> idle_min минут - гасит его и пишет в лог. Каналы не дёргает.

Usage:
  python sandbox/tool_light.py --once
  python sandbox/tool_light.py --interval 3600 --idle-min 30
"""
import sys, io, os, json, time, argparse, subprocess
from pathlib import Path

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SVC_DIR = ROOT / "logs" / "svc"
LOG = ROOT / "tool_light.log"
CHANNELS = ["A", "B", "C", "D"]
KINDS = ["watchdog", "recovery"]

# каналы, у которых сейчас есть активная задача (по TODO/outbox)
# простая эвристика: если TODO канала менялся < idle_min минут - считаем активным
def task_active(ch, idle_sec):
    todo = ROOT / "logs" / ch / "TODO.md"
    if not todo.exists():
        return False
    try:
        return (time.time() - todo.stat().st_mtime) < idle_sec
    except Exception:
        return False


def log(msg):
    line = "[" + time.strftime("%Y-%m-%d %H:%M:%S") + "] " + msg
    print(line, flush=True)
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def proc_alive(pid):
    try:
        r = subprocess.run(["tasklist", "/FI", "PID eq %d" % pid, "/FO", "CSV", "/NH"],
                           capture_output=True, text=True, timeout=10,
                           encoding="utf-8", errors="replace")
        return str(pid) in (r.stdout or "")
    except Exception:
        return False


def read_pid(ch, kind):
    pf = SVC_DIR / ("%s_%s.pid" % (kind, ch))
    if not pf.exists():
        return None, None
    try:
        d = json.loads(pf.read_text(encoding="utf-8"))
        return d, pf
    except Exception:
        return None, pf


def kill(pid):
    try:
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                       capture_output=True, timeout=15)
        return True
    except Exception:
        return False


def sweep(idle_min):
    idle_sec = idle_min * 60
    killed = []
    for ch in CHANNELS:
        active = task_active(ch, idle_sec)
        for kind in KINDS:
            d, pf = read_pid(ch, kind)
            if not d:
                continue
            pid = d.get("pid")
            if not pid or not proc_alive(pid):
                # зомби-запись без процесса
                if pf:
                    try: pf.unlink()
                    except Exception: pass
                log("%s/%s pid file stale, removed" % (ch, kind))
                continue
            started = d.get("started", 0)
            age_min = (time.time() - started) / 60.0 if started else 0
            if not active and age_min > idle_min:
                if kill(pid):
                    try: pf.unlink()
                    except Exception: pass
                    killed.append((ch, kind, pid, round(age_min)))
                    log("%s/%s pid=%d age=%.0fmin NO TASK -> killed" % (ch, kind, pid, age_min))
            else:
                log("%s/%s pid=%d age=%.0fmin active=%s -> keep" % (ch, kind, pid, age_min, active))
    return killed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--interval", type=int, default=3600)
    ap.add_argument("--idle-min", type=int, default=30)
    a = ap.parse_args()
    log("tool_light start interval=%ds idle-min=%d" % (a.interval, a.idle_min))
    while True:
        k = sweep(a.idle_min)
        log("sweep done, killed=%d" % len(k))
        if a.once:
            return 0
        time.sleep(a.interval)


if __name__ == "__main__":
    sys.exit(main())