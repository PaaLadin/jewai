"""rebirth.py — ядро автоматического перерождения агента.

Проверяет готовность (чеклист mtime), при --dry-run печатает план,
при реальном запуске выполняет CDP-цикл (селекторы — TODO).

Usage:
  python sandbox/rebirth.py --channel A --dry-run
  python sandbox/rebirth.py --channel A            # реальный (позже)
"""
import argparse
import io
import json
import os
import sys
import time

import sys as _sys, os as _os
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from portable_root import find_root
ROOT = find_root(__file__)
FLAG_DIR = os.path.join(ROOT, "logs", "rebirth")
TABLE = os.path.join(FLAG_DIR, "series_table.json")
LOCK = os.path.join(FLAG_DIR, "rebirth.lock")


def _mtime(path):
    try:
        return os.path.getmtime(path)
    except Exception:
        return None


def load_table():
    with io.open(TABLE, "r", encoding="utf-8") as f:
        return json.load(f)


def check_ready(ch, table):
    """Чеклист: TODO, HANDOVER, PROMPT следующей серии, SESSION_STATE.
    Все mtime должны быть позже последнего напоминания (warn/critical)."""
    info = table["channels"][ch]
    ns = info["next_series"]
    log_dir = os.path.join(ROOT, "logs", ch)

    checks = []
    # последнее напоминание warn/critical для канала
    reminders = os.path.join(FLAG_DIR, "reminders.jsonl")
    last_rem = 0
    if os.path.exists(reminders):
        with io.open(reminders, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    j = json.loads(line)
                except Exception:
                    continue
                if j.get("ch") == ch and j.get("level") in ("warn", "critical"):
                    last_rem = max(last_rem, j.get("ts", 0))

    files = {
        "TODO.md": os.path.join(log_dir, "TODO.md"),
        "HANDOVER.md": os.path.join(log_dir, "HANDOVER.md"),
        "PROMPT_%s.md" % ns: os.path.join(ROOT, "emergency", "PROMPT_%s.md" % ns),
        "SESSION_STATE.md": os.path.join(ROOT, "SESSION_STATE.md"),
    }
    for name, path in files.items():
        mt = _mtime(path)
        if mt is None:
            checks.append((name, "MISSING", None))
            continue
        if last_rem and mt < last_rem:
            checks.append((name, "STALE (старше напоминания)", mt))
            continue
        # доп. проверка содержимого для HANDOVER и PROMPT:
        # должны упоминать целевую серию (next), не только текущую
        if name == "HANDOVER.md" or name.startswith("PROMPT_"):
            try:
                with io.open(path, "r", encoding="utf-8", errors="replace") as f:
                    txt = f.read()
            except Exception:
                txt = ""
            has_next = ns in txt
            has_cur = info["current_series"] in txt
            # если файл упоминает только текущую серию и не целевую — подозрительно
            if not has_next:
                checks.append((name, "STALE_CONTENT (нет %s)" % ns, mt))
                continue
        checks.append((name, "OK", mt))
    return checks, last_rem


def acquire_lock(ch):
    if os.path.exists(LOCK):
        with io.open(LOCK, "r", encoding="utf-8") as f:
            d = json.load(f)
        if time.time() - d.get("ts", 0) < 3600:
            return False, d
    with io.open(LOCK, "w", encoding="utf-8") as f:
        json.dump({"ch": ch, "ts": time.time()}, f)
    return True, {"ch": ch}


def release_lock():
    try:
        os.remove(LOCK)
    except Exception:
        pass


def run(ch, dry=True):
    table = load_table()
    if ch not in table["channels"]:
        print("unknown channel: %s" % ch)
        return 2

    # флаг готовности
    flag = os.path.join(FLAG_DIR, "ready_%s.json" % ch)
    if not os.path.exists(flag):
        print("НЕТ флага готовности %s (агент не дал REBIRTH-READY)" % flag)
        return 3
    with io.open(flag, "r", encoding="utf-8") as f:
        fj = json.load(f)

    checks, last_rem = check_ready(ch, table)
    print("=== чеклист %s (ready ts=%s) ===" % (ch, fj.get("iso")))
    ok = True
    for name, status, mt in checks:
        mark = "OK " if status == "OK" else "!! "
        print("  %s%s: %s" % (mark, name, status))
        if status != "OK":
            ok = False

    info = table["channels"][ch]
    print("=== план ===")
    print("  старый чат: %s (%s)" % (ch, info["last_id"]))
    print("  архивация: share -> export_share.py -> logs/%s/conversations/" % ch)
    print("  новый чат: %s %s" % (info["next_series"], info["name"]))
    print("  файлы: 0_ACTIVATION (подставить плейсхолдеры) + PROMPT_%s" % info["next_series"])
    print("  онбордер: перебор, кандидат id 050+..<800")

    if not ok:
        print("РЕЗУЛЬТАТ: НЕ ГОТОВ (есть MISSING/STALE)")
        return 4
    if dry:
        print("РЕЗУЛЬТАТ: dry-run OK, план валиден. Реального запуска нет.")
        return 0

    got, d = acquire_lock(ch)
    if not got:
        print("LOCK занят: %s" % d)
        return 5
    try:
        print("РЕАЛЬНЫЙ ЦИКЛ — TODO (CDP-селекторы). Заглушка.")
        # TODO: CDP-цикл (новый чат, файлы, отправка)
        return 0
    finally:
        release_lock()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, choices=["A","B","C","D","E","F"])
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    sys.exit(run(a.channel, dry=a.dry_run))


if __name__ == "__main__":
    main()