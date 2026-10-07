"""Recipe-driven browser agent. Reads JSON recipe, runs in Playwright, returns JSON."""
import sys, json, time, os, threading, http.server, socketserver
from pathlib import Path
from functools import partial

sys.path.insert(0, str(ROOT / "sandbox"))
from pwlib import browser

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
RUNS = ROOT / "sandbox" / "runs"
RUNS.mkdir(parents=True, exist_ok=True)
SRV = ROOT / "sandbox" / "srv"


class Quiet(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def start_server(port):
    Handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(SRV))
    httpd = Quiet(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    time.sleep(0.3)
    return httpd


def run_step(page, step):
    a = step.get("action")
    sel = step.get("selector", "")
    as_key = step.get("as", "")
    result = {"action": a}

    if a == "goto":
        url = step.get("url", "")
        if url.startswith("/"):
            url = page.base + url
        page.goto(url)
        result["url"] = url

    elif a == "click":
        page.click(sel)
        result["selector"] = sel

    elif a == "fill":
        page.fill(sel, step.get("value", ""))
        result["selector"] = sel

    elif a == "wait":
        page.wait(int(step.get("ms", 500)))

    elif a == "text":
        txt = page.text(sel)
        result["text"] = txt
        if as_key:
            result["as"] = as_key

    elif a == "count":
        n = page.count(sel)
        result["count"] = n
        if as_key:
            result["as"] = as_key

    elif a == "has":
        result["has"] = page.has(sel)
        if as_key:
            result["as"] = as_key

    elif a == "js":
        val = page.js(step.get("code", "() => null"))
        result["value"] = val
        if as_key:
            result["as"] = as_key

    elif a == "shot":
        name = step.get("name", "recipe_shot.png")
        f, sz = page.shot(name)
        result["file"] = str(f)
        result["size"] = sz

    elif a == "assert_eq":
        got = page.text(sel)
        want = step.get("value", "")
        result["selector"] = sel
        result["got"] = got
        result["want"] = want
        result["ok"] = got == want

    else:
        result["error"] = "unknown action: " + str(a)
        result["ok"] = False

    return result


def run_recipe(recipe_path):
    rp = Path(recipe_path)
    if not rp.is_absolute() and not rp.exists():
        alt = ROOT / recipe_path
        if alt.exists():
            rp = alt
    recipe = json.loads(rp.read_text(encoding="utf-8"))
    name = recipe.get("name", "unnamed")
    base_url = recipe.get("base_url", "")
    steps = recipe.get("steps", [])
    port = recipe.get("port", 8094)

    report = {
        "recipe": name,
        "started": time.time(),
        "steps": [],
        "ok": True,
        "errors": [],
    }

    httpd = None
    need_srv = any(s.get("action") == "goto" and str(s.get("url", "")).startswith("/")
                   for s in steps)
    if need_srv:
        httpd = start_server(port)
        base_url = base_url or ("http://127.0.0.1:" + str(port))

    try:
        with browser(base=base_url) as pg:
            for i, step in enumerate(steps, 1):
                t0 = time.time()
                try:
                    r = run_step(pg, step)
                    r["index"] = i
                    r["elapsed"] = round(time.time() - t0, 3)
                    report["steps"].append(r)
                    if r.get("ok") is False:
                        report["ok"] = False
                        report["errors"].append("step " + str(i) + ": " + str(r))
                except Exception as e:
                    report["ok"] = False
                    err = {"index": i, "action": step.get("action"),
                           "error": repr(e), "elapsed": round(time.time() - t0, 3)}
                    report["steps"].append(err)
                    report["errors"].append("step " + str(i) + ": " + repr(e))
    finally:
        if httpd:
            httpd.shutdown()
            httpd.server_close()

    report["elapsed"] = round(time.time() - report["started"], 2)
    out_override = recipe.get("_out")
    if out_override:
        out = Path(out_override)
    else:
        out = RUNS / ("recipe_" + name + "_" + str(os.getpid()) + ".json")
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report, out


def main():
    if len(sys.argv) < 2:
        print("usage: python browser_agent.py <recipe.json>")
        sys.exit(1)
    recipe_path = sys.argv[1]
    out_arg = None
    if "--out" in sys.argv:
        i = sys.argv.index("--out")
        if i + 1 < len(sys.argv):
            out_arg = sys.argv[i + 1]
    if out_arg:
        import json as _j
        _r = _j.loads(Path(recipe_path).read_text(encoding="utf-8"))
        _r["_out"] = out_arg
        _tmp = Path(recipe_path).with_suffix(".patched.json")
        _tmp.write_text(_j.dumps(_r, indent=2, ensure_ascii=False), encoding="utf-8")
        recipe_path = str(_tmp)
    report, out = run_recipe(recipe_path)
    print("recipe:", report["recipe"])
    print("steps:", len(report["steps"]))
    for s in report["steps"]:
        line = "  step " + str(s.get("index", "?")) + " " + str(s.get("action"))
        if s.get("as"):
            line += " as=" + str(s["as"])
        if "value" in s:
            line += " value=" + json.dumps(s["value"], ensure_ascii=False)[:80]
        if "text" in s:
            line += " text=" + repr(s["text"])[:80]
        if "count" in s:
            line += " count=" + str(s["count"])
        if "ok" in s:
            line += " ok=" + str(s["ok"])
        if "error" in s:
            line += " ERROR=" + s["error"][:60]
        print(line)
    print("ok:", report["ok"])
    print("elapsed:", report["elapsed"], "s")
    print("report:", out)
    sys.exit(0 if report["ok"] else 1)


if __name__ == "__main__":
    main()