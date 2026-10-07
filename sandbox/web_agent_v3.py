import sys, json, time, argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

RUNS = ROOT / "sandbox" / "runs"
RUNS.mkdir(parents=True, exist_ok=True)


def connect(port):
    p = sync_playwright().start()
    for i in range(3):
        try:
            b = p.chromium.connect_over_cdp("http://127.0.0.1:" + str(port), timeout=30000)
            print("connected to CDP " + str(port), flush=True)
            return p, b
        except Exception as e:
            print("connect attempt " + str(i+1) + ": " + repr(e)[:100], flush=True)
            time.sleep(3)
    raise RuntimeError("no CDP")


def new_page(b):
    ctx = b.contexts[0] if b.contexts else b.new_context()
    return ctx.new_page(), ctx


def analyze_png(path):
    try:
        from PIL import Image
    except ImportError:
        return {"error": "no PIL"}
    p = Path(path)
    if not p.exists():
        return {"error": "not found"}
    im = Image.open(p).convert("RGB")
    w, h = im.size
    small = im.resize((64, 64))
    px = list(small.convert('RGB').getdata())
    avg = tuple(sum(c[i] for c in px) // len(px) for i in range(3))
    # sample colors
    red = sum(1 for c in px if c[0] > 200 and c[1] < 100 and c[2] < 100)
    blue = sum(1 for c in px if c[2] > 200 and c[0] < 100 and c[1] < 150)
    green = sum(1 for c in px if c[1] > 180 and c[0] < 120 and c[2] < 120)
    dark = sum(1 for c in px if sum(c) < 200)
    light = sum(1 for c in px if sum(c) > 600)
    n = len(px)
    return {
        "path": str(p), "size": [w, h], "avg_rgb": list(avg),
        "brightness": int(sum(avg) / 3),
        "red_pct": round(100*red/n, 2),
        "blue_pct": round(100*blue/n, 2),
        "green_pct": round(100*green/n, 2),
        "dark_pct": round(100*dark/n, 2),
        "light_pct": round(100*light/n, 2),
    }
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
    elif a == "click_text":
        txt = s["text"]
        pg.get_by_text(txt, exact=s.get("exact", False)).first.click(timeout=s.get("timeout", 10000))
        out["clicked_text"] = txt
    elif a == "fill":
        pg.fill(s["selector"], s.get("value", ""), timeout=s.get("timeout", 10000))
        out["ok"] = True
    elif a == "press":
        pg.keyboard.press(s.get("key", "Enter"))
        out["ok"] = True
    elif a == "text":
        sel = s.get("selector", "body")
        if sel == "body":
            t = pg.evaluate("() => document.body ? document.body.innerText : ''")
        else:
            t = pg.locator(sel).first.inner_text(timeout=10000)
        out["len"] = len(t)
        out["text"] = t[:s.get("max_chars", 3000)]
    elif a == "html":
        out["html"] = pg.content()[:s.get("max_chars", 15000)]
        out["len"] = len(pg.content())
    elif a == "eval":
        out["value"] = pg.evaluate(s["code"])
    elif a == "links":
        links = pg.evaluate("""(maxn) => {
            const out=[];
            for (const x of document.querySelectorAll('a[href]')) {
                const t=(x.innerText||'').trim();
                const h=x.href;
                if (t && h && !h.startsWith('javascript:')) out.push({t:t.slice(0,120),h:h});
                if (out.length>=maxn) break;
            }
            return out;
        }""", s.get("max_n", 30))
        out["count"] = len(links)
        out["links"] = links
    elif a == "images":
        imgs = pg.evaluate("""(maxn) => {
            const out=[];
            for (const x of document.querySelectorAll('img[src]')) {
                out.push({src:x.src,alt:x.alt||'',w:x.naturalWidth||0,h:x.naturalHeight||0});
                if (out.length>=maxn) break;
            }
            return out;
        }""", s.get("max_n", 20))
        out["count"] = len(imgs)
        out["images"] = imgs
    elif a == "shot":
        name = s.get("name", "wa_v3.png")
        f = RUNS / name
        pg.screenshot(path=str(f), full_page=s.get("full", False))
        out["file"] = str(f)
        out["size"] = f.stat().st_size
    elif a == "shot_analyze":
        name = s.get("name", "wa_v3_analyze.png")
        f = RUNS / name
        pg.screenshot(path=str(f), full_page=s.get("full", False))
        out["analysis"] = analyze_png(f)
    elif a == "back":
        pg.go_back(timeout=15000); out["url"] = pg.url
    elif a == "forward":
        pg.go_forward(timeout=15000); out["url"] = pg.url
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
            short = {k: v for k, v in r.items() if k not in ("text", "html", "links", "images", "analysis")}
            print("[step " + str(i) + "] " + json.dumps(short, ensure_ascii=False)[:220], flush=True)
            if "text" in r and r["text"]:
                print("  text[" + str(r["len"]) + "]: " + r["text"][:280].replace("\n", " "), flush=True)
            if "value" in r:
                print("  value: " + json.dumps(r["value"], ensure_ascii=False)[:280], flush=True)
            if "links" in r:
                for lk in r["links"][:5]:
                    print("    " + lk["t"][:60] + " -> " + lk["h"][:80], flush=True)
            if "images" in r:
                for im in r["images"][:5]:
                    print("    img " + str(im["w"]) + "x" + str(im["h"]) + " " + im["src"][:80], flush=True)
            if "analysis" in r and isinstance(r["analysis"], dict) and "size" in r["analysis"]:
                an = r["analysis"]
                print("  analyze: " + json.dumps(an, ensure_ascii=False)[:300], flush=True)
            if "error" in r:
                print("  ERROR: " + r["error"], flush=True)
    finally:
        if not keep_open:
            try: pg.close()
            except Exception: pass
            try: p.stop()
            except Exception: pass
    out = RUNS / "web_agent_v3_log.json"
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
    sys.exit(0 if not errs else 1)


if __name__ == "__main__":
    main()