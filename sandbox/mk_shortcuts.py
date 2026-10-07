"""Создаёт ярлыки Chrome для A/B/C/D с буквенными иконками + отдельным AUMI."""
import subprocess, sys
from pathlib import Path
# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
ICONS = ROOT / "icons"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DESK = Path.home() / "Desktop"
PROFILES = {
    "A": ("chrome-A-data", 9222, "AAAA"),
    "B": ("chrome-B-data", 9223, "BBAA"),
    "C": ("chrome-C-data", 9224, "CCAA"),
    "D": ("chrome-D-data", 9225, "DDAA"),
}
for ch, (prof, cdp, pref) in PROFILES.items():
    lnk = DESK / ("JewAI %s.lnk" % ch)
    ico = ICONS / ("icon_%s.ico" % ch)
    args = ('--user-data-dir="%s" --remote-debugging-port=%d --no-first-run '
            '--no-default-browser-check --hide-crash-restore-bubble '
            '--app="https://chat.deepseek.com/"' % (ROOT / prof, cdp))
    ps = (
        '$s=(New-Object -ComObject WScript.Shell).CreateShortcut("%s");'
        '$s.TargetPath="%s";$s.Arguments=@\'\n%s\n\'@;'
        '$s.IconLocation="%s";$s.WorkingDirectory="%s";$s.Save()'
        % (lnk, CHROME, args, ico, ROOT)
    )
    r = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                       capture_output=True, text=True, timeout=30)
    print(ch, "rc", r.returncode, (r.stderr or "")[:80], "->", lnk.name)
print("shortcuts done")