"""say.py — простой способ ответить в штабной чат из любого канала.

Использование:
  python sandbox/council_chat/say.py A "текст"           (всем)
  python sandbox/council_chat/say.py B "текст" operator  (только оператору)
  python sandbox/council_chat/say.py C "текст" ALL
"""
import sys as _sys, io as _io
try:
    _sys.stdout = _io.TextIOWrapper(_sys.stdout.buffer, encoding='utf-8', errors='replace')
except Exception:
    pass
import sys, json, time
from pathlib import Path

CHAT_FILE = Path(r"C:\DeepSeek\sandbox\council_chat\chat.jsonl")

def main():
    if len(sys.argv) < 3:
        print("usage: say.py <A|B|C|D> <text> [<to>]")
        sys.exit(1)
    ch = sys.argv[1].upper()
    if ch not in ("A", "B", "C", "D"):
        print("bad channel", ch)
        sys.exit(2)
    text = sys.argv[2]
    to = sys.argv[3] if len(sys.argv) > 3 else "ALL"
    msg = {
        "ts": time.time(),
        "time": time.strftime("%H:%M:%S"),
        "from": ch,
        "to": to,
        "text": text,
    }
    CHAT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CHAT_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(msg, ensure_ascii=False) + "\n")
    print("sent", ch, "->", to)

if __name__ == "__main__":
    main()