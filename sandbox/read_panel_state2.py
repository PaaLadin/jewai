"""read_panel_state2.py - lastId/состояние панели через нативный CDP.
Замена Playwright (виснет на тяжёлых SPA). Быстро: ~0.1с.
"""
import os
import sys, io as _io
try:
    _sys_stdout = _io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stdout = _sys_stdout
except Exception:
    pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp_client import CDPSession, find_chat_target, list_targets

port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222

# ищем sidepanel target
target = None
for t in list_targets(port):
    if "sidepanel.html" in t.get("url", ""):
        target = t
        break
if not target:
    print("no sidepanel on %d" % port)
    sys.exit(2)

sess = CDPSession(target["webSocketDebuggerUrl"])
txt = sess.eval("() => document.body ? document.body.innerText : ''") or ""
print(txt[:3000])
sess.close()