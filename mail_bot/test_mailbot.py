# -*- coding: utf-8 -*-
"""Тесты mail_bot: парсинг Subject, whitelist, состояние."""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mail_bot as mb

PASS = 0
FAIL = 0


def t(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("  OK ", name)
    else:
        FAIL += 1
        print("  FAIL", name)


# 1. Regex маркера
print("[1] Subject marker parsing")
t("[A] x", mb.RE_SUBJ.match("[A] test") and mb.RE_SUBJ.match("[A] test").group(1) == "A")
t("[B] x", mb.RE_SUBJ.match("[B] task").group(1) == "B")
t("[C] x", mb.RE_SUBJ.match("[C] task").group(1) == "C")
t("[D] x", mb.RE_SUBJ.match("[D] task").group(1) == "D")
t("[ALL] x", mb.RE_SUBJ.match("[ALL] broadcast").group(1).upper() == "ALL")
t("[a] lowercase", mb.RE_SUBJ.match("[a] test").group(1).upper() == "A")
t("prefix spaces", mb.RE_SUBJ.match("  [B]  hello  ").group(1) == "B")
t("no marker -> None", mb.RE_SUBJ.match("Hello no marker") is None)
t("body captured", mb.RE_SUBJ.match("[A] hello world").group(2) == "hello world")

# Проверка срезания префиксов
print("[1b] Re:/Fwd:/AUTO")
def _parse(s):
    if "[AUTO]" in s.upper():
        return None
    s2 = s.strip()
    prefixes = ("re:", "re :", "fw:", "fwd:", "пере:", "на:", "[auto]")
    ch = True
    while ch:
        ch = False
        low = s2.lower()
        for pref in prefixes:
            if low.startswith(pref):
                s2 = s2[len(pref):].strip(); ch = True; break
    m = mb.RE_SUBJ.match(s2)
    return m.group(1).upper() if m else None
t("Re: [A]", _parse("Re: [A] x") == "A")
t("Re: Re: [A]", _parse("Re: Re: [A] x") == "A")
t("Re: Re: Re: [A]", _parse("Re: Re: Re: [A] x") == "A")
t("[AUTO] ignored", _parse("[AUTO] Re: [A] x") is None)
t("[auto] ignored", _parse("[auto] Re: [A] x") is None)
t("Fwd: [B]", _parse("Fwd: [B] x") == "B")

# 2. decode_header
print("[2] decode_header")
t("plain", mb.decode_header("Hello") == "Hello")
t("utf8", "привет" in mb.decode_header("=?UTF-8?B?0L/RgNC40LLQtdGC?="))
t("empty", mb.decode_header(None) == "")

# 3. imap_host_from_smtp
print("[3] imap_host")
t("yandex", mb.imap_host_from_smtp("smtp.yandex.ru") == "imap.yandex.ru")
t("gmail", mb.imap_host_from_smtp("smtp.gmail.com") == "imap.gmail.com")

# 4. state load/save
print("[4] state")
with tempfile.TemporaryDirectory() as td:
    old = mb.STATE_FILE
    mb.STATE_FILE = Path(td) / "last_uid.json"
    t("default 0", mb.load_state().get("last_uid") == 0)
    mb.save_state({"last_uid": 42})
    t("roundtrip", mb.load_state().get("last_uid") == 42)
    mb.STATE_FILE = old

# 5. whitelist
print("[5] whitelist")
t("uncle@naben.ru in", "uncle@naben.ru" in mb.WHITELIST)
t("stranger not in", "stranger@example.com" not in mb.WHITELIST)
t("paaladin@yandex.ru NOT in (narrow)", "paaladin@yandex.ru" not in mb.WHITELIST)
t("size=1", len(mb.WHITELIST) == 1)
print("[5b] operator emails (для ответа)")
t("uncle in reply", "uncle@naben.ru" in mb.OPERATOR_EMAILS)
t("paaladin yandex in reply", "paaladin@yandex.ru" in mb.OPERATOR_EMAILS)
t("paaladin paaladin in reply", "paaladin@paaladin.ru" in mb.OPERATOR_EMAILS)

# 6. CDP ports
print("[6] CDP ports")
t("A=9222", mb.CDP["A"] == 9222)
t("D=9225", mb.CDP["D"] == 9225)

# 7. queue functions exist
print("[7] queue")
t("queue_add", callable(getattr(mb, "queue_add", None)))
t("queue_process", callable(getattr(mb, "queue_process", None)))

print("")
print("PASS=%d FAIL=%d" % (PASS, FAIL))
sys.exit(0 if FAIL == 0 else 1)