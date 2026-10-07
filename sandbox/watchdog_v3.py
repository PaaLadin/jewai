"""Watchdog v3 — silent recovery.

Every 60s:
  1. Ping agents 8766/8767.
  2. Check content via CDP on 9222/9223.
  3. If agent dead OR content no-answer for >2 min -> recover_chat on that port.
  4. Silent (no voice) unless 3 consecutive recovery attempts fail.

Log: watchdog_v3.log
Heartbeat: watchdog_v3.heartbeat
Stop: watchdog_v3.stop
"""
import sys, time, json, subprocess, socket, urllib.request
from pathlib import Path
from datetime import datetime

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
LOG = ROOT / "watchdog_v3.log"
HB = ROOT / "watchdog_v3.heartbeat"
STOP = ROOT / "watchdog_v3.stop"
TOKEN_FILE = ROOT / ".agent_token"

CHECK_INTERVAL = 60
STALE_THRESHOLD = 120          # 2 min — после этого считаем мёртвым
RECOVER_COOLDOWN = 300         # 5 min — не чаще одного recovery на порт
VOICE_AFTER_FAILS = 3          # голос после 3 неудачных попыток


def log(msg):
    line = "[" + datetime.now().isoformat(timespec="seconds") + "] " + msg
    print(line, flush=True)
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def touch_hb():
    try:
        HB.write_text(datetime.now().isoformat(timespec="seconds"), encoding="utf-8")
    except Exception:
        pass


def agent_alive(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/ping", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def check_content_cdp(port):
    """Read DOM heartbeat set by content.js via CDP."""
    import tempfile, textwrap
    code = textwrap.dedent(f"""
        import sys, time
        from playwright.sync_api import sync_playwright
        try:
            with sync_playwright() as p:
                b = p.chromium.connect_over_cdp("http://127.0.0.1:{port}", timeout=8000)
                ctx = b.contexts[0]
                for pg in ctx.pages:
                    if "/a/chat/s/" in pg.url and "deepseek.com" in pg.url:
                        try:
                            ts = pg.evaluate("() => document.documentElement.dataset.dsbHeartbeat || ''")
                            if ts:
                                age = time.time() - (int(ts) / 1000.0)
                                if age < 10:
                                    print("OK:" + str(round(age, 1)))
                                    sys.exit(0)
                                else:
                                    print("STALE:" + str(round(age, 1)))
                                    sys.exit(1)
                        except Exception:
                            pass
                print("NO_CONTENT")
                sys.exit(1)
        except Exception as e:
            print("CDP_ERR:" + repr(e)[:100])
            sys.exit(2)
    """)
    tf = ROOT / "sandbox" / "_wd_content_check.py"
    tf.write_text(code, encoding="utf-8")
    try:
        r = subprocess.run([sys.executable, str(tf)], capture_output=True, text=True,
                           timeout=20, encoding="utf-8", errors="replace")
        out = (r.stdout or "").strip()
        return r.returncode == 0 and out.startswith("OK:")
    except Exception:
        return False


def recover_chat(port):
    script = ROOT / "sandbox" / "recover_chat.py"
    try:
        r = subprocess.run([sys.executable, str(script), str(port)],
                           capture_output=True, text=True, timeout=60,
                           encoding="utf-8", errors="replace")
        ok = r.returncode == 0
        log(f"recover_chat({port}) rc={r.returncode}")
        return ok
    except Exception as e:
        log(f"recover err {port}: {repr(e)[:120]}")
        return False


def voice_alarm(reason):
    script = ROOT / "sandbox" / "voice.py"
    try:
        subprocess.run([sys.executable, str(script), "alarm", reason],
                       capture_output=True, text=True, timeout=30,
                       encoding="utf-8", errors="replace",
                       creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
    except Exception:
        pass


def main():
    if not TOKEN_FILE.exists():
        log("no token file, exiting")
        return
    log("=== watchdog_v3 start ===")

    last_recover = {9222: 0, 9223: 0}
    fail_count = {9222: 0, 9223: 0}
    last_alarm = 0

    while True:
        if STOP.exists():
            log("stop file found, exiting")
            return
        touch_hb()

        now = time.time()

        for port, agent_port in ((9222, 8766), (9223, 8767)):
            a_ok = agent_alive(agent_port)
            c_ok = check_content_cdp(port)

            status = f"port {port}: agent={'OK' if a_ok else 'DEAD'} content={'OK' if c_ok else 'DEAD'}"
            log(status)

            if a_ok and c_ok:
                fail_count[port] = 0
                continue

            # проблемный порт
            since = now - last_recover[port]
            if since < RECOVER_COOLDOWN:
                log(f"port {port}: cooldown {int(since)}s")
                continue

            log(f"port {port}: recovering (agent={a_ok} content={c_ok})")
            ok = recover_chat(port)
            last_recover[port] = now

            if not ok:
                fail_count[port] += 1
                if fail_count[port] >= VOICE_AFTER_FAILS and now - last_alarm > 900:
                    voice_alarm(f"Порт {port} не отвечает после трёх попыток восстановления")
                    last_alarm = now
            else:
                time.sleep(5)
                if agent_alive(agent_port) and check_content_cdp(port):
                    fail_count[port] = 0
                    log(f"port {port}: recovered")
                else:
                    fail_count[port] += 1

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()