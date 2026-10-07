"""Voice call: task done, ready for next.
Same lock/cooldown as call_user.py. Shorter repeat (2).
Usage: python sandbox/done_notify.py "короткое описание что сделано"
"""
import sys, subprocess, time
from pathlib import Path

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
LOCK = ROOT / "notify.lock"

if LOCK.exists():
    age = time.time() - LOCK.stat().st_mtime
    if age < 60:
        print("cooldown active, exit")
        sys.exit(0)

reason = sys.argv[1] if len(sys.argv) > 1 else "Задача выполнена"
phrase = reason + ". Готов к следующей."

script = ROOT / "sandbox" / "notify_me.py"
flags = 0
if sys.platform == "win32":
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

proc = subprocess.Popen(
    [sys.executable, str(script), "--text", phrase,
     "--repeat", "2", "--interval", "120"],
    cwd=str(ROOT / "sandbox"),
    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    creationflags=flags,
)
print("done_notify sent, pid=" + str(proc.pid))
print("phrase:", phrase)