"""web_agent_v4: extended browser agent with vision helper, form fill, conditional steps."""
import sys, json, time, argparse
import io
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass

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
            print("attempt " + str(i+1) + ": " + repr(e)[:100], flush=True)
            time.sleep(3)
    raise RuntimeError("no CDP")


def get_or_new_page(b):
    """Reuse existing page if possible. Only create new tab when none exists."""
    ctx = b.contexts[0] if b.contexts else b.new_context()
    # find first suitable page (skip extension pages)
    for pg in ctx.pages:
        try:
            u = pg.url or ""
            if "chrome-extension://" in u:
                continue
            if "devtools://" in u:
                continue
            return pg, ctx
        except Exception:
            continue
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
    small = im.resize((80, 80))
    px = list(small.convert('RGB').getdata()) if hasattr(small, 'getdata') else list(small.convert('RGB').tobytes())
    n = len(px)
    avg = tuple(sum(c[i] for c in px) // n for i in range(3))
    red = sum(1 for c in px if c[0] > 200 and c[1] < 100 and c[2] < 100)
    blue = sum(1 for c in px if c[2] > 200 and c[0] < 100 and c[1] < 150)
    green = sum(1 for c in px if c[1] > 180 and c[0] < 120 and c[2] < 120)
    dark = sum(1 for c in px if sum(c) < 200)
    light = sum(1 for c in px if sum(c) > 600)
    return {
        "path": str(p), "size": [w, h], "avg_rgb": list(avg),
        "brightness": int(sum(avg) / 3),
        "red_pct": round(100*red/n, 2),
        "blue_pct": round(100*blue/n, 2),
        "green_pct": round(100*green/n, 2),
        "dark_pct": round(100*dark/n, 2),
        "light_pct": round(100*light/n, 2),
    }


def find_by_vision(page, query):
    """Find element near a target color region or with matching text via screenshot analysis.
    query = {"text": "Submit"} or {"role": "button", "name_contains": "Send"}"""
    results = []
    try:
        if "text" in query:
            els = page.locator("text=" + query["text"])
            n = els.count()
            for i in range(min(n, 5)):
                el = els.nth(i)
                try:
                    box = el.bounding_box()
                    results.append({"text": query["text"], "box": box, "index": i})
                except Exception:
                    pass
        if "role" in query:
            role = query["role"]
            name_contains = query.get("name_contains", "")
            js = "([role, sub]) => { const out=[]; for (const el of document.querySelectorAll('*[role=\"'+role+'\"]')) { const t=(el.innerText||'').trim(); if (!sub || t.includes(sub)) { const r=el.getBoundingClientRect(); out.push({text:t.slice(0,80), x:r.x, y:r.y, w:r.width, h:r.height}); } } return out.slice(0,10); }"
            found = page.evaluate(js, [role, name_contains])
            results.extend(found or [])
    except Exception as e:
        return {"error": repr(e)[:200]}
    return {"found": len(results), "items": results[:10]}
def do_fill_form(page, fields):
    """fields = [{"selector": "#email", "value": "a@b.com"}, ...]"""
    log = []
    for f in fields:
        try:
            sel = f.get("selector")
            val = f.get("value", "")
            if sel:
                page.fill(sel, val, timeout=10000)
                log.append({"sel": sel, "ok": True})
            elif f.get("label"):
                page.get_by_label(f["label"]).fill(val)
                log.append({"label": f["label"], "ok": True})
            elif f.get("placeholder"):
                page.get_by_placeholder(f["placeholder"]).fill(val)
                log.append({"placeholder": f["placeholder"], "ok": True})
            else:
                log.append({"error": "no selector/label/placeholder"})
        except Exception as e:
            log.append({"sel": f.get("selector"), "error": repr(e)[:120]})
    return {"fields": log}


def do_submit_by_button(page, button_text):
    """Try to click a submit button matching text."""
    try:
        page.get_by_role("button", name=button_text).first.click(timeout=8000)
        return {"clicked": button_text}
    except Exception as e1:
        try:
            page.get_by_text(button_text, exact=False).first.click(timeout=8000)
            return {"clicked": button_text, "mode": "text"}
        except Exception as e2:
            return {"error": repr(e1)[:100] + " / " + repr(e2)[:100]}


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
    elif a == "wait_for_text":
        needle = s["text"]
        timeout_ms = s.get("timeout", 15000)
        deadline = time.time() + timeout_ms/1000
        found = False
        while time.time() < deadline:
            try:
                body = pg.evaluate("() => document.body ? document.body.innerText : ''")
                if needle in body:
                    found = True
                    break
            except Exception:
                pass
            time.sleep(0.4)
        out["found"] = found
        out["needle"] = needle
    elif a == "upload_file":
        pg.set_input_files(s["selector"], s["path"], timeout=s.get("timeout", 15000))
        out["uploaded"] = s["path"]
    elif a == "iframe_eval":
        frames = pg.frames
        out["frame_count"] = len(frames)
        idx = s.get("index", 0)
        code = s.get("code", "() => document.title")
        if idx < len(frames):
            try:
                out["value"] = frames[idx].evaluate(code)
            except Exception as e:
                out["error"] = repr(e)[:200]
        else:
            out["error"] = "frame index out of range"
    elif a == "multi_tab":
        urls = s.get("urls", [])
        ctx = pg.context
        results = []
        for u in urls:
            try:
                newp = ctx.new_page()
                newp.goto(u, wait_until="domcontentloaded", timeout=20000)
                title = newp.title()
                body = newp.evaluate("() => document.body ? document.body.innerText.slice(0,500) : ''")
                results.append({"url": u, "title": title, "preview": body[:200]})
                newp.close()
            except Exception as e:
                results.append({"url": u, "error": repr(e)[:120]})
        out["tabs"] = results
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
    elif a == "fill_form":
        out.update(do_fill_form(pg, s.get("fields", [])))
    elif a == "submit":
        out.update(do_submit_by_button(pg, s.get("button", "Submit")))
    elif a == "find_by_vision":
        out.update(find_by_vision(pg, s.get("query", {})))
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
        h = pg.content()
        out["len"] = len(h)
        out["html"] = h[:s.get("max_chars", 15000)]
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
        name = s.get("name", "wa_v4.png")
        f = RUNS / name
        pg.screenshot(path=str(f), full_page=s.get("full", False))
        out["file"] = str(f)
        out["size"] = f.stat().st_size
    elif a == "shot_analyze":
        name = s.get("name", "wa_v4_analyze.png")
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
def run_step_chain(pg, chain, results, i):
    """Execute a step, or a chain (list of steps) with conditional branches.
    Step with 'if_prev_ok': bool — condition on previous result.
    Step with 'then': [steps] — execute if condition passes.
    Step with 'else': [steps] — execute if condition fails.
    """
    if isinstance(chain, dict):
        chain = [chain]

    for s in chain:
        cond = s.get("if_prev_ok")
        if cond is not None:
            prev = results[-1] if results else {}
            prev_ok = "error" not in prev and not (prev.get("ok") is False)
            should_run = (prev_ok and cond) or (not prev_ok and not cond)
            if not should_run:
                results.append({"i": i, "action": "skip", "reason": "condition", "elapsed": 0})
                continue

        try:
            r = step(pg, s)
            r["i"] = i
            r["action"] = s.get("action")
        except Exception as e:
            r = {"i": i, "action": s.get("action"), "error": repr(e)[:300]}
        results.append(r)

        # nested then/else
        if "then" in s:
            prev_ok = "error" not in r
            if prev_ok:
                run_step_chain(pg, s["then"], results, str(i) + ".then")
        if "else" in s:
            prev_ok = "error" not in r
            if not prev_ok:
                run_step_chain(pg, s["else"], results, str(i) + ".else")


def run(port, recipe, keep_open=False):
    p, b = connect(port)
    pg, ctx = get_or_new_page(b)
    log = []
    try:
        for i, s in enumerate(recipe, 1):
            run_step_chain(pg, s, log, i)
            last = log[-1] if log else {}
            short = {k: v for k, v in last.items()
                     if k not in ("text", "html", "links", "images", "analysis")}
            print("[step " + str(i) + "] " + json.dumps(short, ensure_ascii=False)[:220], flush=True)
            if "text" in last:
                print("  text[" + str(last["len"]) + "]: " + last["text"][:260].replace("\n", " "), flush=True)
            if "value" in last:
                print("  value: " + json.dumps(last["value"], ensure_ascii=False)[:260], flush=True)
            if "found" in last:
                print("  found: " + str(last["found"]), flush=True)
                for it in last.get("items", [])[:5]:
                    print("    " + json.dumps(it, ensure_ascii=False)[:200], flush=True)
            if "analysis" in last and isinstance(last["analysis"], dict) and "size" in last["analysis"]:
                print("  analyze: " + json.dumps(last["analysis"], ensure_ascii=False)[:260], flush=True)
            if "error" in last:
                print("  ERROR: " + last["error"], flush=True)
    finally:
        if not keep_open:
            try: p.stop()
            except Exception: pass
    out = RUNS / "web_agent_v4_log.json"
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