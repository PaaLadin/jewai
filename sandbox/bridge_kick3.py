"""bridge_kick3.py — кик для SPA (qwen/alice/deepseek).
Отличие от bridge_kick2: Enter не через Input.dispatchKeyEvent
(SPA его не берёт), а клик по кнопке send или KeyboardEvent+click.

Usage: python sandbox/bridge_kick3.py --port 9226 --text "[A>E] ..."
"""
import argparse, sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, find_chat_target

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
ap.add_argument("--text", required=True)
ap.add_argument("--wait-empty", type=int, default=0)
ap.add_argument("--dry", action="store_true")
args = ap.parse_args()

t = find_chat_target(args.port)
if not t:
    print("no chat page on port %d" % args.port); sys.exit(2)
s = CDPSession(t["webSocketDebuggerUrl"])

TA = ("(()=>{let ta=document.querySelector('textarea.message-input-textarea');"
      "if(!ta)ta=document.querySelector('textarea:not([readonly]):not([aria-hidden=\"true\"])');"
      "return ta})()")

cur = s.eval("(()=>{const t=%s;return t?t.value:null})()" % TA)
if cur is None:
    print("no textarea"); sys.exit(3)
if args.wait_empty and (cur or "").strip():
    dl = time.time() + args.wait_empty
    while time.time() < dl:
        time.sleep(1)
        cur = s.eval("(()=>{const t=%s;return t?t.value:''})()" % TA)
        if not (cur or "").strip(): break
if (cur or "").strip():
    print("REFUSED: textarea busy, len=%d" % len(cur)); s.close(); sys.exit(4)
if args.dry:
    print("DRY:", args.text); s.close(); sys.exit(0)

fill = ("(()=>{const ta=%s;const set=Object.getOwnPropertyDescriptor("
        "HTMLTextAreaElement.prototype,'value').set;"
        "set.call(ta,%r);ta.dispatchEvent(new Event('input',{bubbles:true}));"
        "ta.focus();return ta.value.length})()") % (TA, args.text)
n = s.eval(fill)
print("filled:", n)
time.sleep(0.5)

# клик по кнопке send (qwen/alice) или KeyboardEvent Enter (deepseek)
click_send = ("(()=>{const sels=['.message-input-right-button-send',"
              "'.chat-prompt-send-button','button.send-button',"
              "'[class*=send-button]:not([class*=disabled])'];"
              "for(const q of sels){const b=document.querySelector(q);"
              "if(b&&!b.className.match(/disabled/)){b.click();return 'click:'+q}}"
              "return 'no-button'})()")
r = s.eval(click_send)
print("send:", r)
time.sleep(0.5)
if r == "no-button":
    enter = ("(()=>{const ta=%s;for(const ty of ['keydown','keypress','keyup'])"
             "ta.dispatchEvent(new KeyboardEvent(ty,{key:'Enter',code:'Enter',"
             "keyCode:13,which:13,bubbles:true,cancelable:true}));"
             "return 'enter'})()") % TA
    print("fallback enter:", s.eval(enter))
time.sleep(1.5)
v = s.eval("(()=>{const ta=%s;return ta?ta.value.length:-1})()" % TA)
print("ta len after:", v)
s.close()
if v == 0:
    print("sent on port %d: %s" % (args.port, args.text[:100]))
else:
    print("WARN: textarea not empty")