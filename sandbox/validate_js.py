"""Грубая валидация JS: баланс скобок вне строк/комментариев + проверка паттернов."""
import sys
from pathlib import Path

def strip_strings_comments(src):
    out = []
    i = 0
    n = len(src)
    while i < n:
        c = src[i]
        # line comment
        if c == "/" and i + 1 < n and src[i+1] == "/":
            while i < n and src[i] != "\n":
                i += 1
            continue
        # block comment
        if c == "/" and i + 1 < n and src[i+1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i+1] == "/"):
                i += 1
            i += 2
            continue
        # strings
        if c in ("'", '"', "`"):
            q = c
            i += 1
            while i < n:
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == q:
                    i += 1
                    break
                i += 1
            continue
        out.append(c)
        i += 1
    return "".join(out)

def check_balance(path):
    src = Path(path).read_text(encoding="utf-8")
    clean = strip_strings_comments(src)
    pairs = {"(": ")", "[": "]", "{": "}"}
    stack = []
    for idx, ch in enumerate(clean):
        if ch in pairs:
            stack.append((ch, idx))
        elif ch in pairs.values():
            if not stack:
                return f"{path}: unmatched {ch} at {idx}"
            op, _ = stack.pop()
            if pairs[op] != ch:
                return f"{path}: mismatched {op}...{ch} at {idx}"
    if stack:
        op, idx = stack[-1]
        return f"{path}: unclosed {op} at {idx}"
    return None

def check_patterns(path, patterns):
    txt = Path(path).read_text(encoding="utf-8")
    print(f"\n=== {path} ({len(txt)} chars) ===")
    ok = True
    for label, pat, expect in patterns:
        present = pat in txt
        good = present == expect
        print(f"  [{'OK' if good else 'FAIL'}] {label}: {'found' if present else 'absent'}")
        if not good: ok = False
    return ok

err_bg = check_balance(str(ROOT / "sandbox" / "bg_patched.js"))
err_ct = check_balance(str(ROOT / "sandbox" / "ct_patched.js"))
print("balance bg:", err_bg or "OK")
print("balance ct:", err_ct or "OK")

ok = True
ok &= check_patterns(str(ROOT / "sandbox" / "bg_patched.js"), [
    ("lastIds in DEFAULTS", "lastIds: {}", True),
    ("pushLedger prefix", "const pref = (entry.id || \"\").slice(0, 4);", True),
    ("skip by prefix", "lastForPref", True),
    ("old global cmp in skip (removed)", "cmpId(a.id, s.lastId) <= 0", False),
    ("reset clears lastIds", 'lastId: "", lastIds: {},', True),
])
ok &= check_patterns(str(ROOT / "sandbox" / "ct_patched.js"), [
    ("freshOnly no lastId check", "a.id !== st.lastId", False),
    ("freshOnly has recentlySentIds", "recentlySentIds.has(a.id)", True),
    ("freshOnly has ledger check", "(st.ledger || []).some", True),
])

sys.exit(0 if (ok and not err_bg and not err_ct) else 1)