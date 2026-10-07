"""health_matrix.py - таблица живости 4 каналов одним запросом.
  python sandbox/health_matrix.py
Читает /api/health с 8770, печатает читаемую матрицу.
"""
import sys, io, json, urllib.request
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass

URL = "http://127.0.0.1:8770/api/health"


def main():
    try:
        d = json.loads(urllib.request.urlopen(URL, timeout=40).read().decode("utf-8", "replace"))
    except Exception as e:
        print("health unavailable:", str(e)[:120])
        return 1
    m = d.get("matrix", {})
    hdr = "%-4s %-8s %-6s %-8s %-8s %-11s %-6s %-8s %s" % (
        "CH", "content", "agent", "watchdog", "recovery", "lastId", "sess", "cmds", "risk")
    print(hdr)
    print("-" * len(hdr))
    for ch in ["A", "B", "C", "D"]:
        r = m.get(ch, {})
        def yn(v):
            return "OK" if v is True else ("--" if v is False else "?")
        print("%-4s %-8s %-6s %-8s %-8s %-11s %-6s %-8s %s" % (
            ch, yn(r.get("content")), yn(r.get("agent")),
            "ON" if r.get("watchdog") else "off",
            "ON" if r.get("recovery") else "off",
            str(r.get("lastId") or "-"), str(r.get("session_min") or "-"),
            str(r.get("cmds_from_start") if r.get("cmds_from_start") is not None else "-"),
            r.get("risk") or "-"))
    al = d.get("alerts", [])
    print()
    if al:
        print("ALERTS (%d):" % len(al))
        for a in al:
            print("  [%s] %s: %s" % (a.get("channel"), a.get("kind"), a.get("text")))
    else:
        print("ALERTS: none")
    return 0


if __name__ == "__main__":
    sys.exit(main())