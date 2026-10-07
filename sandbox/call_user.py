"""Standard voice call to user. Use only when stuck and need human input.

Rules:
- When: stuck >10 min, need decision, both panels frozen.
- Never >1/15 min (cooldown in lock).
- Phrase ends with "нужен твой ответ, действие, внимание".
- 5 repeats, 5 min interval.
- notify.stop file for immediate silence.
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

reason = sys.argv[1] if len(sys.argv) > 1 else "Неизвестная ситуация"
phrase = reason + ". Нужен твой ответ, действие, внимание."

script = ROOT / "sandbox" / "notify_me.py"
flags = 0
if sys.platform == "win32":
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

proc = subprocess.Popen(
    [sys.executable, str(script), "--text", phrase,
     "--repeat", "5", "--interval", "300"],
    cwd=str(ROOT / "sandbox"),
    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    creationflags=flags,
)
print("call_user sent, pid=" + str(proc.pid))
print("phrase:", phrase)