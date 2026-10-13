"""rebirth_table.py - обновление series_table.json после перерождения.
Корневой фикс 11A: rebirth_cdp/master НЕ обновляли таблицу ->
watchdog считал cmds от старого диапазона -> ложный триггер.

Usage:
  python sandbox/rebirth_table.py --channel A [--share URL] [--new-url URL]
"""
import argparse
import io
import json
import os
import re
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
TABLE = os.path.join(ROOT, "logs", "rebirth", "series_table.json")


def _inc_series(s):
    m = re.match(r"^(\d+)([A-Z])$", s or "")
    return "%d%s" % (int(m.group(1)) + 1, m.group(2)) if m else s


def _inc_range(rng):
    p = rng[0][:4]
    a = int(rng[0][4:])
    b = int(rng[1][4:])
    return ["%s%04d" % (p, a + 1000), "%s%04d" % (p, b + 1000)]


def update(ch, share_url=None, new_url=None):
    with io.open(TABLE, "r", encoding="utf-8") as f:
        tab = json.load(f)
    a = tab["channels"][ch]
    old = a["current_series"]
    a["current_series"] = a["next_series"]
    a["range"] = list(a["next_range"])
    a["next_series"] = _inc_series(a["current_series"])
    a["next_range"] = _inc_range(a["range"])
    a["last_id"] = a["range"][0]
    a["last_id_source"] = "rebirth_table %s" % time.strftime("%Y-%m-%d %H:%M")
    if new_url:
        a["chat_url"] = new_url
    if share_url:
        a["share_url"] = share_url
    with io.open(TABLE, "w", encoding="utf-8") as f:
        json.dump(tab, f, ensure_ascii=False, indent=2)
    # синхронизировать logs/session_<CH>.json (startId для /api/status)
    try:
        import subprocess as _sp
        _sp.run(["python", os.path.join(ROOT, "sandbox", "sync_session_start.py")],
                capture_output=True, text=True, timeout=30, cwd=ROOT)
    except Exception:
        pass
    return old, a["current_series"], a["range"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A", "B", "C", "D", "E", "F"])
    ap.add_argument("--share", default="")
    ap.add_argument("--new-url", default="")
    x = ap.parse_args()
    old, new, rng = update(x.channel, x.share or None, x.new_url or None)
    print("series_table %s: %s -> %s %s" % (x.channel, old, new, rng))


if __name__ == "__main__":
    main()