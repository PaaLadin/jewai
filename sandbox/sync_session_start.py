"""sync_session_start.py - синхронизирует logs/session_<CH>.json
из series_table.json (startId = range[0], session = current_series).
Убирает рассинхрон /api/status (startId) vs watchdog (series_table).
"""
import io, json, os, shutil, time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
TAB = os.path.join(ROOT, "logs", "rebirth", "series_table.json")
ts = time.strftime("%Y%m%d_%H%M%S")

with io.open(TAB, "r", encoding="utf-8") as f:
    tab = json.load(f)

for ch, info in tab["channels"].items():
    p = os.path.join(ROOT, "logs", "session_%s.json" % ch)
    old = {}
    if os.path.exists(p):
        try:
            with io.open(p, "r", encoding="utf-8") as f:
                old = json.load(f)
        except Exception:
            pass
        shutil.copy2(p, p + ".bak_sync_" + ts)
    new = {
        "start": info["range"][0],
        "session": info["current_series"],
        "note": "synced from series_table %s" % time.strftime("%Y-%m-%d %H:%M"),
    }
    with io.open(p, "w", encoding="utf-8") as f:
        json.dump(new, f, ensure_ascii=False)
    print("%s: %s -> %s" % (ch, old.get("start"), new["start"]))