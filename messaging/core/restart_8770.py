"""
Перезапуск council_chat server (8770).
Убивает pid 13384, запускает заново в фоне.
"""
import os, sys, time, subprocess
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "sandbox"))
from portable_root import find_root

OLD_PID = 13384
SERVER = os.path.join(find_root(__file__), "sandbox", "council_chat", "server.py")

# kill
try:
    r = subprocess.run(["taskkill", "/F", "/PID", str(OLD_PID)],
                       capture_output=True, timeout=10)
    print("kill rc=%d out=%s err=%s" % (r.returncode,
          r.stdout.decode('utf-8','replace')[:120],
          r.stderr.decode('utf-8','replace')[:120]))
except Exception as e:
    print("kill failed:", e)

time.sleep(1.5)

# start detached
DETACHED = 0x00000008
try:
    p = subprocess.Popen(
        [sys.executable, SERVER],
        creationflags=DETACHED,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        close_fds=True,
        cwd=os.path.dirname(SERVER),
    )
    print("started, new pid:", p.pid)
except Exception as e:
    print("start failed:", e)

time.sleep(2.5)
print("done")