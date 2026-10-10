"""Безопасный reload вкладок чата A/B/C (9222/9223/9224).
Только pg.reload() — F5 страницы. НЕ chrome.runtime.reload.
content.js переинжектится сам. НЕ открывает новых вкладок.
"""
import sys, time
from playwright.sync_api import sync_playwright

PORTS = (9222, 9223, 9224)

def reload_chat(port):
    print(f"--- port {port} ---")
    try:
        with sync_playwright() as p:
            b = p.chromium.connect_over_cdp(f"http://127.0.0.1:{port}", timeout=30000)
            ctx = b.contexts[0]
            chat = None
            for pg in ctx.pages:
                u = pg.url or ""
                if "/a/chat/s/" in u and "deepseek.com" in u:
                    chat = pg
                    break
            if chat is None:
                print(f"  no chat page on {port}")
                return
            url = chat.url
            chat.reload(wait_until="domcontentloaded", timeout=45000)
            print(f"  reloaded: {url[:90]}")
    except Exception as e:
        print(f"  err: {repr(e)[:140]}")

for port in PORTS:
    reload_chat(port)
    time.sleep(3)
print("done")