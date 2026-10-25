"""rebirth_onboard.py — онбординг новичка соседним каналом.

После активации нового агента выбирает соседа по правилу оператора:
  кандидат: lastId в диапазоне [start+050, start+800) — не в осмыслении
  начала серии и не на пороге ухода. Перебор по кругу.
  Одно перерождение за раз (rebirth.lock).

Usage:
  python sandbox/rebirth_onboard.py --newcomer D --new-url <url>
  python sandbox/rebirth_onboard.py --newcomer D --dry-run
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
def _load_cdp():
    try:
        with io.open(os.path.join(ROOT, "config.json"), "r", encoding="utf-8") as f:
            c = json.load(f)
        return {k: v["cdp"] for k, v in c["channels"].items()}
    except Exception:
        return {"A": 9222, "B": 9223, "C": 9224, "D": 9225}
CDP = _load_cdp()
TABLE = os.path.join(ROOT, "logs", "rebirth", "series_table.json")
PANEL = os.path.join(ROOT, "sandbox", "read_panel_state.py")
KICK = os.path.join(ROOT, "sandbox", "bridge_kick2.py")

ONBOARD_MSG = (
    "[SYS] Новый агент {new} в чате {url}.\n"
    "Задача: пообщаться, убедиться, что отвечает и разобрался с мостом.\n"
    "Если молчит >5 мин — пошли инструкцию: формат блок-команд, "
    "маркеры [X>Y], что читать в RAG (behavior_rules первым)."
)


def _probe(ch):
    try:
        r = subprocess.run([sys.executable, PANEL, str(CDP[ch])],
                           capture_output=True, text=True, timeout=30, cwd=ROOT)
        m = re.search(r"lastId\s+([A-Z]{4})(\d{4})", (r.stdout or "") + (r.stderr or ""))
        if not m:
            return None, None
        return m.group(1), int(m.group(2))
    except Exception:
        return None, None


def pick_neighbor(newcomer, table):
    """Перебор по кругу: A->B->C->D. Кандидат: 050 <= num < 800."""
    order = ["A", "B", "C", "D"]
    if newcomer in order:
        i = order.index(newcomer)
        order = order[i+1:] + order[:i]
    for ch in order:
        pref, num = _probe(ch)
        if num is None:
            continue
        # позиция ВНУТРИ серии (блок 1000), не абсолютное число
        pos = num % 1000
        if 50 <= pos < 800:
            return ch, pref, pos
    return None, None, None


def run(newcomer, new_url, dry=False):
    with io.open(TABLE, "r", encoding="utf-8") as f:
        table = json.load(f)
    ch, pref, num = pick_neighbor(newcomer, table)
    if not ch:
        print("нет кандидата-соседа (все либо <050, либо >=800)")
        return 2
    print("сосед: %s (lastId %s%04d)" % (ch, pref, num))
    msg = ONBOARD_MSG.format(new=table["channels"][newcomer]["current_series"],
                             url=new_url or "(url неизвестен)")
    if dry:
        print("--- dry ---")
        print(msg)
        return 0
    p = subprocess.run([sys.executable, KICK, "--port", str(CDP[ch]),
                        "--text", msg, "--wait-empty", "5"],
                       capture_output=True, text=True, timeout=30, cwd=ROOT)
    print("kick ->", ch, ":", (p.stdout or p.stderr or "").strip()[:120])
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--newcomer", required=True, choices=["A","B","C","D"])
    ap.add_argument("--new-url", default=None)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    sys.exit(run(a.newcomer, a.new_url, dry=a.dry_run))


if __name__ == "__main__":
    main()