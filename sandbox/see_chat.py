"""see_chat.py - screenshot of agent's chat window via CDP.
For controlling agent: see what the newborn agent actually sees.

Usage:
  python sandbox/see_chat.py --cdp 9224 --out logs/A/see_C.png
  python sandbox/see_chat.py --cdp 9224 --text-only
"""
import argparse, base64, io, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cdp_client as c


def grab(cdp_port, out_png):
    ts = c.list_targets(cdp_port)
    chat = [t for t in ts if "/a/chat/s/" in t.get("url", "") or "chat.deepseek.com" in t.get("url", "")]
    if not chat:
        print("FAIL: no chat page on port %d" % cdp_port)
        return 2
    t = chat[0]
    s = c.CDPSession(t["webSocketDebuggerUrl"], timeout=30)
    try:
        meta = s.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
        data = ((meta.get("result") or {}).get("data") or "")
        if not data:
            print("FAIL: empty screenshot")
            return 3
        os.makedirs(os.path.dirname(out_png) or ".", exist_ok=True)
        with open(out_png, "wb") as f:
            f.write(base64.b64decode(data))
        sz = os.path.getsize(out_png)
        print("OK: %s (%d bytes) from %s" % (out_png, sz, t.get("url", "")[:80]))
        return 0
    finally:
        s.close()


def dump_text(cdp_port, out_txt, maxlen=8000):
    ts = c.list_targets(cdp_port)
    chat = [t for t in ts if "/a/chat/s/" in t.get("url", "")]
    if not chat:
        print("FAIL: no chat page")
        return 2
    t = chat[0]
    s = c.CDPSession(t["webSocketDebuggerUrl"])
    try:
        txt = s.eval("document.body ? document.body.innerText : ''") or ""
        os.makedirs(os.path.dirname(out_txt) or ".", exist_ok=True)
        with open(out_txt, "w", encoding="utf-8") as f:
            f.write(txt[:maxlen])
        print("OK: %s (%d chars)" % (out_txt, len(txt)))
        return 0
    finally:
        s.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cdp", type=int, required=True)
    ap.add_argument("--out", default="")
    ap.add_argument("--text-only", action="store_true")
    a = ap.parse_args()
    if a.text_only:
        out = a.out or ("logs/A/see_%d.txt" % a.cdp)
        sys.exit(dump_text(a.cdp, out))
    out = a.out or ("logs/A/see_%d.png" % a.cdp)
    sys.exit(grab(a.cdp, out))


if __name__ == "__main__":
    main()