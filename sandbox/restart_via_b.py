"""Restart agent A via agent B's /run (so A's own channel isn't used)."""
import sys, time, urllib.request, json
from pathlib import Path

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
TOKEN = (ROOT / ".agent_token").read_text(encoding="utf-8").strip() if (ROOT / ".agent_token").exists() else ""


def post(port, op, body, timeout=30):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:" + str(port) + op,
        data=data,
        headers={"X-Token": TOKEN, "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def get(port, op, timeout=10):
    req = urllib.request.Request(
        "http://127.0.0.1:" + str(port) + op,
        headers={"X-Token": TOKEN})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


print("checking agent A (8766)...")
try:
    a = get(8766, "/ping", timeout=3)
    print("A alive:", a)
    sys.exit(0)
except Exception as e:
    print("A dead:", repr(e)[:120])

print("asking B (8767) to restart A...")
# first kill stale process on 8766 via B
cmd = (
    'powershell -NoProfile -Command "'
    'Get-CimInstance Win32_Process -Filter \\"Name=\'python.exe\'\\" | '
    'Where-Object { $_.CommandLine -like \'*agent.py 8766*\' } | '
    'ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"'
)
try:
    r = post(8767, "/run", {"cmd": cmd, "timeout": 15})
    print("kill result:", r.get("ok"), r.get("stdout", "")[:80])
except Exception as e:
    print("kill via B failed:", repr(e)[:120])

time.sleep(2)

# start A via B, using start /B (B's agent has nonblock fix? if not — use detach cmd)
start_cmd = f'cmd /c start /B /D "{ROOT / "extension"}" python agent.py 8766'
try:
    r = post(8767, "/run", {"cmd": start_cmd, "timeout": 20})
    print("start result:", json.dumps(r)[:200])
except Exception as e:
    print("start via B failed:", repr(e)[:120])

print("waiting 6s for A...")
time.sleep(6)
try:
    a = get(8766, "/ping", timeout=5)
    print("A ping:", a)
except Exception as e:
    print("A still dead:", repr(e)[:120])
    sys.exit(2)