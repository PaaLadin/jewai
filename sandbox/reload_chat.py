"""Reload the LLM chat page via CDP. Fixes stuck inflight."""
import sys, time, argparse
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
ap.add_argument("--wait-sec", type=int, default=4)
args = ap.parse_args()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(args.port), timeout=30000)
    ctx = browser.contexts[0]
    chat = None
    for pg in ctx.pages:
        if "/a/chat/s/" in pg.url and "deepseek.com" in pg.url:
            chat = pg
            break
    if chat is None:
        print("no chat page on port " + str(args.port))
        sys.exit(2)
    print("reloading: " + chat.url)
    chat.reload(wait_until="domcontentloaded", timeout=30000)
    time.sleep(args.wait_sec)
    print("reloaded, url: " + chat.url)