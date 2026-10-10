"""Reload Chrome extension via CDP service worker API. port 9222/9223."""
import sys, time, argparse
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, required=True)
args = ap.parse_args()

with sync_playwright() as p:
    try:
        b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(args.port), timeout=30000)
    except Exception as e:
        print("cdp fail: " + repr(e)[:150])
        sys.exit(2)

    # try chrome.runtime.reload via service worker target
    try:
        session = b.new_browser_cdp_session()
        targets = session.send("Target.getTargets")
        found = False
        for t in targets.get("targetInfos", []):
            if t.get("type") == "service_worker":
                url = t.get("url") or ""
                if "extension" in url or "background" in url:
                    print("found sw:", url[:80])
                    sid = session.send("Target.attachToTarget",
                                       {"targetId": t["targetId"], "flatten": True})["sessionId"]
                    try:
                        session.send("Runtime.evaluate",
                                     {"expression": "chrome.runtime.reload()",
                                      "returnByValue": True},
                                     session_id=sid)
                        print("chrome.runtime.reload() sent")
                        found = True
                    except Exception as e:
                        print("evaluate err: " + repr(e)[:120])
        if not found:
            print("no service worker target found")
    except Exception as e:
        print("sw cdp err: " + repr(e)[:150])

    time.sleep(2)
    print("done")