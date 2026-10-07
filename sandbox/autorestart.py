"""autorestart.py — подъём упавшего агента (по ALERT от watchdog).

watchdog пишет ALERT.json при N фейлах. autorestart читает ALERT,
определяет порт и путь agent.py, поднимает заново (detached, без окна).

Карта порт->путь обновляется из живых процессов, кэшируется в
logs/svc/agent_paths.json (чтобы знать путь даже когда агент упал).

Usage:
  python sandbox/autorestart.py --alert ALERT_D.json [--once]
"""
import sys as _sys, io as _io
try:
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass
import sys, os, json, time, argparse, subprocess, urllib.request
from pathlib import Path

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SVC_DIR = ROOT / "logs" / "svc"
PATHS_CACHE = SVC_DIR / "agent_paths.json"
PY = _sys.executable

# порт -> путь agent.py (фолбэк)
# Портирование: пути к agent.py — от ROOT, не от C:\
FALLBACK = {
    "8766": str(ROOT / "extension" / "agent.py"),
    "8767": str(ROOT / "extension" / "agent.py"),
    "8768": str(ROOT / "extension" / "agent.py"),
    "8769": str(ROOT / "extension" / "agent.py"),
}


def _nw():
    if _sys.platform != "win32":
        return 0
    return subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP


def log(msg):
    line = "[" + time.strftime("%H:%M:%S") + "] " + msg
    print(line, flush=True)
    try:
        (ROOT / "logs" / "runtime" / "autorestart.log").open("a", encoding="utf-8").write(line + "\n")
    except Exception:
        pass


def scan_live_paths():
    """wmic: порт -> путь agent.py у живых процессов. Обновляет кэш."""
    cache = {}
    if PATHS_CACHE.exists():
        try:
            cache = json.loads(PATHS_CACHE.read_text(encoding="utf-8"))
        except Exception:
            cache = {}
    try:
        r = subprocess.run(["wmic", "process", "where", "name='python.exe'",
                            "get", "commandline"],
                           capture_output=True, text=True, timeout=15,
                           encoding="utf-8", errors="replace",
                           creationflags=(subprocess.CREATE_NO_WINDOW if _sys.platform=="win32" else 0))
        for line in (r.stdout or "").splitlines():
            line = line.strip()
            if "agent.py" not in line:
                continue
            parts = line.split()
            # последний токен — порт, предпоследний — путь agent.py
            if len(parts) >= 2 and parts[-1].isdigit():
                port = parts[-1]
                for p in parts:
                    if p.endswith("agent.py"):
                        cache[port] = p
    except Exception as e:
        log("scan err " + repr(e)[:80])
    try:
        PATHS_CACHE.parent.mkdir(parents=True, exist_ok=True)
        PATHS_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    except Exception:
        pass
    return cache


def port_from_url(url):
    if not url:
        return None
    try:
        return str(url).rstrip("/").split(":")[-1].split("/")[0]
    except Exception:
        return None


def is_alive(port):
    try:
        urllib.request.urlopen("http://127.0.0.1:%s/ping" % port, timeout=3)
        return True
    except Exception:
        return False


def restart(port, agent_path):
    """Поднять агент на порту. Возвращает pid или None."""
    log("restart %s <- %s" % (port, agent_path))
    try:
        p = subprocess.Popen([PY, agent_path, port],
                             cwd=str(ROOT), stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             creationflags=_nw())
        time.sleep(4)
        ok = is_alive(port)
        log("pid=%d alive=%s" % (p.pid, ok))
        return p.pid if ok else None
    except Exception as e:
        log("restart err " + repr(e)[:100])
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--alert", default=str(ROOT / "runtime" / "ALERT.json"))
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--interval", type=int, default=30)
    args = ap.parse_args()

    log("autorestart start, alerts=" + args.alert)
    while True:
        # сканируем все ALERT-файлы: ALERT_<CH>.json + ALERT.json
        alerts = sorted((ROOT / "runtime").glob("ALERT_*.json")) + [ROOT / "runtime" / "ALERT.json"]
        for alert in alerts:
            if not alert.exists():
                continue
            try:
                d = json.loads(alert.read_text(encoding="utf-8"))
                url = d.get("url", "")
                port = port_from_url(url)
                if port and not is_alive(port):
                    cache = scan_live_paths()
                    path = cache.get(port) or FALLBACK.get(port)
                    if path and os.path.exists(path):
                        pid = restart(port, path)
                        if pid:
                            try:
                                alert.unlink()
                                log("alert cleared after restart: " + alert.name)
                            except Exception:
                                pass
                    else:
                        log("нет пути для порта " + str(port))
                else:
                    if port and is_alive(port):
                        try:
                            alert.unlink()
                            log("agent alive, alert cleared: " + alert.name)
                        except Exception:
                            pass
            except Exception as e:
                log("alert parse err " + alert.name + " " + repr(e)[:60])
        if args.once:
            break
        time.sleep(args.interval)
    log("autorestart stop")


if __name__ == "__main__":
    main()