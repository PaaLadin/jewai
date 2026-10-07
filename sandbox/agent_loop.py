import subprocess, sys, json, time, argparse
from pathlib import Path
from datetime import datetime
import templates

DEFAULT_ROOT = ROOT / "sandbox"


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(DEFAULT_ROOT))
    ap.add_argument("--queue", default="")
    ap.add_argument("--task", default="")
    ap.add_argument("--verbose", action="store_true")
    return ap.parse_args()


def run_test_file(path, timeout=90):
    t0 = time.time()
    try:
        r = subprocess.run([sys.executable, str(path)],
                           capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8",
                           errors="replace", cwd=str(path.parent))
        return {"exit": r.returncode,
                "elapsed": round(time.time() - t0, 2),
                "stdout": r.stdout, "stderr": r.stderr}
    except subprocess.TimeoutExpired:
        return {"exit": -1, "elapsed": timeout,
                "stdout": "", "stderr": "TIMEOUT"}
    except Exception as e:
        return {"exit": -2, "elapsed": 0,
                "stdout": "", "stderr": repr(e)}


def process(task, root, verbose=False):
    name = task["name"]
    test_path = root / ("test_" + name + ".py")
    code = templates.render(task)
    if not code:
        task["status"] = "skipped"
        task["reason"] = "unknown template"
        task["finished_at"] = datetime.now().isoformat(timespec="seconds")
        return {"id": task["id"], "name": name, "tpl": task.get("template"),
                "status": "skipped", "exit": -1, "elapsed": 0,
                "stdout": "", "stderr": "unknown template"}

    test_path.write_text(code, encoding="utf-8")
    r = run_test_file(test_path)
    task["status"] = "done" if r["exit"] == 0 else "failed"
    task["exit"] = r["exit"]
    task["elapsed"] = r["elapsed"]
    task["log_tail"] = (r["stdout"][-400:] + r["stderr"][-200:]).strip()
    task["finished_at"] = datetime.now().isoformat(timespec="seconds")

    if verbose:
        print(r["stdout"], end="")
        if r["stderr"].strip():
            print("STDERR:", r["stderr"][:500])

    return {"id": task["id"], "name": name, "tpl": task.get("template"),
            "status": task["status"], "exit": r["exit"],
            "elapsed": r["elapsed"],
            "stdout": r["stdout"], "stderr": r["stderr"]}


def print_report(results, total_elapsed):
    print("=" * 60)
    print("RUN REPORT | " + str(len(results)) + " task(s) | " + str(total_elapsed) + "s")
    print("=" * 60)
    for r in results:
        mark = "OK" if r["exit"] == 0 else "FAIL"
        line = "  [" + mark + "] " + r["id"] + " " + r["name"]
        line += "  tpl=" + str(r.get("tpl", "?"))
        line += "  exit=" + str(r["exit"])
        line += "  elapsed=" + str(r["elapsed"]) + "s"
        print(line)
        if r["exit"] != 0:
            tail = (r["stdout"][-250:] + r["stderr"][-250:]).strip()
            if tail:
                for ln in tail.split("\n"):
                    print("         " + ln)
    passed = sum(1 for r in results if r["exit"] == 0)
    failed = len(results) - passed
    print()
    print("TOTAL: " + str(passed) + "/" + str(len(results)) +
          " passed, " + str(failed) + " failed, " + str(total_elapsed) + "s")


def main():
    args = parse_args()
    root = Path(args.dir)
    RUNS = root / "runs"
    RUNS.mkdir(parents=True, exist_ok=True)
    queue_path = Path(args.queue) if args.queue else root / "tasks" / "queue.json"
    if not queue_path.exists():
        print("queue not found:", queue_path)
        sys.exit(1)

    q = json.loads(queue_path.read_text(encoding="utf-8"))
    print("agent_loop v5 | root: " + str(root) +
          " | tasks: " + str(len(q)) +
          " | filter: " + (args.task or "-") +
          " | verbose: " + str(args.verbose))

    results = []
    grand = time.time()
    for t in q:
        if args.task and t["id"] != args.task:
            continue
        if t.get("status") != "pending":
            continue
        if args.verbose:
            print()
            print(">>> " + t["id"] + " " + t["name"] + " (" + str(t.get("template")) + ")")
        r = process(t, root, verbose=args.verbose)
        results.append(r)
        queue_path.write_text(json.dumps(q, indent=2, ensure_ascii=False), encoding="utf-8")

    total_el = round(time.time() - grand, 2)
    if results:
        print()
        print_report(results, total_el)
    else:
        print("nothing to do (0 pending tasks)")
        print("TOTAL: 0/0 passed, 0 failed, " + str(total_el) + "s")

    payload = {
        "when": datetime.now().isoformat(timespec="seconds"),
        "total": len(q),
        "done": sum(1 for t in q if t.get("status") == "done"),
        "failed": sum(1 for t in q if t.get("status") == "failed"),
        "pending": sum(1 for t in q if t.get("status") == "pending"),
        "skipped": sum(1 for t in q if t.get("status") == "skipped"),
        "elapsed": total_el,
        "tasks": [{"id": t["id"], "name": t["name"], "tpl": t.get("template"),
                   "status": t.get("status"), "exit": t.get("exit"),
                   "elapsed": t.get("elapsed")} for t in q],
    }
    report = RUNS / "agent_report.json"
    report.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print("report:", report)
    sys.exit(0 if payload["failed"] == 0 else 1)


if __name__ == "__main__":
    main()