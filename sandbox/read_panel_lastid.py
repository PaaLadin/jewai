"""read_panel_lastid.py - читает lastId панели канала через CDP.

Использует read_panel_state (innerText sidepanel) + regex.
Для этапа 3: интеграция в /api/status (server.py, зона D).

Usage:
  python sandbox/read_panel_lastid.py 9223
Вывод: JSON {port, ok, lastId, tokens_pct, session_min, raw_found}
"""
import sys, io, re, subprocess, json
from pathlib import Path
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass


def _nw_flags():
    """Windows: без окна cmd."""
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NO_WINDOW

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE


def read_state(port):
    try:
        r = subprocess.run([sys.executable, str(ROOT / "sandbox" / "read_panel_state.py"), str(port)],
                           capture_output=True, text=True, timeout=3,
                           encoding="utf-8", errors="replace",
                           creationflags=_nw_flags())
        return (r.stdout or "")
    except Exception:
        return ""


def parse(txt):
    out = {"lastId": None, "tokens_pct": None, "session_min": None}
    m = re.search(r"lastId\s+([A-Z]{4}\d{4})", txt)
    if m:
        out["lastId"] = m.group(1)
    m = re.search(r"tokens\s+~?\s*([\d\s]+)\s*\(([\d.]+)%\)", txt)
    if m:
        out["tokens_pct"] = float(m.group(2))
    m = re.search(r"session\s+(\d+)m", txt)
    if m:
        out["session_min"] = int(m.group(1))
    return out


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9223
    txt = read_state(port)
    res = {"port": port, "ok": bool(txt), "raw_len": len(txt)}
    if txt:
        res.update(parse(txt))
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()