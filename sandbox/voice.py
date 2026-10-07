"""Unified voice dispatcher.

Usage:
  python voice.py alarm "причина"        # 5 повторов / 5 мин
  python voice.py stuck "причина"        # 3 / 4 мин
  python voice.py done "что сделано"     # 2 / 2 мин
  python voice.py watchdog "причина"     # 3 / 5 мин
  python voice.py helper "причина"       # 3 / 5 мин
  python voice.py say "свободный текст"  # 3 / 4 мин (без заготовки)

Все уровни читают заготовки из voice_phrases.json.
Финальный текст: prefix + " " + аргумент + " " + suffix.

Файлы:
  voice.lock     — lock (не даёт двум голосам звучать одновременно)
  voice.stop     — тишина (создать — все процессы замолчат)
"""
import sys, os, time, json, subprocess
from pathlib import Path


def _nw_flags(detach=False):
    """Windows: без окна cmd."""
    if sys.platform != "win32":
        return 0
    f = subprocess.CREATE_NO_WINDOW
    if detach:
        f |= subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    return f

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
PHRASES = ROOT / "sandbox" / "voice_phrases.json"
LOCK = ROOT / "voice.lock"
STOP = ROOT / "voice.stop"
NOTIFY = ROOT / "sandbox" / "notify_me.py"
LOG = ROOT / "voice.log"


def log(msg):
    line = "[" + time.strftime("%H:%M:%S") + "] " + msg
    print(line, flush=True)
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_phrases():
    try:
        return json.loads(PHRASES.read_text(encoding="utf-8"))
    except Exception as e:
        log("phrases err: " + repr(e)[:100])
        return {}


def acquire():
    if STOP.exists():
        return False
    if LOCK.exists():
        age = time.time() - LOCK.stat().st_mtime
        if age < 30:
            return False
        try: LOCK.unlink()
        except Exception: pass
    try:
        fd = os.open(str(LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode("ascii"))
        os.close(fd)
        return True
    except FileExistsError:
        return False


def release():
    try:
        if LOCK.exists(): LOCK.unlink()
    except Exception: pass


def speak(text, repeat, interval):
    proc = subprocess.Popen(
        [sys.executable, str(NOTIFY), "--text", text,
         "--repeat", str(repeat), "--interval", str(interval)],
        cwd=str(NOTIFY.parent),
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        creationflags=_nw_flags(detach=True),
    )
    return proc.pid


def main():
    if len(sys.argv) < 2:
        print("usage: voice.py <level> [reason]")
        sys.exit(1)

    level = sys.argv[1]
    reason = sys.argv[2] if len(sys.argv) > 2 else ""

    phrases = load_phrases()

    if level == "say":
        text = reason or "Ведущий, сообщение от системы"
        repeat, interval = 3, 240
    elif level in phrases:
        p = phrases[level]
        parts = [p.get("prefix", "").strip()]
        if reason: parts.append(reason.strip())
        parts.append(p.get("suffix", "").strip())
        text = " ".join(x for x in parts if x)
        repeat = int(p.get("repeat", 3))
        interval = int(p.get("interval", 300))
    else:
        print("unknown level:", level)
        sys.exit(2)

    if not acquire():
        log("lock busy or stop file, exit")
        sys.exit(0)

    try:
        pid = speak(text, repeat, interval)
        log("level=" + level + " pid=" + str(pid) + " text=" + text[:120])
    finally:
        release()


if __name__ == "__main__":
    main()