"""Экспорт share-страницы в ИЗОЛИРОВАННОМ контексте.
Не трогает UI рабочего Chrome (нет new_page в основном окне),
cookies не передаются -> share отдаётся публично, без редиректа.
"""
import sys, io, time, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path
from playwright.sync_api import sync_playwright


def _ss(pg, js, arg=None):
    try:
        return pg.evaluate(js) if arg is None else pg.evaluate(js, arg)
    except Exception as e:
        print("WARN eval: %s" % e, file=sys.stderr)
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--port", type=int, default=9223)
    ap.add_argument("--wait", type=float, default=10.0)
    ap.add_argument("--step", type=int, default=600)
    ap.add_argument("--max_steps", type=int, default=300)
    a = ap.parse_args()

    p = sync_playwright().start()
    b = p.chromium.connect_over_cdp("http://127.0.0.1:%d" % a.port, timeout=60000)
    # изолированный контекст: без cookies, без вкладок в UI
    ctx = b.new_context()
    pg = ctx.new_page()
    seen, ordered = set(), []
    final_url, title = "", ""
    try:
        pg.goto(a.url, wait_until="domcontentloaded", timeout=90000)
        time.sleep(a.wait)
        final_url, title = pg.url, pg.title()

        def snap():
            txt = _ss(pg, "() => document.body ? document.body.innerText : ''") or ""
            for line in txt.split("\n"):
                k = line.strip()
                if not k or k in seen:
                    continue
                seen.add(k)
                ordered.append(line)

        def top():
            return _ss(pg, """() => {
              let best=null,bd=0;
              document.querySelectorAll('*').forEach(el=>{
                const d=el.scrollHeight-el.clientHeight;
                if(el.clientHeight>200 && d>bd){best=el;bd=d;}
              });
              return best ? best.scrollTop : 0;
            }""")

        def scroll_by(n):
            _ss(pg, """(n) => {
              let best=null,bd=0;
              document.querySelectorAll('*').forEach(el=>{
                const d=el.scrollHeight-el.clientHeight;
                if(el.clientHeight>200 && d>bd){best=el;bd=d;}
              });
              if(best) best.scrollTop += n;
            }""", n)

        _ss(pg, """() => {
          let best=null,bd=0;
          document.querySelectorAll('*').forEach(el=>{
            const d=el.scrollHeight-el.clientHeight;
            if(el.clientHeight>200 && d>bd){best=el;bd=d;}
          });
          if(best) best.scrollTop = 0;
        }""")
        time.sleep(1)
        last = -1
        for i in range(a.max_steps):
            snap()
            t = top()
            if t == last and i > 5:
                break
            last = t
            scroll_by(a.step)
            time.sleep(0.4)
        snap()
    finally:
        try: pg.close()
        except Exception: pass
        try: ctx.close()
        except Exception: pass
        try: b.close()
        except Exception: pass
        p.stop()

    text = "\n".join(ordered)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    header = ("# source: %s\n# final_url: %s\n# title: %s\n# exported: %s\n# bytes: %d\n\n"
              % (a.url, final_url, title, time.strftime("%Y-%m-%d %H:%M:%S"), len(text)))
    out.write_text(header + text, encoding="utf-8")
    print("OK %d chars, final=%s" % (len(text), final_url))


if __name__ == "__main__":
    main()