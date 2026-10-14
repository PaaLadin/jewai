"""session_progress — счётчик команд от старта серии.

Контракт: assistant/mnemonic_contract.md v1.2 (усиленный Б).
Решение: 3A (DCCA0012) + апрув C (DCCA0012.approve.md).

Логика:
  cmds_from_start = lastId_num - startId_num (для канала).
  Пороги — эмпирика по 2 наблюдениям:
    - 1A.5: 844 команд (обвал).
    - 2A:  1437 команд (обвал).
  Пороги работают ТОЛЬКО для канала A. У B/C/D наблюдений нет,
  лампа серая (нет данных).

Правила prefix-handler (3A, 23:20 + 23:30):
  1. Чужой префикс → null.
  2. lastId < start → 0.
  3. lastId >= end → 100 + session_overflow (устарело, см. ниже).
  4. Смена префикса внутри канала (AAAA→AAAB, BBAA→BBAB,
     CCAA→CCAB, DDAA→DDAB) → 0.
  5. None → null.
  6. Префикс совпадает, но lastId < start (сброс панели) → 0.

В варианте Б-усиленном "end" не нужен: считаем cmds_from_start,
пороги 500/800/1200 абсолютные, не от диапазона.
"""

# Пороги — эмпирика, только для A.
# 1A.5: 844 команд, 2A: 1437 команд.
RISK_WARN = 500   # жёлтый от
RISK_RED = 800    # красный от
RISK_ALARM = 1200  # мигание от

# Каналы, для которых риск-лампа работает (есть наблюдения).
CHANNELS_WITH_RISK = ("A",)

# Ожидаемые префиксы по каналам.
CHANNEL_PREFIXES = {
    "A": "AAAA",
    "B": "BBAA",
    "C": "CCAA",
    "D": "DDAA",
}


def parse_last_id(last_id_str):
    """'DDAA0803' -> (prefix, number) или None."""
    if not last_id_str or not isinstance(last_id_str, str):
        return None
    s = last_id_str.strip().upper()
    if len(s) < 8:
        return None
    pref = s[:4]
    digits = s[4:]
    if not digits.isdigit():
        return None
    return (pref, int(digits))


def risk_level(cmds, ch_key):
    """Уровень риска для канала.
    Возвращает: 'green' | 'yellow' | 'red' | 'alarm' | 'grey'.
    'grey' = нет данных (B/C/D без наблюдений).
    """
    if ch_key not in CHANNELS_WITH_RISK:
        return "grey"
    if cmds is None:
        return "grey"
    if cmds < RISK_WARN:
        return "green"
    if cmds < RISK_RED:
        return "yellow"
    if cmds < RISK_ALARM:
        return "red"
    return "alarm"


def compute_progress(last_id_str, start_id_str, ch_key):
    """Возвращает dict:
       {
         cmds_from_start: int | None,
         risk: 'green'|'yellow'|'red'|'alarm'|'grey',
         reason: 'ok'|'foreign_prefix'|'none'|'series_change'
                 |'panel_reset'|'no_start'|'no_channel'
       }
    start_id_str — начало текущей серии канала (например 'AAAA4000'
    для 3A). Если None — считаем, что start неизвестен.
    """
    expected = CHANNEL_PREFIXES.get(ch_key)
    if not expected:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_channel"}

    parsed_last = parse_last_id(last_id_str)
    if parsed_last is None:
        return {"cmds_from_start": None,
                "risk": risk_level(None, ch_key),
                "reason": "none"}

    pref_last, num_last = parsed_last

    # Правило 1 + 4: префикс не наш.
    if pref_last != expected:
        if pref_last[:3] == expected[:3]:
            return {"cmds_from_start": 0,
                    "risk": risk_level(0, ch_key),
                    "reason": "series_change"}
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "foreign_prefix"}

    # start не задан — считаем невозможным.
    if not start_id_str:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_start"}

    parsed_start = parse_last_id(start_id_str)
    if parsed_start is None:
        return {"cmds_from_start": None, "risk": "grey",
                "reason": "no_start"}

    pref_start, num_start = parsed_start
    if pref_start != expected:
        # start не той же серии — считаем смену.
        return {"cmds_from_start": 0, "risk": risk_level(0, ch_key),
                "reason": "series_change"}

    # Правило 2 и 6: lastId < start — сброс панели.
    if num_last < num_start:
        return {"cmds_from_start": 0, "risk": risk_level(0, ch_key),
                "reason": "panel_reset"}

    cmds = num_last - num_start
    return {"cmds_from_start": cmds, "risk": risk_level(cmds, ch_key),
            "reason": "ok"}


if __name__ == "__main__":
    # Кейсы.
    # A: 3A start = AAAA4000.
    # B/C/D: start = None (нет наблюдений, лампа grey).
    cases = [
        # A — риск работает
        ("AAAA4000", "AAAA4000", "A", 0, "green"),
        ("AAAA4300", "AAAA4000", "A", 300, "green"),
        ("AAAA4500", "AAAA4000", "A", 500, "yellow"),
        ("AAAA4700", "AAAA4000", "A", 700, "yellow"),
        ("AAAA4850", "AAAA4000", "A", 850, "red"),
        ("AAAA4950", "AAAA4000", "A", 950, "red"),
        ("AAAA5000", "AAAA4000", "A", 1000, "red"),
        ("AAAA5300", "AAAA4000", "A", 1300, "alarm"),
        # Смена серии
        ("AAAB0001", "AAAA4000", "A", 0, "green"),
        # Сброс панели
        ("AAAA0500", "AAAA4000", "A", 0, "green"),
        # None
        (None, "AAAA4000", "A", None, "grey"),
        # Чужой префикс
        ("BBAA0100", "AAAA4000", "A", None, "grey"),
        # B — нет риска, серая
        ("BBAA0500", None, "B", None, "grey"),
        ("BBAA0500", "BBAA0001", "B", 499, "grey"),
        # C — серая
        ("CCAA0400", "CCAA0001", "C", 399, "grey"),
        # D — серая
        ("DDAA0800", "DDAA0001", "D", 799, "grey"),
        # start отсутствует у A
        ("AAAA4500", None, "A", None, "grey"),
        # start чужой серии
        ("AAAA4500", "AAAB0001", "A", 0, "green"),
    ]
    ok = 0
    for lid, sid, ch, exp_c, exp_r in cases:
        r = compute_progress(lid, sid, ch)
        c_ok = r["cmds_from_start"] == exp_c
        r_ok = r["risk"] == exp_r
        mark = "OK" if (c_ok and r_ok) else "??"
        if mark == "OK":
            ok += 1
        print("%-10s start=%-10s %s -> cmds=%s risk=%s reason=%s [%s]" %
              (lid or "None", sid or "None", ch,
               r["cmds_from_start"], r["risk"], r["reason"], mark))
    print("\n%d/%d passed" % (ok, len(cases)))