import sys, time
from playwright.sync_api import sync_playwright

port = int(sys.argv[1]) if len(sys.argv) > 1 else 9223

with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
    ctx = b.contexts[0]
    panel = None
    for pg in ctx.pages:
        if "sidepanel.html" in pg.url:
            panel = pg
            break
    if panel is None:
        print("no panel")
        sys.exit(2)
    print("panel:", panel.url[:70])
    r = panel.evaluate(
        "() => new Promise((res) => { chrome.storage.local.set({lastId: '', ledger: []}, () => res('cleared')); })")
    print("cleared:", r)
    time.sleep(0.5)
    got = panel.evaluate(
        "() => new Promise((res) => { chrome.storage.local.get(['lastId','ledger'], (d) => res(JSON.stringify({lastId: d.lastId, ledger_len: (d.ledger||[]).length}))); })")
    print("verify:", got)
    panel.reload()
    print("panel reloaded")
    time.sleep(2)
    print("done")