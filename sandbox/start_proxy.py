"""Start DoH proxy as background daemon."""
import subprocess, sys, socket
from pathlib import Path

PROXY = ROOT / "sandbox" / "doh_proxy.py"
PORT = 9999

# check if port already used
s = socket.socket()
try:
    s.connect(("127.0.0.1", PORT))
    print("proxy already on port " + str(PORT))
    sys.exit(0)
except Exception:
    pass
finally:
    s.close()

flags = 0
if sys.platform == "win32":
    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

proc = subprocess.Popen(
    [sys.executable, str(PROXY), "--port", str(PORT)],
    creationflags=flags,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    cwd=str(PROXY.parent),
)
print("proxy pid:", proc.pid)

# verify
import time
time.sleep(1.5)
try:
    s = socket.socket()
    s.settimeout(3)
    s.connect(("127.0.0.1", PORT))
    s.close()
    print("proxy up on port " + str(PORT))
except Exception as e:
    print("proxy verify failed: " + repr(e)[:120])