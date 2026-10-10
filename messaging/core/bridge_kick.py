"""Send a message into a chat page via CDP. Bidirectional kick tool."""
import sys, argparse, time
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True, help="9222=A, 9223=B")
ap.add_argument("--text", required=True)
ap.add_argument("--prefix", default="")
ap.add_argument("--dry", action="store_true")
ap.add_argument("--wait-empty", type=int, default=0, metavar="N", help="wait up to N sec for textarea to become empty")
args = ap.parse_args()

msg = (args.prefix + " " + args.text).strip()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(args.port), timeout=30000)
    ctx = browser.contexts[0]
    chat = None
    for pg in ctx.pages:
        u = pg.url
        if "/a/chat/s/" in u and "deepseek.com" in u:
            chat = pg
            break
    if chat is None:
        print("no chat page on port " + str(args.port))
        sys.exit(2)
    ta = chat.locator("textarea").first
    if ta.count() == 0:
        print("no textarea")
        sys.exit(3)
    cur = ta.input_value()
    busy = bool(cur.strip())
    if args.wait_empty > 0 and busy:
        print("wait-empty: textarea busy, waiting up to " + str(args.wait_empty) + "s")
        deadline = time.time() + args.wait_empty
        while time.time() < deadline:
            time.sleep(1.0)
            cur = ta.input_value()
            if not cur.strip():
                busy = False
                print("wait-empty: textarea cleared")
                break
        else:
            print("wait-empty: timeout, textarea still busy")
    print("textarea current: " + repr(cur[:80]))
    if args.dry:
        print("DRY: would send: " + msg)
        print("DRY: textarea busy: " + str(bool(cur.strip())))
        sys.exit(0)
    # Жёсткий барьер: непустая textarea = отказ. Обхода нет.
    if cur.strip():
        print("REFUSED: textarea busy. Draft preserved.")
        print("         use --wait-empty N, or write to council thread.")
        sys.exit(4)
    ta.click()
    ta.fill("")
    time.sleep(0.1)
    ta.fill(msg)
    time.sleep(0.8)
    # three Enter events (DeepSeek needs all three)
    ta.press("Enter")
    time.sleep(0.1)
    for ev in ("keydown", "keypress", "keyup"):
        ta.evaluate(
            "(el, evName) => { el.dispatchEvent(new KeyboardEvent(evName, "
            "{key:'Enter', code:'Enter', keyCode:13, which:13, "
            "bubbles:true, cancelable:true})); }",
            ev)
    time.sleep(0.5)
    time.sleep(3.0)
    ta.press("Enter")
    for ev in ("keydown", "keypress", "keyup"):
        ta.evaluate(
            "(el, evName) => { el.dispatchEvent(new KeyboardEvent(evName, "
            "{key:'Enter', code:'Enter', keyCode:13, which:13, "
            "bubbles:true, cancelable:true})); }",
            ev)
    time.sleep(0.5)
    cur = ta.input_value()
    if cur.strip():
        print("WARN: textarea still has text after Enter: " + repr(cur[:80]))
    print("sent on port " + str(args.port) + ": " + msg[:120])