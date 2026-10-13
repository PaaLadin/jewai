"""rebirth_ready.py — флаг готовности агента к перерождению.

Агент вызывает как op: run, когда завершил TODO/HANDOVER/PROMPT
и готов к смене поколения. Ставит флаг, который читает rebirth.py.

Usage:
  python sandbox/rebirth_ready.py --channel A
"""
import argparse
import io
import json
import os
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
FLAG_DIR = os.path.join(ROOT, "logs", "rebirth")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A", "B", "C", "D"])
    a = ap.parse_args()
    os.makedirs(FLAG_DIR, exist_ok=True)
    flag = os.path.join(FLAG_DIR, "ready_%s.json" % a.channel)
    data = {"channel": a.channel, "ts": time.time(),
            "iso": time.strftime("%Y-%m-%d %H:%M:%S")}
    with io.open(flag, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    print("REBIRTH-READY flag set: %s" % flag)


if __name__ == "__main__":
    main()