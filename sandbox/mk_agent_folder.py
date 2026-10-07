"""mk_agent_folder.py — создаёт структуру папок для агента или оператора.

Использование:
  python sandbox/mk_agent_folder.py A         # А/Аркадий
  python sandbox/mk_agent_folder.py B         # B/Борис
  python sandbox/mk_agent_folder.py C         # C/Семён
  python sandbox/mk_agent_folder.py D         # D/Димон
  python sandbox/mk_agent_folder.py operator  # папка оператора

Не перезаписывает существующие файлы. Только создаёт недостающие.
"""
import sys as _sys, io as _io
try:
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass
import sys, time
from pathlib import Path

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE

ROLES = {
    "A": {"name": "A (Аркадий) — ведущий",  "dir": ROOT / "logs" / "A"},
    "B": {"name": "B (Борис) — помощник",   "dir": ROOT / "logs" / "B"},
    "C": {"name": "C (Семён) — хранитель",  "dir": ROOT / "logs" / "C"},
    "D": {"name": "D (Димон) — тестер",     "dir": ROOT / "logs" / "D"},
    "operator": {"name": "Оператор",        "dir": ROOT / "operator"},
}

DDAY = time.strftime("%Y-%m")

README_AGENT = """# Логи канала {name}

Три файла, которые надо вести:

- `{dday}.md` — дневник: что делал сегодня, хронология, наблюдения.
  Дописывать в конец, не перезаписывать.
- `TODO.md` — список задач. Отмечать [ ] / [x].
- `NOTES.md` — долгие заметки по проекту.

Для длинных разборов — папка `sessions/`.

**Правило:** каждая задача начинается с записи в TODO.md,
каждый шаг — строка в дневник {dday}.md.
По завершении задачи — [x] в TODO и итог в дневник.

Создано автоскриптом mk_agent_folder.py (2026-10-04).
"""

TODO_TPL = """# TODO — {name}

Формат: `[ ]` — открыто, `[x]` — сделано, `[!]` — блокер.

## Активные

- [ ] (пусто)

## Сделано

(пусто)
"""

NOTES_TPL = """# NOTES — {name}

Долгие заметки, контекст, ссылки.

(пусто)
"""

DAY_TPL = """# Дневник {name} — {dday}

## {dday}-XX

(пусто)
"""

README_OPERATOR = """# Папка оператора

Что здесь:
- `inbox.md` — активные задачи оператора к агентам.
- `journal/YYYY-MM-DD.md` — ежедневные записи.
- `tasks/<task_id>.md` — разбор конкретной задачи.
- `replies/YYYY-MM-DD.md` — ответы агентов на запросы оператора.
  Сюда сохраняем ВСЁ, чтобы не терялось при перезапуске чата.

Создано автоскриптом mk_agent_folder.py (2026-10-04).
"""

INBOX_TPL = """# Inbox оператора

Активные задачи. Одна строка — одна задача.

- [ ] (пусто)
"""


def ensure(p: Path, content: str = ""):
    if p.exists():
        return False
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return True


def make_agent(role: str, spec: dict):
    d = spec["dir"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "sessions").mkdir(exist_ok=True)
    name = spec["name"]
    created = []
    if ensure(d / "README.md", README_AGENT.format(name=name, dday=DDAY)): created.append("README.md")
    if ensure(d / "TODO.md",   TODO_TPL.format(name=name)):              created.append("TODO.md")
    if ensure(d / "NOTES.md",  NOTES_TPL.format(name=name)):             created.append("NOTES.md")
    if ensure(d / (DDAY + ".md"), DAY_TPL.format(name=name, dday=DDAY)): created.append(DDAY + ".md")
    print("folder:", d)
    if created:
        print("created:", ", ".join(created))
    else:
        print("all files exist")


def make_operator():
    d = ROOT / "operator"
    d.mkdir(parents=True, exist_ok=True)
    (d / "journal").mkdir(exist_ok=True)
    (d / "tasks").mkdir(exist_ok=True)
    (d / "replies").mkdir(exist_ok=True)
    created = []
    if ensure(d / "README.md", README_OPERATOR): created.append("README.md")
    if ensure(d / "inbox.md", INBOX_TPL):        created.append("inbox.md")
    # today's journal
    day = time.strftime("%Y-%m-%d")
    if ensure(d / "journal" / (day + ".md"), "# Журнал оператора — " + day + "\n\n(пусто)\n"):
        created.append("journal/" + day + ".md")
    if ensure(d / "replies" / (day + ".md"), "# Ответы агентов — " + day + "\n\n(пусто)\n"):
        created.append("replies/" + day + ".md")
    print("folder:", d)
    if created:
        print("created:", ", ".join(created))
    else:
        print("all files exist")


def main():
    if len(sys.argv) < 2:
        print("usage: mk_agent_folder.py <A|B|C|D|operator>")
        sys.exit(1)
    role = sys.argv[1]
    if role == "operator":
        make_operator()
        return
    if role not in ROLES:
        print("unknown role:", role)
        sys.exit(2)
    make_agent(role, ROLES[role])


if __name__ == "__main__":
    main()