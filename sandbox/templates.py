"""Test code generators for agent_loop. Each render_* returns python source."""
import textwrap

HEADER = '''# tag: auto,{name}
import sys, time, threading, http.server, socketserver, json
from functools import partial
from pathlib import Path
sys.path.insert(0, str(ROOT / "sandbox"))
from pwlib import check, summary, browser

SRV = ROOT / "sandbox" / "srv"
'''

N = chr(10)


def render_check(t):
    name = t["name"]
    expr = t["expression"]
    expected = t.get("expected")
    expect_err = t.get("expect_error", False)
    L = ["# tag: auto," + name, "import sys",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary", "",
         'print("=== auto check: ' + name + ' ===")',
         "try:", "    got = " + expr, "    err = None",
         "except Exception as e:", "    got = None", "    err = repr(e)", ""]
    if expect_err:
        L.append('check("expected exception", err is not None, f"err={err}")')
    else:
        L.append('check("expression result", got == ' + repr(expected) + ', f"got={got!r} want=' + repr(expected) + '")')
    L += ["", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


def render_http(t):
    name = t["name"]
    port = t.get("port", 8092)
    p = t.get("path", "/")
    needle = t.get("contains", "")
    st = t.get("status_expect", 200)
    body = textwrap.dedent('''\
        import urllib.request
        class Quiet(socketserver.TCPServer):
            allow_reuse_address = True
        Handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(SRV))
        httpd = Quiet(("127.0.0.1", PORT), Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        time.sleep(0.4)
        try:
            url = "http://127.0.0.1:PORT" + PATH
            print("=== auto http: NAME ===")
            req = urllib.request.Request(url)
            try:
                with urllib.request.urlopen(req, timeout=5) as r:
                    code = r.status
                    body = r.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                code = e.code
                body = e.read().decode("utf-8", "replace")
            check("status", code == ST, "got " + str(code))
            check("body contains", NEEDLE in body, "needle")
        finally:
            httpd.shutdown()
            httpd.server_close()
        s = summary()
        sys.exit(0 if s["failed"] == 0 else 1)
    ''')
    body = body.replace("PORT", str(port)).replace("PATH", '"' + p + '"')
    body = body.replace("ST", str(st)).replace("NEEDLE", repr(needle)).replace("NAME", name)
    return HEADER.format(name=name) + body


def render_html(t):
    name = t["name"]
    port = t.get("port", 8093)
    p = t.get("path", "/")
    click_sel = t.get("click", "")
    text_sel = t.get("text_selector", "")
    text_expect = t.get("text_expect", "")
    shot_name = t.get("shot", "auto_" + name + ".png")
    body = textwrap.dedent('''\
        class Quiet(socketserver.TCPServer):
            allow_reuse_address = True
        Handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(SRV))
        httpd = Quiet(("127.0.0.1", PORT), Handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        time.sleep(0.4)
        print("=== auto html: NAME ===")
        try:
            with browser(base="http://127.0.0.1:PORT") as pg:
                pg.goto(PATH)
                check("title not empty", len(pg.p.title()) > 0, pg.p.title())
                if CLICK:
                    pg.click(CLICK)
                    time.sleep(0.15)
                if TEXTSEL:
                    got = pg.text(TEXTSEL)
                    check("text matches", got == TEXTEXP, "got=" + repr(got))
                f, sz = pg.shot(SHOT)
                check("screenshot", sz > 2000, str(sz) + "b")
        finally:
            httpd.shutdown()
            httpd.server_close()
        s = summary()
        sys.exit(0 if s["failed"] == 0 else 1)
    ''')
    body = body.replace("PORT", str(port)).replace("PATH", '"' + p + '"')
    body = body.replace("CLICK", repr(click_sel) if click_sel else "None")
    body = body.replace("TEXTSEL", repr(text_sel) if text_sel else "None")
    body = body.replace("TEXTEXP", repr(text_expect))
    body = body.replace("SHOT", repr(shot_name))
    body = body.replace("NAME", name)
    return HEADER.format(name=name) + body


def render_pyfile(t):
    name = t["name"]
    p = t.get("path", "")
    needle = t.get("contains", "")
    must = t.get("exists", True)
    L = ["# tag: auto," + name, "import sys",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary",
         "from pathlib import Path", "",
         'print("=== auto pyfile: ' + name + ' ===")',
         'path = ROOT / ' + repr(p),
         "print('path:', path)",
         "exists = path.exists()",
         'check("exists", exists == ' + str(must) + ', "exists=" + str(exists))']
    if needle:
        L += ['if exists:',
              "    txt = path.read_text(encoding='utf-8', errors='replace')",
              "    print('size:', len(txt))",
              '    check("contains", ' + repr(needle) + ' in txt, "needle missing")']
    L += ["", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


def render_pyjson(t):
    name = t["name"]
    p = t.get("path", "")
    field = t.get("field", "")
    expected = t.get("expected")
    L = ["# tag: auto," + name, "import sys, json",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary",
         "from pathlib import Path", "",
         'print("=== auto pyjson: ' + name + ' ===")',
         'path = ROOT / ' + repr(p),
         'check("json exists", path.exists(), str(path))',
         "if path.exists():",
         "    data = json.loads(path.read_text(encoding='utf-8'))",
         "    cur = data",
         "    for part in " + repr(field) + ".split('.'):",
         "        if isinstance(cur, dict) and part in cur:",
         "            cur = cur[part]",
         "        else:",
         "            cur = None; break",
         '    check("field ' + field + '", cur == ' + repr(expected) + ', "got=" + repr(cur))',
         "", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


def render_pysub(t):
    name = t["name"]
    cmd = t.get("cmd", "")
    ex = t.get("expect_exit", 0)
    sc = t.get("stdout_contains", "")
    to = t.get("timeout", 30)
    L = ["# tag: auto," + name, "import sys, subprocess",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary", "",
         'print("=== auto pysub: ' + name + ' ===")',
         "cmd = " + repr(cmd),
         "r = subprocess.run(cmd, shell=True, capture_output=True, text=True,",
         "                   timeout=" + str(to) + ", encoding='utf-8', errors='replace')",
         "print('exit:', r.returncode)",
         "print('stdout:', r.stdout.strip()[:200])",
         "if r.stderr.strip(): print('stderr:', r.stderr[:200])",
         'check("exit", r.returncode == ' + str(ex) + ', "got " + str(r.returncode))']
    if sc:
        L.append('check("stdout has", ' + repr(sc) + ' in r.stdout, "needle missing")')
    L += ["", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


def render_pyimport(t):
    name = t["name"]
    module = t.get("module", "")
    L = ["# tag: auto," + name, "import sys",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary", "",
         'print("=== auto pyimport: ' + name + ' ===")',
         "try:",
         "    __import__(" + repr(module) + ")",
         '    check("import", True, "ok")',
         "except Exception as e:",
         '    check("import", False, repr(e))',
         "", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


def render_recipe(t):
    name = t["name"]
    recipe = t.get("recipe", "")
    expect_ok = t.get("expect_ok", True)
    L = ["# tag: auto,recipe," + name, "import sys, subprocess",
         'sys.path.insert(0, str(ROOT / "sandbox"))',
         "from pwlib import check, summary", "",
         'print("=== auto recipe: ' + name + ' ===")',
         "recipe = " + repr(recipe),
         "agent = str(ROOT / 'sandbox' / 'browser_agent.py')",
         "r = subprocess.run([sys.executable, agent, recipe],",
         '                   cwd=str(ROOT),',
         "                   capture_output=True, text=True, timeout=180,",
         "                   encoding='utf-8', errors='replace')",
         "print(r.stdout)",
         "if r.stderr.strip(): print('STDERR:', r.stderr[:300])",
         "expected_ok = " + str(expect_ok),
         "got_ok = (r.returncode == 0)",
         'check("recipe ok matches", got_ok == expected_ok, "rc=" + str(r.returncode))',
         "", "s = summary()", 'sys.exit(0 if s["failed"] == 0 else 1)']
    return N.join(L) + N


TEMPLATES = {
    "check": render_check,
    "http": render_http,
    "html": render_html,
    "pyfile": render_pyfile,
    "pyjson": render_pyjson,
    "pysub": render_pysub,
    "pyimport": render_pyimport,
    "recipe": render_recipe,
}


def render(task):
    tpl = task.get("template")
    fn = TEMPLATES.get(tpl)
    if not fn:
        return None
    return fn(task)