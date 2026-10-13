"""cdp_client.py - нативный CDP-клиент без Playwright.
HTTP /json/list (мгновенно) + websocket к нужному target.
Обход: Playwright connect_over_cdp виснет на тяжёлых SPA (qwen/alice).
"""
import json
import time
import urllib.request

import websocket  # websocket-client

CHAT_MARK = "/a/chat/s/"


def list_targets(port):
    url = "http://127.0.0.1:%d/json/list" % port
    with urllib.request.urlopen(url, timeout=5) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def find_chat_target(port, marker=CHAT_MARK, host="deepseek.com"):
    for t in list_targets(port):
        if t.get("type") != "page":
            continue
        u = t.get("url", "")
        if marker in u and host in u:
            return t
    return None


class CDPSession:
    def __init__(self, ws_url, timeout=15):
        self.ws = websocket.create_connection(ws_url, timeout=timeout, suppress_origin=True)
        self._id = 0

    def call(self, method, params=None):
        self._id += 1
        mid = self._id
        self.ws.send(json.dumps({"id": mid, "method": method,
                                 "params": params or {}}))
        while True:
            raw = self.ws.recv()
            try:
                j = json.loads(raw)
            except Exception:
                continue
            if j.get("id") == mid:
                return j

    def eval(self, expr):
        e = expr.strip()
        # поддержка стрелок: "() => ..." -> вызов.
        # НЕ трогаем уже самовызывающиеся "(()=>{})()"
        if (e.startswith("(") and "=>" in e[:80]
                and not e.rstrip().endswith(")()")):
            e = "(" + e + ")()"
        r = self.call("Runtime.evaluate",
                      {"expression": e, "returnByValue": True})
        return (r.get("result", {}) or {}).get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass


def connect_chat(port):
    t = find_chat_target(port)
    if not t:
        return None, None
    sess = CDPSession(t["webSocketDebuggerUrl"])
    return sess, t