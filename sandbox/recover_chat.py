"""Recovery of a chat + panel pair (только свой канал).

Порядок:
1. reload panel (sidepanel.html) - только эта панель.
2. reload chat tab - re-inject content.js.

ВАЖНО: chrome.runtime.reload() УБРАН. Он глобальный и роняет все
sidepanel A/B/C/D. Инцидент: кнопка REC на мнемосхеме -> recovery ->
runtime.reload -> вылет панели. Фикс D+6B 2026-10-11.
"""
import sys, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
def reload_chat(b):
    ctx = b.contexts[0]
    for pg in ctx.pages:
        if "/a/chat/s/" in pg.url and "deepseek.com" in pg.url:
            print("  chat reload:", pg.url[:80])
            try:
                pg.reload(wait_until="domcontentloaded", timeout=30000)
                print("  chat reloaded")
            except Exception as e:
                print("  chat reload err:", repr(e)[:120])
            return
    print("  no chat tab")

print("=== recover_chat on port " + str(port) + " ===")
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
    ctx = b.contexts[0]

    panel = None
    for pg in ctx.pages:
        if "sidepanel.html" in pg.url:
            panel = pg
            break
    if panel is None:
        print("no panel target")
        sys.exit(2)

    # step 1: только своя панель (глобальный runtime.reload удалён).
    print("step 1: reload panel (local)")
    try:
        panel.reload()
        print("  panel reloaded")
    except Exception as e:
        print("  panel reload err:", repr(e)[:120])
    print("wait 3s")
    time.sleep(3)

    print("step 3: reload chat tab")
    reload_chat(b)
    print("wait 4s")
    time.sleep(4)

print("=== done ===")