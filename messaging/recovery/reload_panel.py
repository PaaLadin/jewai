import sys, time
from playwright.sync_api import sync_playwright

port = int(sys.argv[1]) if len(sys.argv) > 1 else 9223

with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
    ctx = b.contexts[0]
    n = 0
    for pg in ctx.pages:
        if "sidepanel.html" in pg.url:
            print("reloading panel:", pg.url[:80])
            try:
                pg.reload()
                n += 1
            except Exception as e:
                print("reload err:", repr(e)[:120])
    print("reloaded panels:", n)
    time.sleep(2)