"""Voice notification. Reads phrase from UTF-8 file, speaks via SAPI with SSML."""
import sys, os, time, argparse, subprocess
from pathlib import Path

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
STOP_FILE = ROOT / "notify.stop"
LOCK_FILE = ROOT / "notify.lock"
ACTIVITY_FILE = ROOT / "watchdog_indep.heartbeat"
LOG_FILE = ROOT / "notify.log"
PHRASE_FILE = ROOT / "notify_phrase.txt"


def log(msg):
    line = "[" + time.strftime("%H:%M:%S") + "] " + msg
    print(line, flush=True)
    try:
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def pid_alive(pid):
    try:
        r = subprocess.run(
            ["tasklist", "/FI", "PID eq " + str(pid), "/NH"],
            capture_output=True, text=True, timeout=5,
            encoding="utf-8", errors="replace")
        return str(pid) in (r.stdout or "")
    except Exception:
        return False


def acquire_lock():
    # stale lock check: if PID inside lock is dead OR age > 120 sec -> remove
    if LOCK_FILE.exists():
        try:
            content = LOCK_FILE.read_text(encoding="utf-8", errors="replace").strip()
            pid = int(content) if content.isdigit() else 0
            age = time.time() - LOCK_FILE.stat().st_mtime
            alive = pid_alive(pid) if pid else False
            if not alive or age > 120:
                LOCK_FILE.unlink()
        except Exception:
            pass

    # atomic create with O_EXCL (fails if exists)
    try:
        fd = os.open(str(LOCK_FILE), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode("ascii"))
        os.close(fd)
        return True
    except FileExistsError:
        return False
    except Exception:
        return False


def release_lock():
    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
    except Exception:
        pass


def build_ps_script(voice_name, tmp_path):
    """Build PowerShell script. Double quotes inside are escaped by using single quotes in PS where possible."""
    esc_path = str(tmp_path).replace("'", "''")
    lines = []
    lines.append("Add-Type -AssemblyName System.Speech")
    lines.append("$s = New-Object System.Speech.Synthesis.SpeechSynthesizer")
    if voice_name:
        esc_v = voice_name.replace("'", "''")
        lines.append("$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -eq '" + esc_v + "' } | Select-Object -First 1")
        lines.append("if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }")
    else:
        lines.append("$all = $s.GetInstalledVoices() | Where-Object { $_.Enabled }")
        lines.append("$v = $all | Where-Object { $_.VoiceInfo.Name -like '*Pavel*' } | Select-Object -First 1")
        lines.append("if (-not $v) { $v = $all | Where-Object { $_.VoiceInfo.Name -like '*Irina*' } | Select-Object -First 1 }")
        lines.append("if (-not $v) { $v = $all | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ru-RU' } | Select-Object -First 1 }")
        lines.append("if ($v) { $s.SelectVoice($v.VoiceInfo.Name) }")
    lines.append("$s.SetOutputToDefaultAudioDevice()")
    lines.append("$s.Rate = 0")
    lines.append("$s.Volume = 100")
    lines.append("$txt = (Get-Content -Raw -Encoding UTF8 '" + esc_path + "').Trim()")
    lines.append("$esc = [System.Security.SecurityElement]::Escape($txt)")
    # use single quotes to enclose SSML template so inner double quotes are literal
    lines.append("$ssml = '<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"ru-RU\"><prosody pitch=\"-30%\" rate=\"-10%\">' + $esc + '</prosody></speak>'")
    lines.append("$s.SpeakSsml($ssml)")
    return "; ".join(lines)


def speak(text, voice_name=None):
    tmp = PHRASE_FILE
    tmp.write_text(text, encoding="utf-8")
    ps = build_ps_script(voice_name, tmp)
    flags = 0
    if sys.platform == "win32":
        # CREATE_NO_WINDOW suppresses the PowerShell console window
        flags = subprocess.CREATE_NO_WINDOW
    r = subprocess.run(
        ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps],
        capture_output=True, text=True, timeout=60,
        encoding="utf-8", errors="replace",
        creationflags=flags)
    return r.returncode, (r.stdout or "")[:100], (r.stderr or "")[:300]


def activity_fresh(threshold=60):
    if not ACTIVITY_FILE.exists():
        return False
    return (time.time() - ACTIVITY_FILE.stat().st_mtime) < threshold


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", default="")
    ap.add_argument("--file", default="")
    ap.add_argument("--repeat", type=int, default=5)
    ap.add_argument("--interval", type=int, default=300)
    ap.add_argument("--voice", default="")
    args = ap.parse_args()

    text = ""
    if args.file:
        fp = Path(args.file)
        if fp.exists():
            text = fp.read_text(encoding="utf-8").strip()
    if not text and args.text:
        text = args.text
    if not text:
        text = "Джошуа на связи. Нужна помощь."
    if len(text) > 400:
        text = text[:400]

    if not acquire_lock():
        log("lock held, exit")
        return

    try:
        if STOP_FILE.exists():
            STOP_FILE.unlink()
        log("start voice='" + args.voice + "' repeat=" + str(args.repeat) + " text=" + text[:80])
        for i in range(1, args.repeat + 1):
            if STOP_FILE.exists():
                log("stop file, exit")
                return
            log("speak " + str(i) + "/" + str(args.repeat))
            rc, out, err = speak(text, args.voice or None)
            log("speak rc=" + str(rc))
            if rc != 0 and err:
                log("speak err: " + err[:200])
            if i < args.repeat:
                slept = 0
                while slept < args.interval:
                    if STOP_FILE.exists():
                        return
                    time.sleep(5)
                    slept += 5
                    if activity_fresh(60):
                        log("activity, back off 5 min")
                        for _ in range(60):
                            if STOP_FILE.exists():
                                return
                            time.sleep(5)
                        if activity_fresh(60):
                            log("still active, exit")
                            return
                        break
        log("done all repeats")
    finally:
        release_lock()


if __name__ == "__main__":
    main()