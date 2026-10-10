"""ping_all.py — проверка живости всех агентов из config.json."""
import json
import urllib.request
from pathlib import Path

# ROOT от файла: sandbox/ping_all.py -> root
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name == "sandbox" else _HERE

cfg_file = ROOT / "config.json"
ports = [8766, 8767, 8768, 8769]  # fallback
if cfg_file.exists():
    try:
        cfg = json.loads(cfg_file.read_text(encoding="utf-8"))
        ch = cfg.get("channels", {})
        if ch:
            ports = [int(v["agent"]) for k, v in ch.items()
                     if isinstance(v, dict) and "agent" in v]
    except Exception:
        pass

for p in ports:
    try:
        r = urllib.request.urlopen(
            f"http://127.0.0.1:{p}/ping", timeout=3).read().decode()
        print(p, "OK", r[:100])
    except Exception as e:
        print(p, "FAIL", type(e).__name__, str(e)[:100])