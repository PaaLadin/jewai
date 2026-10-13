"""portable_root.py - BBAA7605: ROOT от __file__ (портативность jewai).

Ищет вверх до маркера. Marker='extension' (папка есть в обоих корнях,
config.json в jewai — в .gitignore).
"""
import os


def find_root(start=None, marker="extension"):
    p = os.path.dirname(os.path.abspath(start or __file__))
    for _ in range(10):
        if os.path.exists(os.path.join(p, marker)):
            return p
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    # fallback: 2 уровня вверх (messaging/core/x.py -> root)
    return os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(start or __file__))))


if __name__ == "__main__":
    print(find_root())