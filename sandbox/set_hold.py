"""set_hold.py - включить/выключить hold-режим канала.
hold_<CH>.flag: порог 850 отключён, перерождение только по
переполнению чата (триггер №2) или force.
Usage: python sandbox/set_hold.py D on|off
"""
import io, os, sys, time
import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
FLAG_DIR = os.path.join(ROOT, "logs", "rebirth")

ch = sys.argv[1].upper()
mode = sys.argv[2].lower()
f = os.path.join(FLAG_DIR, "hold_%s.flag" % ch)
if mode == "on":
    with io.open(f, "w", encoding="utf-8") as fh:
        fh.write("hold set %s\n" % time.strftime("%Y-%m-%d %H:%M:%S"))
    print("HOLD ON for %s -> %s" % (ch, f))
else:
    try:
        os.remove(f)
        print("HOLD OFF for %s" % ch)
    except Exception:
        print("no hold flag for %s" % ch)