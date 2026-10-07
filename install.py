"""install.py — установщик jewai (DeepSeek Local Agent Bridge).

Разворачивает проект в произвольную папку по варианту А:
всё (логи, runtime, chrome-профили) — внутри папки установки.
Ничего не пишется вне <root>, кроме ярлыка на рабочем столе
(спрашивается отдельно).

Идемпотентен: повторный запуск не ломает существующую установку.
"""
import json
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

LETTERS = "ABCDEFGHIJ"
HERE = Path(__file__).resolve().parent

# Что копировать из исходника в установку (целиком)
COPY_DIRS = ["sandbox", "extension", "launchers", "emergency",
             "rag", "templates"]

# Что копировать из корня (по файлам)
COPY_FILES = ["README.md", "ARCHITECTURE.md", "PROTOCOL.md",
              "INSTALL.md", "AGENT_SETUP.md", "CONTRIBUTING.md",
              "CHANGELOG.md", "DEVLOG.md", "LICENSE", "VERSION",
              "requirements.txt", "config.example.json",
              ".gitignore", ".agent_token.example",
              "jewai.ico", "social_preview.png"]

# Что не копировать даже внутри dirs
SKIP_PATTERNS = ("__pycache__", ".bak", ".pyc", ".agent_token",
                 ".secrets", "chrome-", "runtime/", "logs/")


def ask(prompt, default):
    v = input(f"{prompt} [{default}]: ").strip()
    return v or default


def ask_int(prompt, default, lo, hi):
    while True:
        v = input(f"{prompt} [{default}]: ").strip()
        if not v:
            return default
        try:
            n = int(v)
            if lo <= n <= hi:
                return n
        except ValueError:
            pass
        print(f"  число от {lo} до {hi}")


def ask_yes(prompt, default="y"):
    d = "Y/n" if default == "y" else "y/N"
    v = input(f"{prompt} [{d}]: ").strip().lower()
    if not v:
        return default == "y"
    return v in ("y", "yes", "д", "да")


def skip(p: Path) -> bool:
    s = str(p).lower()
    return any(x in s for x in SKIP_PATTERNS)


def copy_tree(src: Path, dst: Path):
    n = 0
    for item in src.rglob("*"):
        if not item.is_file():
            continue
        if skip(item):
            continue
        rel = item.relative_to(src)
        t = dst / rel
        t.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, t)
        n += 1
    return n



def install_deps():
    """Устанавливает Python-зависимости и браузер Playwright.
    Спрашивает подтверждение. Не падает, если pip недоступен.
    """
    req = HERE / "requirements.txt"
    if not req.exists():
        print("  requirements.txt не найден — пропускаю установку зависимостей.")
        return True
    if not ask_yes("Установить Python-зависимости (pip install)?", "y"):
        print("  пропущено — поставь вручную: pip install -r requirements.txt")
        return False
    print()
    try:
        r = subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(req)],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=600)
        if r.returncode != 0:
            print("  pip вернул ошибку:")
            print("  " + (r.stderr or "")[-400:].replace("\n", "\n  "))
            return False
        print("  Python-зависимости установлены.")
    except Exception as e:
        print(f"  ошибка pip: {e!r}")
        return False

    if ask_yes("Скачать браузер для Playwright (chromium)?", "y"):
        print()
        try:
            r = subprocess.run(
                [sys.executable, "-m", "playwright", "install", "chromium"],
                capture_output=True, text=True, encoding="utf-8",
                errors="replace", timeout=900)
            if r.returncode != 0:
                print("  playwright install вернул ошибку:")
                print("  " + (r.stderr or "")[-400:].replace("\n", "\n  "))
            else:
                print("  Playwright chromium установлен.")
        except Exception as e:
            print(f"  ошибка playwright: {e!r}")
    return True


def open_install_guide(root):
    """Открывает INSTALL.md в блокноте — оператору для Chrome-шагов."""
    guide = root / "INSTALL.md"
    if not guide.exists():
        guide = HERE / "INSTALL.md"
    if not guide.exists():
        return
    try:
        if sys.platform == "win32":
            subprocess.Popen(["notepad.exe", str(guide)],
                             creationflags=subprocess.CREATE_NO_WINDOW)
            print(f"  Инструкция открыта: {guide}")
        else:
            print(f"  Инструкция: {guide}")
    except Exception as e:
        print(f"  не открыть инструкцию: {e!r}")



def main():
    print("=" * 60)
    print(" JewAI — установка DeepSeek Local Agent Bridge")
    print("=" * 60)

    # 0. Зависимости
    install_deps()

    default_root = str(Path.home() / "jewai")
    root = Path(ask("Папка установки", default_root)).resolve()
    n = ask_int("Сколько каналов-агентов (1-10)", 1, 1, 10)
    base_port = ask_int("Базовый порт агентов", 8760, 1024, 60000)
    proxy_port = ask_int("Порт DoH-прокси", 9999, 1024, 60000)
    chat_port = base_port + 10
    cdp_base = 9220

    print()
    print(f"  Папка:      {root}")
    print(f"  Агентов:    {n} ({LETTERS[:n]})")
    print(f"  Порты:      {base_port}..{base_port + n - 1}")
    print(f"  CDP:        {cdp_base}..{cdp_base + n - 1}")
    print(f"  Прокси:     {proxy_port}")
    print(f"  Чат-сервер: {chat_port}")
    print()

    if not ask_yes("Продолжить?", "y"):
        print("Отменено.")
        return

    root.mkdir(parents=True, exist_ok=True)

    # 1. Структура
    dirs = ["sandbox", "sandbox/council_chat", "extension",
            "launchers", "emergency", "rag", "rag/procedures",
            "rag/errors", "rag/archive", "logs", "runtime",
            ".secrets", "templates/agent_logs"]
    for d in dirs:
        (root / d).mkdir(parents=True, exist_ok=True)

    # 2. Копирование
    total = 0
    for sub in COPY_DIRS:
        s = HERE / sub
        if not s.exists():
            print(f"  SKIP {sub} (не найдено в исходнике)")
            continue
        cnt = copy_tree(s, root / sub)
        total += cnt
        print(f"  + {sub}: {cnt} файлов")

    for f in COPY_FILES:
        s = HERE / f
        if s.exists():
            shutil.copy2(s, root / f)
            total += 1
    print(f"  + корневые файлы: {sum(1 for f in COPY_FILES if (HERE/f).exists())}")
    print(f"  Всего скопировано: {total}")

    # 3. Папки агентов (logs/<L>/, chrome-<L>-data/)
    tpl = root / "templates" / "agent_logs"
    for L in LETTERS[:n]:
        d = root / "logs" / L
        d.mkdir(parents=True, exist_ok=True)
        (d / "conversations").mkdir(exist_ok=True)
        if tpl.exists():
            for t in ["HANDOVER.md", "TODO.md", "NOTES.md", "README.md"]:
                src = tpl / t
                if src.exists() and not (d / t).exists():
                    shutil.copy2(src, d / t)
        (root / f"chrome-{L}-data").mkdir(exist_ok=True)

    # 4. .agent_token — не перезаписываем, если уже есть
    tok = root / ".agent_token"
    if tok.exists():
        print(f"  .agent_token — существует, не трогаю")
    else:
        tok.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        print(f"  .agent_token — создан")

    # 5. config.json
    cfg_file = root / "config.json"
    cfg = {
        "root": str(root),
        "n_agents": n,
        "letters": list(LETTERS[:n]),
        "agent_port_base": base_port,
        "cdp_port_base": cdp_base,
        "chat_port": chat_port,
        "proxy_port": proxy_port,
        "channels": {
            L: {
                "agent": base_port + i,
                "cdp": cdp_base + i,
                "prefix": "AAAA" if L == "A" else (L + L + "AA"),
            }
            for i, L in enumerate(LETTERS[:n])
        },
    }
    if cfg_file.exists():
        if ask_yes("config.json уже есть. Перезаписать?", "n"):
            cfg_file.write_text(
                json.dumps(cfg, ensure_ascii=False, indent=2),
                encoding="utf-8")
            print("  config.json — перезаписан")
        else:
            print("  config.json — оставлен существующий")
    else:
        cfg_file.write_text(
            json.dumps(cfg, ensure_ascii=False, indent=2),
            encoding="utf-8")
        print("  config.json — создан")

    # 6. launchers
    sys.path.insert(0, str(root / "launchers"))
    try:
        import gen_launchers
        gen_launchers.gen_launchers(root, n, base_port, cdp_base,
                                    chat_port, proxy_port)
        print(f"  launchers/ — сгенерированы")
    except Exception as e:
        print(f"  launchers/ — ошибка: {e!r}")
        return 1

    print()
    print("=" * 60)
    print(" Готово.")
    print(f"  1. Проверь .agent_token (там случайная строка).")
    print(f"  2. Запусти: {root}\\launchers\\boot-all.ps1")
    print(f"  3. Открой в Chrome: chrome://extensions -> Load unpacked ->")
    print(f"     {root}\\extension")
    print(f"  4. В сайдпанели задай Token (из .agent_token) и Agent URL")
    print(f"     (http://127.0.0.1:{base_port}) -> Set -> Self-test.")
    print(f"  5. Чат: http://127.0.0.1:{chat_port}/")
    print("=" * 60)

    # 7. Ярлык на рабочем столе
    if ask_yes("Создать ярлык JewAI на рабочем столе?", "y"):
        cs = root / "launchers" / "create-shortcut.ps1"
        if cs.exists():
            try:
                r = subprocess.run(
                    ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                     "-File", str(cs)],
                    capture_output=True, text=True, timeout=30,
                    encoding="utf-8", errors="replace",
                    creationflags=subprocess.CREATE_NO_WINDOW)
                if r.returncode == 0:
                    print("  ярлык JewAI создан на рабочем столе.")
                else:
                    print("  ошибка ярлыка:", (r.stderr or r.stdout)[-200:])
            except Exception as e:
                print("  не создать ярлык:", repr(e)[:200])
        else:
            print("  create-shortcut.ps1 не найден")

    print()
    open_install_guide(root)
    print()
    print("Дальше — по инструкции в открывшемся окне.")
    return 0


if __name__ == "__main__":
    sys.exit(main())