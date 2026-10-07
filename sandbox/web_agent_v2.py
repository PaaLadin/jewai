"""Full browser agent: navigate, click, fill, extract, screenshot, forms."""
import sys, json, time, base64, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

RUNS = ROOT / "sandbox" / "runs"
RUNS.mkdir(parents=True, exist_ok=True)


def connect(port):
    p = sync_playwright().start()
    for i in range(3):
        try:
            b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
            return p, b
        except Exception as e:
            print("connect attempt " + str(i+1) + " failed: " + repr(e)[:100])
            time.sleep(3)
    raise RuntimeError("no CDP on port " + str(port))


def new_page(b):
    ctx = b.contexts[0] if b.contexts else b.new_context()
    pg = ctx.new_page()
    return pg, ctx


def step(pg, s):
    a = s.get("action")
    out = {"action": a}
    t0 = time.time()
    if a == "goto":
        pg.goto(s["url"], wait_until=s.get("wait", "domcontentloaded"), timeout=s.get("timeout", 30000))
        out["url"] = pg.url
        out["title"] = pg.title()
    elif a == "wait_for":
        pg.wait_for_selector(s["selector"], timeout=s.get("timeout", 15000))
        out["ok"] = True
    elif a == "wait":
        time.sleep(s.get("ms", 1000) / 1000)
    elif a == "click":
        pg.click(s["selector"], timeout=s.get("timeout", 10000))
        out["ok"] = True
    elif a == "fill":
        pg.fill(s["selector"], s.get("value", ""), timeout=s.get("timeout", 10000))
        out["ok"] = True
    elif a == "press":
        pg.keyboard.press(s.get("key", "Enter"))
        out["ok"] = True
    elif a == "type":
        pg.type(s["selector"], s.get("text", ""), delay=s.get("delay", 30))
        out["ok"] = True
    elif a == "text":
        sel = s.get("selector", "body")
        if sel == "body":
            t = pg.evaluate("() => document.body ? document.body.innerText : ''")
        else:
            t = pg.locator(sel).first.inner_text(timeout=10000)
        out["len"] = len(t)
        out["text"] = t[:s.get("max_chars", 4000)]
    elif a == "html":
        out["html"] = pg.content()[:s.get("max_chars", 20000)]
    elif a == "eval":
        out["value"] = pg.evaluate(s["code"])
    elif a == "links":
        links = pg.evaluate("""(maxn) => {
            const out = [];
            for (const x of document.querySelectorAll('a[href]')) {
                const t = (x.innerText || '').trim();
                const h = x.href;
                if (t && h && !h.startsWith('javascript:')) out.push({t: t.slice(0,100), h: h});
                if (out.length >= maxn) break;
            }
            return out;
        }""", s.get("max_n", 30))
        out["count"] = len(links)
        out["links"] = links
    elif a == "images":
        imgs = pg.evaluate("""(maxn) => {
            const out = [];
            for (const x of document.querySelectorAll('img[src]')) {
                out.push({src: x.src, alt: x.alt || '', w: x.naturalWidth || 0, h: x.naturalHeight || 0});
                if (out.length >= maxn) break;
            }
            return out;
        }""", s.get("max_n", 20))
        out["count"] = len(imgs)
        out["images"] = imgs
    elif a == "shot":
        name = s.get("name", "web_shot.png")
        f = RUNS / name
        pg.screenshot(path=str(f), full_page=s.get("full", False))
        out["file"] = str(f)
        out["size"] = f.stat().st_size
    elif a == "back":
        pg.go_back(timeout=15000)
        out["url"] = pg.url
    elif a == "forward":
        pg.go_forward(timeout=15000)
        out["url"] = pg.url
    else:
        out["error"] = "unknown action: " + str(a)
    out["elapsed"] = round(time.time() - t0, 2)
    return out


def run(port, recipe, keep_open=False):
    p, b = connect(port)
    pg, ctx = new_page(b)
    log = []
    try:
        for i, s in enumerate(recipe, 1):
            try:
                r = step(pg, s)
                r["i"] = i
            except Exception as e:
                r = {"i": i, "action": s.get("action"), "error": repr(e)[:300]}
            log.append(r)
            summary = {k: v for k, v in r.items() if k not in ("text", "html", "links", "images")}
            print("[step " + str(i) + "] " + json.dumps(summary, ensure_ascii=False)[:250])
            if "text" in r and r["text"]:
                print("  text[" + str(r["len"]) + "]: " + r["text"][:300].replace("\n", " "))
            if "value" in r:
                print("  value: " + json.dumps(r["value"], ensure_ascii=False)[:300])
            if "links" in r:
                for lk in r["links"][:5]:
                    print("    " + lk["t"][:60] + " -> " + lk["h"][:80])
            if "images" in r:
                for im in r["images"][:5]:
                    print("    img " + str(im["w"]) + "x" + str(im["h"]) + " " + im["src"][:80])
            if "error" in r:
                print("  ERROR: " + r["error"])
    finally:
        if not keep_open:
            pg.close()
            p.stop()
    out = RUNS / "web_agent_v2_log.json"
    out.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9222)
    ap.add_argument("--recipe", required=True)
    ap.add_argument("--keep", action="store_true")
    args = ap.parse_args()
    recipe = json.loads(Path(args.recipe).read_text(encoding="utf-8"))
    log = run(args.port, recipe, keep_open=args.keep)
    errs = [s for s in log if "error" in s]
    print("")
    print("steps: " + str(len(log)) + " errors: " + str(len(errs)))