import sys as _sys, io as _io
try:
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding='utf-8', errors='replace')
    _sys.stderr = _io.TextIOWrapper(_sys.stderr.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass
import sys, time
from playwright.sync_api import sync_playwright

port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222

with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
    ctx = b.contexts[0]
    for pg in ctx.pages:
        if "sidepanel.html" in pg.url:
            txt = pg.evaluate("() => document.body ? document.body.innerText : ''")
            print(txt[:3000])
            break