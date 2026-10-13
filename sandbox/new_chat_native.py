"""new_chat_native.py - открыть новый чат DeepSeek на порту (CDP).
Нативный транспорт. Затем активация через activate_chat.py.
"""
import argparse, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, list_targets

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
a = ap.parse_args()

# найти любой deepseek page
tgt = None
for t in list_targets(a.port):
    if t.get("type") == "page" and "chat.deepseek.com" in t.get("url", ""):
        tgt = t; break
if not tgt:
    print("no deepseek page"); sys.exit(2)

s = CDPSession(tgt["webSocketDebuggerUrl"])
s.call("Page.enable")
s.call("Page.navigate", {"url": "https://chat.deepseek.com/"})
time.sleep(5)
# ждём textarea
for _ in range(15):
    ok = s.eval("!!document.querySelector('textarea')")
    if ok:
        break
    time.sleep(1)
print("url now:", s.eval("document.location.href"))
print("textarea:", s.eval("!!document.querySelector('textarea')"))
s.close()