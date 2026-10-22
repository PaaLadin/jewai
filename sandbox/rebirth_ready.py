"""rebirth_ready.py — флаг готовности агента к перерождению.

БАРЬЕР (12A, 14.10): флаг ставится ТОЛЬКО если:
  - чат переполнен (limit_hit, триггер №2), ИЛИ
  - cmds >= 850 (порог).
Иначе ОТКАЗ. В hold при cmds<850 — отказ («работай до переполнения»).
Причина: агент ставил ready на 500/700, что преждевременно (500/700 —
только «готовь артефакты, продолжай работу»).

Usage:
  python sandbox/rebirth_ready.py --channel A
  python sandbox/rebirth_ready.py --channel D --force-note "dosis до лимита"
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
FLAG_DIR = os.path.join(ROOT, "logs", "rebirth")
THRESHOLD = 850


def _cdp(ch):
    try:
        with io.open(os.path.join(ROOT, "config.json"), "r", encoding="utf-8") as f:
            cfg = json.load(f)
        return int(cfg["channels"].get(ch, {}).get("cdp", 0))
    except Exception:
        return {"A": 9222, "B": 9223, "C": 9224, "D": 9225,
                "E": 9226, "F": 9227}.get(ch, 0)


def _cmds(ch):
    cdp = _cdp(ch)
    if not cdp:
        return None, False
    cmds = None
    limit = False
    try:
        r = subprocess.run([sys.executable,
                            os.path.join(ROOT, "sandbox", "read_panel_state2.py"),
                            str(cdp)],
                           capture_output=True, text=True, timeout=30, cwd=ROOT)
        m = re.search(r"lastId\s+([A-Z]{4})(\d{4})", (r.stdout or "") + (r.stderr or ""))
        if m:
            with io.open(os.path.join(ROOT, "logs", "rebirth", "series_table.json"),
                         "r", encoding="utf-8") as f:
                tab = json.load(f)
            start = int(tab["channels"][ch]["range"][0][4:])
            cmds = int(m.group(2)) - start
    except Exception:
        pass
    try:
        rl = subprocess.run([sys.executable,
                             os.path.join(ROOT, "sandbox", "chat_limit.py"),
                             "--port", str(cdp)],
                            capture_output=True, text=True, timeout=30, cwd=ROOT)
        if "LIMIT" in (rl.stdout or ""):
            limit = True
    except Exception:
        pass
    return cmds, limit


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A", "B", "C", "D", "E", "F"])
    ap.add_argument("--force-note", default="")
    ap.add_argument("--check-only", action="store_true")
    a = ap.parse_args()
    ch = a.channel
    cmds, limit = _cmds(ch)
    hold = os.path.exists(os.path.join(FLAG_DIR, "hold_%s.flag" % ch))

    if limit:
        verdict = "OK (limit/переполнение)"
    elif cmds is not None and cmds >= THRESHOLD:
        verdict = "OK (cmds=%d >= %d)" % (cmds, THRESHOLD)
    elif hold:
        verdict = "ОТКАЗ: hold, cmds=%s < %d — работай до переполнения" % (cmds, THRESHOLD)
    else:
        verdict = "ОТКАЗ: cmds=%s < %d — рано, готовь артефакты и работай" % (cmds, THRESHOLD)

    ok = verdict.startswith("OK")
    print("[rebirth_ready] ch=%s cmds=%s limit=%s hold=%s -> %s"
          % (ch, cmds, limit, hold, verdict))
    if a.check_only:
        return 0 if ok else 1
    if not ok:
        print("[rebirth_ready] флаг НЕ выставлен.")
        return 1

    os.makedirs(FLAG_DIR, exist_ok=True)
    flag = os.path.join(FLAG_DIR, "ready_%s.json" % ch)
    data = {"channel": ch, "ts": time.time(),
            "iso": time.strftime("%Y-%m-%d %H:%M:%S"),
            "cmds": cmds, "limit": limit, "note": a.force_note}
    with io.open(flag, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print("[rebirth_ready] REBIRTH-READY flag set: %s" % flag)
    return 0


if __name__ == "__main__":
    sys.exit(main())