import subprocess, sys, json, time, argparse, re
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed


def _nw_flags():
    """Windows: без окна cmd при запуске тестов."""
    if sys.platform != "win32":
        return 0
    return subprocess.CREATE_NO_WINDOW

# Портирование (jewai): ROOT от файла.
_HERE = Path(__file__).resolve().parent
ROOT = _HERE  # runner_v3 лежит в <root>/sandbox/, cwd — этот же каталог


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(ROOT))
    ap.add_argument("--filter", default="")
    ap.add_argument("--tag", default="")
    ap.add_argument("--include-failing", action="store_true")
    ap.add_argument("--json-out", default="")
    ap.add_argument("--timeout", type=int, default=180)
    ap.add_argument("--workers", type=int, default=1)
    return ap.parse_args()


def extract_tags(p):
    try:
        with p.open(encoding="utf-8", errors="replace") as f:
            head = "".join(f.readline() for _ in range(8))
    except Exception:
        return []
    tags = []
    for m in re.finditer(r"#\s*tag:\s*([^\r\n]+)", head):
        for t in m.group(1).split(","):
            t = t.strip()
            if t and " " not in t and "\t" not in t:
                tags.append(t)
    return tags


def discover(base, include_failing):
    base = Path(base)
    files = sorted(base.glob("test_*.py"))
    if include_failing:
        files += sorted((base / "failing").glob("test_*.py"))
    return files


def filter_tests(files, filter_s, tag_s):
    out = []
    for f in files:
        if filter_s and filter_s.lower() not in f.name.lower():
            continue
        tags = extract_tags(f)
        if tag_s and tag_s not in tags:
            continue
        out.append((f, tags))
    return out


def run_one(path, timeout):
    t0 = time.time()
    try:
        r = subprocess.run(
            [sys.executable, str(path)],
            capture_output=True, text=True, timeout=timeout,
            encoding="utf-8", errors="replace",
            cwd=str(path.parent),
            creationflags=_nw_flags(),
        )
        el = round(time.time() - t0, 2)
        return {"test": str(path.name), "exit": r.returncode, "elapsed": el,
                "stdout": r.stdout, "stderr": r.stderr}
    except subprocess.TimeoutExpired:
        return {"test": str(path.name), "exit": -1,
                "elapsed": round(time.time() - t0, 2),
                "stdout": "", "stderr": "TIMEOUT"}
    except Exception as e:
        return {"test": str(path.name), "exit": -2, "elapsed": 0,
                "stdout": "", "stderr": repr(e)}


def run_seq(selected, timeout):
    results = []
    for f, tags in selected:
        print("=" * 60)
        print("RUN:", f.name)
        print("=" * 60)
        e = run_one(f, timeout)
        e["tags"] = tags
        print(e["stdout"], end="")
        if e["stderr"].strip():
            print("STDERR:", e["stderr"][:800])
        print(f"[{e['test']}] exit={e['exit']} elapsed={e['elapsed']}s")
        print()
        results.append(e)
    return results


def run_parallel(selected, timeout, workers):
    print(f"parallel mode: workers={workers}")
    results = [None] * len(selected)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {}
        for i, (f, tags) in enumerate(selected):
            fut = ex.submit(run_one, f, timeout)
            futures[fut] = (i, f, tags)
        for fut in as_completed(futures):
            i, f, tags = futures[fut]
            e = fut.result()
            e["tags"] = tags
            results[i] = e
            mark = "OK" if e["exit"] == 0 else "FAIL"
            print(f"  [{mark}] {f.name}  exit={e['exit']} elapsed={e['elapsed']}s", flush=True)
    return results


def main():
    args = parse_args()
    base = Path(args.dir)
    RUNS = base / "runs"
    RUNS.mkdir(parents=True, exist_ok=True)

    files = discover(base, args.include_failing)
    selected = filter_tests(files, args.filter, args.tag)

    print(f"runner v3 | dir={base}")
    print(f"discovered {len(files)}  selected {len(selected)}  workers={args.workers}")
    for f, tags in selected:
        tag_str = ("  tags=" + ",".join(tags)) if tags else ""
        print(f"  - {f.relative_to(base)}{tag_str}")
    print()

    grand_t0 = time.time()
    if args.workers <= 1:
        results = run_seq(selected, args.timeout)
    else:
        results = run_parallel(selected, args.timeout, args.workers)
    total_el = round(time.time() - grand_t0, 2)

    if args.workers > 1:
        for e in results:
            if not e:
                continue
            print()
            print("=" * 60)
            print("OUT:", e["test"], "exit=", e["exit"], "elapsed=", e["elapsed"])
            print("=" * 60)
            print(e["stdout"], end="")
            if e["stderr"].strip():
                print("STDERR:", e["stderr"][:400])

    passed = sum(1 for r in results if r and r["exit"] == 0)
    failed = len(results) - passed
    payload = {
        "when": datetime.now().isoformat(timespec="seconds"),
        "runner": "v3",
        "workers": args.workers,
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "elapsed": total_el,
        "results": results,
    }
    out = Path(args.json_out) if args.json_out else RUNS / "report_v3.json"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print()
    print("=" * 60)
    print(f"TOTAL: {passed}/{len(results)} passed, {failed} failed, {total_el}s workers={args.workers}")
    print("report:", out)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()