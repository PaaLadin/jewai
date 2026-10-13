"""activate_chat.py - нативная активация чата (fill + attach + send).
Порт step_* из rebirth_cdp на cdp_client (Playwright виснет).
Usage: python sandbox/activate_chat.py --port 9225 --line "8D Димон" \
         --file a.md --file b.md
"""
import argparse, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, find_chat_target, list_targets

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
ap.add_argument("--line", required=True)
ap.add_argument("--file", action="append", default=[])
ap.add_argument("--dry", action="store_true")
a = ap.parse_args()

def _any_deepseek(port):
    for x in list_targets(port):
        if x.get("type") == "page" and "chat.deepseek.com" in x.get("url", ""):
            return x
    return None
t = find_chat_target(a.port) or _any_deepseek(a.port)
if not t:
    print("no deepseek page on", a.port); sys.exit(2)
s = CDPSession(t["webSocketDebuggerUrl"])
s.call("DOM.enable")
s.call("Runtime.enable")
print("url:", t["url"])

TA = "document.querySelector('textarea')"
# 1. fill line
s.eval("(() => { const t=%s; if(t){t.focus(); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true}));} return 1; })()" % TA)
time.sleep(0.3)
s.call("Input.insertText", {"text": a.line})
time.sleep(0.5)
v = s.eval("(() => { const t=%s; return t?t.value:''; })()" % TA)
print("line filled:", repr((v or "")[:40]))

# 2. attach files
if a.file:
    doc = s.call("DOM.getDocument", {"depth": -1})
    root = doc["result"]["root"]["nodeId"]
    q = s.call("DOM.querySelector", {"nodeId": root, "selector": "input[type=file]"})
    nid = q["result"].get("nodeId")
    print("file input nodeId:", nid)
    if nid:
        r = s.call("DOM.setFileInputFiles", {"files": a.file, "nodeId": nid})
        print("setFileInputFiles:", "err" if r.get("error") else "ok")
        time.sleep(3)
        body = s.eval("(() => document.body?document.body.innerText:'')") or ""
        for f in a.file:
            nm = f.replace("/", "\\").split("\\")[-1]
            print("  attached?" , nm, nm in body)
    else:
        print("!! no file input in DOM")

if a.dry:
    print("DRY done"); s.close(); sys.exit(0)

# 3. send (Enter x2)
for i in range(2):
    s.call("Input.dispatchKeyEvent", {"type":"keyDown","key":"Enter","code":"Enter","keyCode":13,"windowsVirtualKeyCode":13,"nativeVirtualKeyCode":13})
    s.call("Input.dispatchKeyEvent", {"type":"keyUp","key":"Enter","code":"Enter","keyCode":13,"windowsVirtualKeyCode":13,"nativeVirtualKeyCode":13})
    time.sleep(1.5)
time.sleep(2)
v = s.eval("(() => { const t=%s; return t?t.value:''; })()" % TA)
print("after send, textarea len:", len(v or ""))
print("NEW URL:", s.eval("document.location.href"))
s.close()