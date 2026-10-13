"""find.py - поиск файлов по проекту с исключениями мусорных папок.

Проблема: chrome-*-data, models, runtime, archive, backups весят
сотни МБ. Get-ChildItem -Recurse и grep по всему дереву виснут.

Решение: этот скрипт. Предустановленные исключения. Агенты ищут
ТОЛЬКО через него (правило в behavior_rules).

Usage:
  python sandbox/find.py "*.py"                  # по имени файла
  python sandbox/find.py "pattern" --text        # по содержимому
  python sandbox/find.py "*.md" --dir rag        # в подпапке
"""
import argparse
import fnmatch
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {
    "git", "backups", "archive", ".git", "__pycache__",
    "models", "runtime", "media", "rag_index", "node_modules",
    "chrome-A-data", "chrome-B-data", "chrome-C-data", "chrome-D-data",
    "chrome-A-data-test", "_read_tmp", "tests", "conversations", "history",
    ".venv", "venv", "dist", "build", ".cache",
}

EXCLUDE_FILES = (".bak", ".broken", ".draft", ".pyc", ".gguf",
                  ".faiss", ".dll", ".exe", ".so", ".zip", ".7z")


def walk(base):
    for dp, dn, fn in os.walk(base):
        dn[:] = [d for d in dn if d not in EXCLUDE_DIRS]
        for f in fn:
            fl = f.lower()
            if fl.endswith(EXCLUDE_FILES):
                continue
            if ".bak" in fl or ".broken" in fl or ".draft" in fl:
                continue
            yield os.path.join(dp, f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pattern")
    ap.add_argument("--text", action="store_true", help="искать по содержимому")
    ap.add_argument("--dir", default="", help="подпапка от корня")
    a = ap.parse_args()

    base = os.path.join(ROOT, a.dir) if a.dir else ROOT
    hits = 0
    for fp in walk(base):
        if a.text:
            try:
                with io.open(fp, "r", encoding="utf-8", errors="replace") as f:
                    for ln, line in enumerate(f, 1):
                        if a.pattern.lower() in line.lower():
                            print("%s:%d: %s" % (os.path.relpath(fp, ROOT), ln, line.strip()[:150]))
                            hits += 1
                            if hits >= 100:
                                print("... (обрезано на 100)")
                                return
            except Exception:
                continue
        else:
            if fnmatch.fnmatch(os.path.basename(fp), a.pattern):
                print(os.path.relpath(fp, ROOT))
                hits += 1
    print("--- hits=%d ---" % hits)


if __name__ == "__main__":
    main()
