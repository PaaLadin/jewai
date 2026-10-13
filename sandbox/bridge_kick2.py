"""bridge_kick2.py - кик в чат через нативный CDP (без Playwright).
Замена bridge_kick.py: Playwright виснет на тяжёлых SPA (qwen/alice).
Usage:
  python sandbox/bridge_kick2.py --port 9223 --text "[A>B] ..." --wait-empty 5
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, find_chat_target

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
ap.add_argument("--text", required=True)
ap.add_argument("--prefix", default="")
ap.add_argument("--dry", action="store_true")
ap.add_argument("--wait-empty", type=int, default=0)
args = ap.parse_args()
msg = (args.prefix + " " + args.text).strip()

t = find_chat_target(args.port)
if not t:
    print("no chat page on port %d" % args.port)
    sys.exit(2)
sess = CDPSession(t["webSocketDebuggerUrl"])

TA = "document.querySelector('textarea')"
cur = sess.eval("(() => { const t=%s; return t ? t.value : null; })()" % TA)
if cur is None:
    print("no textarea")
    sys.exit(3)
busy = bool((cur or "").strip())
if args.wait_empty > 0 and busy:
    print("wait-empty: busy, wait up to %ds" % args.wait_empty)
    dl = time.time() + args.wait_empty
    while time.time() < dl:
        time.sleep(1.0)
        cur = sess.eval("(() => { const t=%s; return t ? t.value : ''; })()" % TA)
        if not (cur or "").strip():
            busy = False
            print("wait-empty: cleared")
            break
print("textarea current: %r" % (cur or "")[:80])
if args.dry:
    print("DRY: would send:", msg)
    sess.close(); sys.exit(0)
if (cur or "").strip():
    print("REFUSED: textarea busy. Draft preserved.")
    sess.close(); sys.exit(4)

# fill + verify
sess.eval("(() => { const t=%s; t.focus(); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()" % TA)
time.sleep(0.2)
# ввод текста через Input.insertText (React-friendly)
sess.call("Input.insertText", {"text": msg})
time.sleep(0.8)
val = sess.eval("(() => { const t=%s; return t.value; })()" % TA)
print("verify after fill: %r" % (val or "")[:60])

# Enter x2 (канон)
for i in range(2):
    sess.call("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Enter", "code": "Enter", "keyCode": 13, "windowsVirtualKeyCode": 13, "nativeVirtualKeyCode": 13})
    sess.call("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Enter", "code": "Enter", "keyCode": 13, "windowsVirtualKeyCode": 13, "nativeVirtualKeyCode": 13})
    time.sleep(1.5 if i == 0 else 0.5)
time.sleep(2.0)
val = sess.eval("(() => { const t=%s; return t ? t.value : ''; })()" % TA)
if (val or "").strip():
    print("WARN: textarea still has text: %r" % (val or "")[:60])
else:
    print("sent on port %d: %s" % (args.port, msg[:120]))
sess.close()