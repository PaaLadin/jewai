"""read_heartbeat.py - свежесть DOM-маркера dsbHeartbeat на чате.

content.js v2.2.1 ставит document.documentElement.dataset.dsbHeartbeat
каждые 3с. Этот скрипт читает его через CDP и печатает возраст.
Для svc.watchdog (второе измерение: жива ли панель).

Usage:
  python sandbox/read_heartbeat.py <cdp_port>
  python sandbox/read_heartbeat.py 9223
"""
import sys, io, time, argparse
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

from playwright.sync_api import sync_playwright


def find_chat(ctx):
    for pg in ctx.pages:
        try:
            if "deepseek.com" in (pg.url or ""):
                return pg
        except Exception:
            continue
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("port", type=int)
    ap.add_argument("--stale-sec", type=int, default=15)
    a = ap.parse_args()

    p = sync_playwright().start()
    out = {"port": a.port, "ok": False, "ts": None, "age": None, "stale": None}
    try:
        b = p.chromium.connect_over_cdp("http://127.0.0.1:%d" % a.port, timeout=10000)
    except Exception as e:
        out["error"] = "cdp: " + str(e)[:120]
        print(out)
        p.stop()
        return 2
    try:
        ctx = b.contexts[0] if b.contexts else b.new_context()
        pg = find_chat(ctx)
        if pg is None:
            out["error"] = "no chat page"
            print(out)
            return 3
        v = pg.evaluate("() => document.documentElement.dataset.dsbHeartbeat || ''")
        if not v:
            out["error"] = "no marker"
            out["stale"] = True
            print(out)
            return 1
        try:
            ts_ms = int(v)
        except Exception:
            out["error"] = "bad marker: " + v[:32]
            out["stale"] = True
            print(out)
            return 1
        age = time.time() - ts_ms / 1000.0
        out.update(ok=True, ts=ts_ms, age=round(age, 2), stale=age > a.stale_sec)
        print(out)
        return 0 if not out["stale"] else 1
    finally:
        try: b.close()
        except Exception: pass
        p.stop()


if __name__ == "__main__":
    sys.exit(main())