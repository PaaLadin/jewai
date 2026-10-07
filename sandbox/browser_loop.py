"""Autonomous browser loop. Reads tasks from browser_tasks.json, runs each,
writes result to browser_results.json.

Task format:
    {"id": "t1", "recipe": "sandbox/recipes/web_wikipedia.json", "port": 9222}
Result format:
    {"id": "t1", "status": "done|failed", "errors": N, "log_tail": "..."}
"""
import subprocess, sys, json, time
from pathlib import Path
from datetime import datetime

# --- Портирование (jewai): ROOT определяется от файла ---
_HERE = Path(__file__).resolve().parent
ROOT = _HERE.parent if _HERE.name in ("sandbox", "extension",
                                       "council_chat") else _HERE
SANDBOX = ROOT / "sandbox"
TASKS = SANDBOX / "browser_tasks.json"
RESULTS = SANDBOX / "browser_results.json"
AGENT = SANDBOX / "web_agent_v4.py"


def load(path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def run_task(task):
    port = task.get("port", 9222)
    recipe = task.get("recipe")
    if not recipe:
        return {"status": "skipped", "reason": "no recipe"}
    recipe_path = ROOT / recipe if not Path(recipe).is_absolute() else Path(recipe)
    if not recipe_path.exists():
        return {"status": "failed", "error": "recipe not found: " + str(recipe_path)}
    try:
        r = subprocess.run(
            [sys.executable, "-u", str(AGENT),
             "--port", str(port), "--recipe", str(recipe_path)],
            capture_output=True, text=True, timeout=180,
            encoding="utf-8", errors="replace",
            cwd=str(SANDBOX))
        return {
            "status": "done" if r.returncode == 0 else "failed",
            "exit": r.returncode,
            "stdout_tail": (r.stdout or "")[-800:],
            "stderr_tail": (r.stderr or "")[-400:],
        }
    except Exception as e:
        return {"status": "failed", "error": repr(e)[:200]}


def main():
    once = "--once" in sys.argv
    print("browser_loop start", flush=True)
    results = load(RESULTS, [])
    while True:
        tasks = load(TASKS, [])
        pending = [t for t in tasks if t.get("status", "pending") == "pending"]
        if not pending:
            print("no pending tasks", flush=True)
            break
        for t in pending:
            print("=== task " + str(t.get("id")) + " ===", flush=True)
            r = run_task(t)
            t["status"] = r.get("status", "unknown")
            t["finished_at"] = datetime.now().isoformat(timespec="seconds")
            results.append({"id": t.get("id"), "recipe": t.get("recipe"), **r})
            save(TASKS, tasks)
            save(RESULTS, results)
            print("  -> " + t["status"], flush=True)
            time.sleep(1)
        if once:
            break
    print("browser_loop done", flush=True)


if __name__ == "__main__":
    main()