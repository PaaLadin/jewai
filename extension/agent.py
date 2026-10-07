import json, shutil, subprocess, secrets, hashlib, tempfile, time, sys
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from datetime import datetime

# --- Портирование (jewai): ROOT от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name == "extension" else _HERE
ROOT.mkdir(parents=True, exist_ok=True)
TOKEN_FILE = ROOT / ".agent_token"
# no-window flags (перенос из v2, патч 4A)
_NO_WINDOW_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
_STARTUPINFO = None
if sys.platform == "win32":
    _STARTUPINFO = subprocess.STARTUPINFO()
    _STARTUPINFO.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    _STARTUPINFO.wShowWindow = subprocess.SW_HIDE


def _nw(extra_flags=0):
    """kwargs для Popen/run без окна. extra_flags - доп. флаги (DETACHED и т.д.)."""
    kw = {"creationflags": _NO_WINDOW_FLAGS | extra_flags}
    if _STARTUPINFO is not None:
        kw["startupinfo"] = _STARTUPINFO
    return kw


# ALIVE-логика: время последней активности бриджа (DCCA0022)
_LAST_TS = time.time()

LOG_FILE = ROOT / "agent.log"
START = time.time()
STATS = {"req": 0, "err": 0, "last": "-"}

if TOKEN_FILE.exists():
    TOKEN = TOKEN_FILE.read_text().strip()
else:
    TOKEN = secrets.token_urlsafe(32)
    TOKEN_FILE.write_text(TOKEN, encoding="utf-8")


def log(lv, msg):
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {lv:6} {msg}"
    print(line, flush=True)
    try:
        LOG_FILE.open("a", encoding="utf-8").write(line + "\n")
    except Exception:
        pass


def safe_path(rel):
    if not rel:
        raise ValueError("empty path")
    p = (ROOT / rel).resolve()
    if p != ROOT and ROOT not in p.parents:
        raise ValueError(f"escape: {rel}")
    return p


def sha(p):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for c in iter(lambda: f.read(65536), b""):
            h.update(c)
    return h.hexdigest()


def _is_detach_cmd(cmd):
    low = cmd.strip().lower()
    if low.startswith("start "):
        return True
    if low.startswith("cmd /c start"):
        return True
    if "start /b " in low:
        return True
    return False


def _strip_start(cmd):
    """Turn 'start /B python agent.py 8766' into 'python agent.py 8766'."""
    s = cmd.strip()
    low = s.lower()
    if low.startswith("cmd /c "):
        s = s[7:].strip()
        low = s.lower()
    if low.startswith("start "):
        s = s[6:].strip()
        low = s.lower()
    if low.startswith("/b "):
        s = s[3:].strip()
    if s.startswith('""'):
        s = s[2:].strip()
    if s.startswith('"') and s.endswith('"') and s.count('"') == 2:
        s = s[1:-1]
    return s


def _spawn_detached(cmd, cwd):
    """Spawn process detached, return pid. Never blocks."""
    inner = _strip_start(cmd)
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    proc = subprocess.Popen(
        inner, shell=True, cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        **_nw(flags),
    )
    return proc.pid


def taskkill_tree(pid):
    """Kill process tree on Windows. Used on TimeoutExpired."""
    if sys.platform != "win32":
        return
    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)],
                       capture_output=True, timeout=5, **_nw())
    except Exception:
        pass


def run_with_killtree(cmd, cwd, timeout):
    """subprocess.run with kill-tree on timeout."""
    if sys.platform == "win32":
        proc = subprocess.Popen(
            cmd, shell=True, cwd=cwd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            stdin=subprocess.DEVNULL,
            text=True, encoding="utf-8", errors="replace",
            **_nw(),
        )
        try:
            out, err = proc.communicate(timeout=timeout)
            return proc.returncode, out, err, False
        except subprocess.TimeoutExpired:
            taskkill_tree(proc.pid)
            try:
                proc.communicate(timeout=3)
            except Exception:
                pass
            return -1, "", "TIMEOUT", True
    else:
        r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True,
                           text=True, timeout=timeout, encoding="utf-8",
                           errors="replace")
        return r.returncode, r.stdout, r.stderr, False


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _auth(self):
        return self.headers.get("X-Token") == TOKEN

    def _j(self, code, obj):
        d = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Token")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Content-Length", str(len(d)))
        self.end_headers()
        self.wfile.write(d)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n)) if n else {}

    def do_OPTIONS(self):
        self._j(200, {"ok": True})

    def do_GET(self):
        if self.path == "/ping":
            return self._j(200, {"ok": True, "root": str(ROOT), "version": "4.0.0-test",
                                 "last_ts": _LAST_TS,
                                 "ago": round(time.time() - _LAST_TS, 1)})
        if self.path == "/health":
            return self._j(200, {"ok": True, "uptime": round(time.time() - START, 1),
                                 "stats": STATS, "root": str(ROOT), "version": "4.0.0-test"})
        return self._j(404, {"error": "not found"})

    def do_POST(self):
        if not self._auth():
            log("AUTH", "reject " + self.path)
            return self._j(401, {"error": "unauthorized"})
        STATS["req"] += 1
        try:
            b = self._body()
            op = self.path
            STATS["last"] = op
            # ALIVE: считать трафиком только реальные операции (DCCA0022, фикс дыры 2).
            # ВАЖНО: чтение logs/svc/* (syncWatchdogState в background.js и
            # checkAlive в content.js) НЕ считать трафиком — иначе ago всегда ~0,
            # ALIVE не срабатывает (баг найден 2026-10-07).
            global _LAST_TS
            _svc_read = (op == "/read" and isinstance(b, dict)
                         and str(b.get("path", "")).startswith("logs/svc/"))
            if not _svc_read and op in ("/write", "/read", "/list", "/delete", "/mkdir", "/hash",
                      "/run", "/sandbox", "/voice", "/notify"):
                _LAST_TS = time.time()

            if op == "/write":
                p = safe_path(b["path"])
                p.parent.mkdir(parents=True, exist_ok=True)
                c = b.get("content", "")
                if p.exists() and p.is_file():
                    try:
                        if p.read_text(encoding="utf-8") == c:
                            return self._j(200, {"ok": True, "path": str(p),
                                                 "unchanged": True,
                                                 "bytes": len(c.encode("utf-8"))})
                    except Exception:
                        pass
                p.write_text(c, encoding="utf-8")
                h = sha(p)
                log("WRITE", f"{p} ({len(c)}b) {h[:12]}")
                return self._j(200, {"ok": True, "path": str(p),
                                     "bytes": len(c.encode("utf-8")), "sha256": h})

            if op == "/read":
                p = safe_path(b["path"])
                t = p.read_text(encoding="utf-8", errors="replace")
                log("READ", str(p))
                return self._j(200, {"ok": True, "path": str(p), "content": t,
                                     "bytes": len(t.encode("utf-8"))})

            if op == "/list":
                p = safe_path(b.get("path", "."))
                items = []
                for x in sorted(p.iterdir()):
                    try:
                        items.append({"name": x.name, "is_dir": x.is_dir(),
                                      "size": x.stat().st_size if x.is_file() else 0})
                    except Exception:
                        pass
                return self._j(200, {"ok": True, "path": str(p), "items": items})

            if op == "/delete":
                p = safe_path(b["path"])
                shutil.rmtree(p) if p.is_dir() else p.unlink()
                log("DEL", str(p))
                return self._j(200, {"ok": True})

            if op == "/mkdir":
                p = safe_path(b["path"])
                p.mkdir(parents=True, exist_ok=True)
                return self._j(200, {"ok": True, "path": str(p)})

            if op == "/hash":
                p = safe_path(b["path"])
                if not p.exists():
                    return self._j(200, {"ok": False, "error": "not found"})
                return self._j(200, {"ok": True, "sha256": sha(p), "bytes": p.stat().st_size})

            if op == "/voice":
                level = b.get("level", "say")
                reason = b.get("reason", "")
                script = ROOT / "sandbox" / "voice.py"
                if not script.exists():
                    return self._j(200, {"ok": False, "error": "voice.py missing"})
                flags = 0
                if sys.platform == "win32":
                    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                try:
                    proc = subprocess.Popen(
                        [sys.executable, str(script), level, reason],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        **_nw(flags),
                        cwd=str(ROOT / "sandbox"),
                    )
                    log("VOICE", "level=" + level + " pid=" + str(proc.pid) + " reason=" + reason[:60])
                    return self._j(200, {"ok": True, "pid": proc.pid, "level": level})
                except Exception as e:
                    log("VOICE-ERR", repr(e))
                    return self._j(200, {"ok": False, "error": repr(e)[:200]})

            if op == "/notify":
                text = b.get("text", "Джошуа на связи. Нужна помощь.")
                repeat = int(b.get("repeat", 5))
                interval = int(b.get("interval", 300))
                script = ROOT / "sandbox" / "notify_me.py"
                if not script.exists():
                    return self._j(200, {"ok": False, "error": "notify_me.py missing"})
                # write phrase to UTF-8 file to avoid cmd encoding issues
                tf = ROOT / "notify.txt"
                try:
                    tf.write_text(text, encoding="utf-8")
                except Exception as e:
                    return self._j(200, {"ok": False, "error": "text write: " + repr(e)[:120]})
                flags = 0
                if sys.platform == "win32":
                    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                try:
                    proc = subprocess.Popen(
                        [sys.executable, str(script),
                         "--file", str(tf),
                         "--repeat", str(repeat), "--interval", str(interval)],
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        **_nw(flags),
                        cwd=str(ROOT / "sandbox"),
                    )
                    log("NOTIFY", "pid=" + str(proc.pid) + " text=" + text[:60])
                    return self._j(200, {"ok": True, "pid": proc.pid})
                except Exception as e:
                    log("NOTIFY-ERR", repr(e))
                    return self._j(200, {"ok": False, "error": repr(e)[:200]})

            if op == "/notify-stop":
                stopfile = ROOT / "notify.stop"
                try:
                    stopfile.write_text("stop", encoding="utf-8")
                    log("NOTIFY-STOP", "created")
                    return self._j(200, {"ok": True})
                except Exception as e:
                    return self._j(200, {"ok": False, "error": repr(e)[:200]})

            if op == "/run":
                cmd = b["cmd"]
                cwd = safe_path(b.get("cwd", "."))
                to = int(b.get("timeout", 60))
                log("RUN", cmd)
                t0 = time.time()
                if _is_detach_cmd(cmd):
                    try:
                        pid = _spawn_detached(cmd, cwd)
                        el = round(time.time() - t0, 2)
                        log("SPAWN", f"pid={pid} detached")
                        return self._j(200, {"ok": True, "code": 0,
                                             "stdout": "detached pid=" + str(pid),
                                             "stderr": "", "elapsed": el,
                                             "detached": True})
                    except Exception as e:
                        log("SPAWN-ERR", repr(e))
                        return self._j(200, {"ok": False, "code": -1,
                                             "stdout": "", "stderr": repr(e)[:200]})
                code, out, err, was_timeout = run_with_killtree(cmd, cwd, to)
                el = round(time.time() - t0, 2)
                if was_timeout:
                    log("EXIT", f"TIMEOUT tree-killed ({el}s)")
                    return self._j(200, {"ok": False, "code": -1, "stdout": out,
                                         "stderr": "TIMEOUT (tree killed)",
                                         "elapsed": el})
                log("EXIT", f"{code} ({el}s)")
                return self._j(200, {"ok": code == 0, "code": code,
                                     "stdout": out, "stderr": err,
                                     "elapsed": el})

            if op == "/sandbox":
                files = b.get("files", [])
                cmd = b.get("cmd", "")
                to = int(b.get("timeout", 60))
                with tempfile.TemporaryDirectory(prefix="dsx_") as td:
                    tp = Path(td)
                    for f in files:
                        if isinstance(f, str):
                            s = safe_path(f)
                            if s.exists():
                                d = tp / s.name
                                shutil.copytree(s, d) if s.is_dir() else shutil.copy2(s, d)
                        elif isinstance(f, dict) and "path" in f:
                            d = tp / Path(f["path"]).name
                            d.parent.mkdir(parents=True, exist_ok=True)
                            d.write_text(f.get("content", ""), encoding="utf-8")
                    t0 = time.time()
                    code, out, err, was_timeout = run_with_killtree(cmd, tp, to)
                    el = round(time.time() - t0, 2)
                    if was_timeout:
                        log("SANDBOX", f"{cmd} TIMEOUT tree-killed")
                        return self._j(200, {"ok": False, "code": -1,
                                             "stdout": out, "stderr": "TIMEOUT (tree killed)",
                                             "elapsed": el})
                    log("SANDBOX", f"{cmd} -> {code}")
                    return self._j(200, {"ok": code == 0, "code": code,
                                         "stdout": out, "stderr": err,
                                         "elapsed": el})

            return self._j(404, {"error": "unknown " + op})
        except Exception as e:
            STATS["err"] += 1
            log("ERROR", repr(e))
            return self._j(500, {"error": str(e)})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    log("START", f"v2.1.5 {ROOT} :{port}")
    print("=== DeepSeek Agent v2.1.5 (voice-levels) ===")
    print("Root:     " + str(ROOT))
    print("Endpoint: http://127.0.0.1:" + str(port))
    print("Token:    " + TOKEN)
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()