"""rebirth_cdp.py — CDP-цикл перерождения (каркас).

Селекторы DeepSeek v4 (разведка 12.10):
  - новый чат: переход на https://chat.deepseek.com/ (главная).
  - textarea: единственная на странице.
  - attach: input[type=file] (1 шт), set_input_files().
  - share: ds-button (DIV, иконка) — точный селектор TODO.
  - кнопки: ds-button (DIV), не <button>.

Usage:
  python sandbox/rebirth_cdp.py --channel D --dry-run   # только план
  python sandbox/rebirth_cdp.py --channel D --live      # реальные клики
"""
import argparse
import io
import json
import os
import re
import sys
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
CDP = {"A": 9222, "B": 9223, "C": 9224, "D": 9225}
DS_HOME = "https://chat.deepseek.com/"
ACTIVATION = os.path.join(ROOT, "emergency", "0_ACTIVATION.md")
TABLE = os.path.join(ROOT, "logs", "rebirth", "series_table.json")

# Фразы-триггеры переполнения (от D, 12.10)
LIMIT_PHRASES = [
    "Достигнут предел длины",
    "Превышен лимит",
    "Length limit reached",
]


def load_table():
    with io.open(TABLE, "r", encoding="utf-8") as f:
        return json.load(f)


def fill_placeholders(ch, table):
    """Готовит копию 0_ACTIVATION.md с подставленными плейсхолдерами."""
    info = table["channels"][ch]
    with io.open(ACTIVATION, "r", encoding="utf-8") as f:
        tpl = f.read()
    # для активации ПРЕЕМНИКА берём его диапазон (next_range), не текущий
    rng = info.get("next_range") or info["range"]
    ports = {"A": 8766, "B": 8767, "C": 8768, "D": 8769}
    cdps = {"A": 9222, "B": 9223, "C": 9224, "D": 9225}
    # HANDOVER_AT: за 150 id до конца серии
    try:
        handover_at = "%s%04d" % (info["prefix"], int(rng[1][4:]) - 150)
    except Exception:
        handover_at = "?"
    repl = {
        "{{AGENT_NAME}}": info["name"],
        "{{CHANNEL_LETTER}}": ch,
        "{{ID_PREFIX}}": info["prefix"],
        "{{ID_START}}": rng[0],
        "{{ID_END}}": rng[1],
        "{{SERIES}}": info["next_series"],
        "{{PREDECESSOR}}": info["current_series"],
        "{{PREDECESSOR_LAST_ID}}": info["last_id"],
        "{{ROLE}}": "ведущий" if ch == "A" else "агент",
        "{{AGENT_PORT}}": str(ports.get(ch, "?")),
        "{{CDP_PORT}}": str(cdps.get(ch, "?")),
        "{{EXTENSION}}": "extension",
        "{{LOG_DIR}}": "logs/%s/" % ch,
        "{{HANDOVER_AT}}": handover_at,
    }
    for k, v in repl.items():
        tpl = tpl.replace(k, v)
    out_dir = os.path.join(ROOT, "emergency", "_runtime")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "0_ACTIVATION_%s.md" % info["next_series"])
    with io.open(out, "w", encoding="utf-8") as f:
        f.write(tpl)
    return out


def find_chat_page(ctx):
    for pg in ctx.pages:
        if "chat.deepseek.com" in pg.url:
            return pg
    return None


def has_limit_phrase(pg):
    txt = pg.evaluate("() => document.body ? document.body.innerText : ''") or ""
    return any(p in txt for p in LIMIT_PHRASES)


def step_new_chat(ctx, pg, dry=True):
    print("  [1] новый чат: goto %s" % DS_HOME)
    if dry:
        return pg
    pg.goto(DS_HOME, wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)
    return pg


def step_first_line(pg, line, dry=True):
    """Fill textarea (no send). Wait for React hydration, verify value."""
    print("  [2] first line (fill): %r" % line)
    if dry:
        return True
    try:
        pg.wait_for_selector("textarea", timeout=30000)
    except Exception as e:
        print("    !! textarea wait ERR: %r" % e)
        return False
    for attempt in range(3):
        try:
            ta = pg.query_selector("textarea")
            if not ta:
                print("    !! textarea not found (try %d)" % (attempt + 1))
                time.sleep(2); continue
            ta.click()
            ta.fill(line)
            time.sleep(1.0)
            val = pg.evaluate("() => (document.querySelector('textarea')||{}).value || ''")
            if line[:5] in (val or ""):
                print("    verify OK value=%r" % val[:40])
                return True
            print("    verify FAIL value=%r (try %d)" % (val[:40], attempt + 1))
        except Exception as e:
            print("    fill ERR: %r" % e)
        time.sleep(2)
    return False


def _attach_native(ctx, pg, files):
    """Fallback: DOM.setFileInputFiles через CDP-сессию Playwright."""
    try:
        cdp = ctx.new_cdp_session(pg)
        doc = cdp.send("DOM.getDocument")
        node = cdp.send("DOM.querySelector",
                        {"nodeId": doc["root"]["nodeId"],
                         "selector": "input[type=file]"})
        nid = node.get("nodeId")
        if not nid:
            return False
        cdp.send("DOM.setFileInputFiles", {"files": files, "nodeId": nid})
        cdp.detach()
        return True
    except Exception as e:
        print("    native attach ERR: %r" % e)
        return False


def step_attach(pg, files, dry=True, ctx=None):
    print("  [3] прикрепить: %s" % files)
    if dry:
        return
    inp = pg.query_selector("input[type=file]")
    if not inp:
        print("    !! file input not found"); return
    inp.set_input_files(files)
    time.sleep(3)
    # verify: в DOM появились имена файлов
    body = pg.evaluate("() => document.body ? document.body.innerText : ''") or ""
    missing = []
    for f in files:
        name = f.split("\\")[-1].split("/")[-1]
        if name in body:
            print("    attached: %s" % name)
        else:
            missing.append(name)
    if missing and ctx is not None:
        print("    fallback native attach (missing: %s)" % missing)
        if _attach_native(ctx, pg, files):
            time.sleep(2)
            body = pg.evaluate("() => document.body ? document.body.innerText : ''") or ""
            for name in missing:
                print("    %s: %s" % ("attached(retry)" if name in body else "!! STILL MISSING", name))


def step_send(pg, dry=True, fill_text="", old_url=""):
    """Enter posle fill+attach. Success criterion: our message appears in chat
    DOM (SPA creates new chat on goto, so URL may already be new before Enter)."""
    print("  [4] otpravit (Enter)")
    if dry:
        return
    ta0 = ""
    try:
        ta0 = pg.evaluate("() => (document.querySelector('textarea')||{}).value || ''") or ""
    except Exception:
        pass
    print("    pre-send textarea len=%d, url=%s" % (len(ta0), pg.url))
    ok = False
    for attempt in range(3):
        try:
            ta = pg.query_selector("textarea")
            if ta:
                ta.click()
        except Exception:
            pass
        try:
            pg.keyboard.press("Enter")
        except Exception as e:
            print("    press1 ERR: %r" % e)
        time.sleep(2.0)
        try:
            pg.keyboard.press("Enter")
        except Exception:
            pass
        for _ in range(12):
            time.sleep(1)
            try:
                body = pg.evaluate("() => document.body ? document.body.innerText : ''") or ""
                ta_v = pg.evaluate("() => (document.querySelector('textarea')||{}).value || ''") or ""
            except Exception:
                continue
            sent = (not ta_v.strip()) and (fill_text[:8] in body)
            if sent and "/a/chat/s/" in pg.url:
                ok = True
                break
        if ok:
            break
        print("    send attempt %d: not confirmed, retry" % (attempt + 1))
        time.sleep(2)
    new_url = pg.url if ok else ""
    print("    send ok=%s url=%s" % (ok, new_url or "(none)"))
    return new_url or None


def step_share(pg, dry=True):
    """Share старого чата: ds-button (top-right) -> Create public link
    -> Create and copy -> читаем URL. Селекторы проверены 12.10 на D."""
    print("  [5] share старого чата")
    if dry:
        print("    (dry) top-right ds-button -> Create public link -> Create and copy")
        return None
    import time as _t
    # 1. кнопка share в правом верхнем углу
    btn = pg.evaluate_handle(r"""() => {
      const all = Array.from(document.querySelectorAll("*"));
      const c = all.filter(e=>(e.className||"").toString().includes("ds-button") && e.getAttribute("role")==="button");
      const t = c.filter(e=>{
        const r=e.getBoundingClientRect();
        return r.top>=0 && r.top<160 && r.right>window.innerWidth-140 && r.width>0;
      });
      return t[0] || null;
    }""")
    el = btn.as_element()
    if not el:
        print("    !! share button not found"); return None
    el.click(); _t.sleep(2)
    # 2. "Create public link"
    b2 = pg.evaluate_handle(r"""() => {
      const all = Array.from(document.querySelectorAll('div[role=button],button,a'));
      return all.find(e=>(e.innerText||"").trim()==="Create public link") || null;
    }""")
    e2 = b2.as_element()
    if not e2:
        print("    !! 'Create public link' not found"); return None
    e2.click(); _t.sleep(3)
    # 3. "Create and copy"
    b3 = pg.evaluate_handle(r"""() => {
      const all = Array.from(document.querySelectorAll('div[role=button],button,a'));
      return all.find(e=>(e.innerText||"").trim().toLowerCase().includes("create and copy")) || null;
    }""")
    e3 = b3.as_element()
    if e3:
        e3.click(); _t.sleep(3)
    # 4. читаем URL
    data = pg.evaluate(r"""() => {
      const txt = document.body.innerText || "";
      const m = txt.match(/https?:\/\/chat\.deepseek\.com\/share\/[A-Za-z0-9]+/g);
      return m || [];
    }""")
    # закрыть модалку
    try: pg.keyboard.press("Escape")
    except Exception: pass
    url = data[0] if data else None
    print("    share url: %s" % url)
    return url


def run(ch, live=False, table=None):
    table = table or load_table()
    info = table["channels"][ch]
    print("=== rebirth %s (live=%s) ===" % (ch, live))
    print("  %s -> %s (%s)" % (info["current_series"], info["next_series"], info["name"]))

    act = fill_placeholders(ch, table)
    prompt = os.path.join(ROOT, "emergency", "PROMPT_%s.md" % info["next_series"])
    print("  activation: %s" % act)
    print("  prompt: %s" % prompt)
    if not os.path.exists(prompt):
        print("  !! PROMPT не найден: %s" % prompt)
        return 4

    if not live:
        print("--- DRY-RUN план ---")
        step_new_chat(None, None, dry=True)
        step_first_line(None, "%s %s" % (info["next_series"], info["name"]))
        step_attach(None, [act, prompt])
        step_send(None)
        step_share(None)
        print("РЕЗУЛЬТАТ: план ок, реальных действий нет (--dry-run).")
        return 0

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.connect_over_cdp("http://127.0.0.1:%d" % CDP[ch], timeout=30000)
        ctx = b.contexts[0]
        pg = find_chat_page(ctx)
        if not pg:
            print("!! chat page not found на порту %d" % CDP[ch])
            return 5
        if has_limit_phrase(pg):
            print("  чат-лимит уже показан (триггер №2)")
        share_url = step_share(pg, dry=False)
        if share_url:
            os.makedirs(os.path.join(ROOT, "logs", ch, "conversations"), exist_ok=True)
            links = os.path.join(ROOT, "logs", "rebirth", "share_links.jsonl")
            with io.open(links, "a", encoding="utf-8") as f:
                f.write(json.dumps({"ts": time.time(), "ch": ch,
                                    "series": info["current_series"],
                                    "url": share_url}, ensure_ascii=False) + "\n")
            print("    share записан в %s" % links)
            # выгрузка share в файл (изолированный контекст)
            out_md = os.path.join(ROOT, "logs", ch, "conversations",
                                  "%s_share.md" % info["current_series"])
            try:
                import subprocess as _sp
                r = _sp.run([sys.executable,
                             os.path.join(ROOT, "sandbox", "export_share.py"),
                             "--url", share_url, "--out", out_md,
                             "--port", str(CDP[ch]), "--wait", "8"],
                            capture_output=True, text=True, timeout=280, cwd=ROOT)
                print("    export_share rc=%d -> %s" % (r.returncode, out_md))
            except Exception as e:
                print("    export_share ERR: %r" % e)
        # Native path via rebirth_open.py (tested on B/C/D 2026-10-25).
        # Playwright send inside rebirth_cdp is unreliable on SPA.
        import subprocess as _spn
        out_json = os.path.join(ROOT, "logs", "rebirth", "open_%s_tmp.json" % ch)
        fill_text = "%s %s" % (info["next_series"], info["name"])
        try:
            _r = _spn.run([sys.executable,
                           os.path.join(ROOT, "sandbox", "rebirth_open.py"),
                           "--cdp", str(CDP[ch]),
                           "--fill", fill_text,
                           "--attach", act, prompt,
                           "--out", out_json],
                          capture_output=True, text=True, timeout=240, cwd=ROOT)
            print("    rebirth_open rc=%d" % _r.returncode)
            if _r.stdout:
                print("    open out: %s" % _r.stdout.strip()[:200])
        except Exception as _e:
            print("    rebirth_open ERR: %r" % _e)
            new_url = ""
            _op = {}
        else:
            try:
                _op = json.load(io.open(out_json, encoding="utf-8"))
            except Exception:
                _op = {}
            new_url = _op.get("url") or ""
        log = os.path.join(ROOT, "logs", "rebirth", "rebirth_log.jsonl")
        if not new_url:
            with io.open(log, "a", encoding="utf-8") as f:
                f.write(json.dumps({"ts": time.time(), "ch": ch,
                                    "old_series": info["current_series"],
                                    "new_series": info["next_series"],
                                    "old_chat": info.get("chat_url", ""),
                                    "new_url": "", "share": share_url or "",
                                    "result": "FAIL: rebirth_open no url"},
                                   ensure_ascii=False) + "\n")
            print("    !! rebirth_open no url - chat NOT created, table NOT advanced")
            return 6
        try:
            os.remove(out_json)
        except Exception:
            pass
        with io.open(log, "a", encoding="utf-8") as f:
            f.write(json.dumps({"ts": time.time(), "ch": ch,
                                "old_series": info["current_series"],
                                "new_series": info["next_series"],
                                "old_chat": info.get("chat_url", ""),
                                "new_url": new_url,
                                "share": share_url or "",
                                "result": "cycle done (native)"},
                               ensure_ascii=False) + "\n")
        print("    rebirth_log written")
        try:
            import subprocess as _sp2
            _sp2.run([sys.executable,
                      os.path.join(ROOT, "sandbox", "rebirth_table.py"),
                      "--channel", ch,
                      "--new-url", new_url or "",
                      "--share", share_url or ""],
                     capture_output=True, text=True, timeout=30, cwd=ROOT)
            print("    series_table advanced")
        except Exception as e:
            print("    series_table ERR: %r" % e)
        print("RESULT: cycle done, new chat %s" % new_url)
        return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A","B","C","D"])
    ap.add_argument("--dry-run", action="store_true", default=False)
    ap.add_argument("--live", action="store_true")
    a = ap.parse_args()
    live = a.live and not a.dry_run
    sys.exit(run(a.channel, live=live))


if __name__ == "__main__":
    main()