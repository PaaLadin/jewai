"""export_share.py - экспорт публичной share-страницы DeepSeek в текст.

Метод: Playwright -> CDP Chrome-B -> new_page -> share-URL -> innerText.
Работает БЕЗ редиректа на личный чат, share-страница отдаётся публично.

Usage:
  python sandbox/export_share.py --url URL --out PATH [--port 9223] [--wait 12]
"""
import sys as _s, io as _i
try:
    _s.stdout = _i.TextIOWrapper(_s.stdout.buffer, encoding='utf-8', errors='replace')
    _s.stderr = _i.TextIOWrapper(_s.stderr.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass
import sys, time, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--port", type=int, default=9223)
    ap.add_argument("--wait", type=float, default=12.0)
    a = ap.parse_args()

    p = sync_playwright().start()
    b = p.chromium.connect_over_cdp(f"http://127.0.0.1:{a.port}", timeout=15000)
    ctx = b.contexts[0] if b.contexts else b.new_context()
    pg = ctx.new_page()
    try:
        pg.goto(a.url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(a.wait)
        # лёгкая прокрутка вниз-вверх для триггера отрисовки
        pg.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1.5)
        pg.evaluate("() => window.scrollTo(0, 0)")
        time.sleep(1.0)
        url = pg.url
        title = pg.title()
        txt = pg.evaluate("() => document.body ? document.body.innerText : ''") or ""
    finally:
        try: pg.close()
        except Exception: pass
        try: b.close()
        except Exception: pass
        p.stop()

    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    header = (f"# source: {a.url}\n"
              f"# final_url: {url}\n"
              f"# title: {title}\n"
              f"# exported: {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
              f"# bytes: {len(txt)}\n\n")
    out.write_text(header + txt, encoding="utf-8")
    print(f"OK {len(txt)} bytes -> {out}")


if __name__ == "__main__":
    main()