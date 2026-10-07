"""launch_server.py - поднять council_chat/server.py по-настоящему detached.
Агент op=run убивает дерево процессов по завершении, поэтому запуск
идёт через DETACHED_PROCESS, вывод - в лог.
  python sandbox/council_chat/launch_server.py
"""
import sys, os, io, subprocess, time
from pathlib import Path
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SRV = ROOT / "sandbox" / "council_chat" / "server.py"
LOG = ROOT / "sandbox" / "council_chat" / "server_out.log"

flags = 0
if sys.platform == "win32":
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

logf = open(LOG, "a", encoding="utf-8", errors="replace")
p = subprocess.Popen(
    [sys.executable, "-u", str(SRV)],
    cwd=str(SRV.parent),
    stdin=subprocess.DEVNULL,
    stdout=logf,
    stderr=logf,
    creationflags=flags,
)
print("launched pid=%d log=%s" % (p.pid, LOG))
time.sleep(2.0)
# проверка порта
import socket
s = socket.socket(); s.settimeout(3)
try:
    s.connect(("127.0.0.1", 8770)); print("port 8770: LISTENING")
except Exception as e:
    print("port 8770: NOT UP -", str(e)[:80])
finally:
    s.close()