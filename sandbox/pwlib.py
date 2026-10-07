from contextlib import contextmanager
from functools import partial
from pathlib import Path
from playwright.sync_api import sync_playwright
import http.server, socketserver, threading, time, sys

RUNS = ROOT / "sandbox" / "runs"
RUNS.mkdir(parents=True, exist_ok=True)


class QuietServer(socketserver.TCPServer):
    allow_reuse_address = True


@contextmanager
def serve(directory, port=8090):
    d = str(Path(directory).resolve())
    Handler = partial(http.server.SimpleHTTPRequestHandler, directory=d)
    httpd = QuietServer(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    time.sleep(0.3)
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        httpd.shutdown()
        httpd.server_close()


class Page:
    def __init__(self, raw, base=""):
        self.p = raw
        self.base = base

    def goto(self, url_or_path):
        url = self.base + url_or_path if url_or_path.startswith("/") else url_or_path
        self.p.goto(url, wait_until="domcontentloaded", timeout=30000)
        return self

    def click(self, sel):
        self.p.click(sel); return self

    def fill(self, sel, text):
        self.p.fill(sel, text); return self

    def text(self, sel):
        return self.p.locator(sel).inner_text()

    def count(self, sel):
        return self.p.locator(sel).count()

    def has(self, sel):
        return self.count(sel) > 0

    def shot(self, name):
        f = RUNS / name
        self.p.screenshot(path=str(f))
        return f, f.stat().st_size

    def js(self, code):
        return self.p.evaluate(code)

    def wait(self, ms):
        time.sleep(ms / 1000); return self


@contextmanager
def browser(viewport=(900, 600), base=""):
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={"width": viewport[0], "height": viewport[1]})
        raw = ctx.new_page()
        try:
            yield Page(raw, base=base)
        finally:
            b.close()


_results = []


def check(name, cond, detail=""):
    ok = bool(cond)
    _results.append({"name": name, "ok": ok, "detail": detail})
    mark = "[OK]" if ok else "[XX]"
    line = f"  {mark} {name}"
    if detail:
        line += f"  ({detail})"
    print(line, flush=True)
    return ok


def summary():
    total = len(_results)
    passed = sum(1 for r in _results if r["ok"])
    failed = total - passed
    print(f"SUMMARY: {passed}/{total} passed, {failed} failed", flush=True)
    return {"total": total, "passed": passed, "failed": failed, "results": _results}