"""rebirth_master.py — мастер-цикл перерождения (фаза 7).

Связывает: флаг REBIRTH-READY -> чеклист -> CDP-цикл -> онбординг.
Одно перерождение за раз (rebirth.lock). По умолчанию dry-run.

Usage:
  python sandbox/rebirth_master.py --channel D --dry-run
  python sandbox/rebirth_master.py --channel D --live
"""
import argparse
import io
import json
import os
import subprocess
import sys
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
PY = sys.executable
FLAG_DIR = os.path.join(ROOT, "logs", "rebirth")
LOCK = os.path.join(FLAG_DIR, "rebirth.lock")


def _run(args, timeout=120):
    p = subprocess.run([PY] + args, capture_output=True, text=True,
                       timeout=timeout, cwd=ROOT)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def acquire_lock(ch):
    if os.path.exists(LOCK):
        try:
            with io.open(LOCK, "r", encoding="utf-8") as f:
                d = json.load(f)
            if time.time() - d.get("ts", 0) < 3600:
                return False, d
        except Exception:
            pass
    with io.open(LOCK, "w", encoding="utf-8") as f:
        json.dump({"ch": ch, "ts": time.time()}, f)
    return True, {"ch": ch}


def release_lock():
    try:
        os.remove(LOCK)
    except Exception:
        pass


def master(ch, live=False):
    print("=== rebirth_master %s (live=%s) ===" % (ch, live))

    # 1. флаг готовности
    flag = os.path.join(FLAG_DIR, "ready_%s.json" % ch)
    if not os.path.exists(flag):
        print("[1] нет флага REBIRTH-READY (%s)" % flag)
        return 3
    print("[1] флаг готовности есть")

    # --- ПОРОГ-ГЕЙТ (фикс 11A 13.10): не перерождать раньше 850.
    #     ИСКЛЮЧЕНИЕ: если чат переполнен ("Предел длины") — перерождаем
    #     независимо от cmds (иначе агент встанет: чат мёртв, порога нет).
    force = os.path.join(FLAG_DIR, "force_%s.flag" % ch)
    import re as _re
    cmds = None
    limit_hit = False
    cdp = 9222
    try:
        with io.open(os.path.join(ROOT, "config.json"), "r", encoding="utf-8") as _cf:
            _cfg = json.load(_cf)
        cdp = int(_cfg["channels"].get(ch, {}).get("cdp", 9222))
    except Exception:
        cdp = {"A":9222,"B":9223,"C":9224,"D":9225}.get(ch, 9222)

    try:
        r = _spr_run = subprocess.run(
            [PY, os.path.join(ROOT, "sandbox", "read_panel_state2.py"), str(cdp)],
            capture_output=True, text=True, timeout=30, cwd=ROOT)
        txt = (r.stdout or "") + (r.stderr or "")
        m = _re.search(r"lastId\s+([A-Z]{4})(\d{4})", txt)
        if m:
            with io.open(os.path.join(ROOT, "logs", "rebirth", "series_table.json"),
                         "r", encoding="utf-8") as _f:
                _tab = json.load(_f)
            _start = int(_tab["channels"][ch]["range"][0][4:])
            cmds = int(m.group(2)) - _start
        # детект переполнения чата (триггер №2) — читаем ТЕКСТ ЧАТА
        try:
            rl = subprocess.run(
                [PY, os.path.join(ROOT, "sandbox", "chat_limit.py"),
                 "--port", str(cdp)],
                capture_output=True, text=True, timeout=30, cwd=ROOT)
            if "LIMIT" in (rl.stdout or ""):
                limit_hit = True
        except Exception:
            pass
    except Exception as _e:
        print("    [gate] cmds probe ERR: %r" % _e)

    hold = os.path.join(FLAG_DIR, "hold_%s.flag" % ch)
    if limit_hit:
        print("    [gate] ЧАТ ПЕРЕПОЛНЕН (триггер №2) — порог игнорируется, перерождаем.")
    elif os.path.exists(force):
        print("    [gate] force-флаг есть — перерождаем (cmds=%s)" % cmds)
        try:
            os.remove(force)
        except Exception:
            pass
    elif os.path.exists(hold):
        print("    [gate] HOLD-режим: порог 850 ОТКЛЮЧЁН (cmds=%s)." % cmds)
        print("    [gate] Ждём переполнения чата (триггер №2) или force.")
        # не перерождаем; снимаем ready, чтобы не спамить (watchdog
        # поставит ready сам при переполнении чата)
        try:
            os.remove(flag)
            print("    flag removed (hold): %s" % flag)
        except Exception:
            pass
        return 8
    elif cmds is not None and cmds < 850:
        print("    [gate] cmds=%d < 850, перерождение ОТКЛОНЕНО." % cmds)
        print("    [gate] для принудительного: создай %s" % force)
        print("    [gate] ИЛИ дождись переполнения чата (триггер №2).")
        # флаг НЕ удаляем — агент доработает и поставит заново
        return 7
    else:
        print("    [gate] cmds=%s >= 850, порог пройден" % cmds)

    def _rm_flag():
        try:
            os.remove(flag)
            print("    flag removed: %s" % flag)
        except Exception:
            pass

    # 2. чеклист (rebirth.py --dry-run)
    rc, out = _run(["sandbox/rebirth.py", "--channel", ch, "--dry-run"])
    print("[2] чеклист rc=%d" % rc)
    for line in out.splitlines():
        if line.strip():
            print("    " + line)
    if rc != 0:
        print("    ЧЕКЛИСТ НЕ ПРОЙДЕН, стоп")
        _rm_flag()
        return 4

    if not live:
        print("[3] dry-run: CDP-цикл пропущен")
        print("[4] dry-run: онбординг пропущен")
        print("РЕЗУЛЬТАТ: план валиден. Боевого запуска нет.")
        return 0

    # 3. lock
    got, d = acquire_lock(ch)
    if not got:
        print("[3] LOCK занят: %s" % d)
        return 5
    try:
        # 4. CDP-цикл (share + новый чат + активация)
        rc, out = _run(["sandbox/rebirth_cdp.py", "--channel", ch, "--live"],
                       timeout=300)
        print("[4] CDP-цикл rc=%d" % rc)
        for line in out.splitlines():
            print("    " + line)
        if rc != 0:
            return rc

        # 5b. вытащить new_url из последней записи rebirth_log (пишет cdp)
        new_url = ""
        jr = os.path.join(FLAG_DIR, "rebirth_log.jsonl")
        try:
            with io.open(jr, "r", encoding="utf-8") as f:
                lines = [l for l in f if l.strip()]
            for l in reversed(lines):
                j = json.loads(l)
                if j.get("ch") == ch and j.get("new_url"):
                    new_url = j["new_url"]; break
        except Exception:
            pass

        # 5. онбординг (с URL нового чата)
        args = ["sandbox/rebirth_onboard.py", "--newcomer", ch]
        if new_url:
            args += ["--new-url", new_url]
        rc, out = _run(args)
        print("[5] онбординг rc=%d" % rc)
        for line in out.splitlines():
            print("    " + line)
        print("РЕЗУЛЬТАТ: цикл выполнен.")
        return 0
    finally:
        _rm_flag()
        release_lock()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A","B","C","D"])
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--live", action="store_true")
    a = ap.parse_args()
    sys.exit(master(a.channel, live=a.live and not a.dry_run))


if __name__ == "__main__":
    main()