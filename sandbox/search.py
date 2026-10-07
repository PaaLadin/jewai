"""Search + fetch utilities. DuckDuckGo search, HTTP fetch, image download, image analysis."""
import sys, json, re, argparse, urllib.request, urllib.parse, time
from pathlib import Path

import socket as _skt
_skt.setdefaulttimeout(20)

RUNS = ROOT / "sandbox" / "runs"
RUNS.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36"

# ---- DoH hook: route DNS through 8.8.8.8 over HTTPS ----
import ssl, socket, json as _json
_CTX = ssl.create_default_context()
_CTX.check_hostname = False
_CTX.verify_mode = ssl.CERT_NONE
_DOH_CACHE = {}


def _doh_lookup(name):
    if name in _DOH_CACHE:
        return _DOH_CACHE[name]
    for server in ("8.8.8.8", "1.1.1.1"):
        try:
            req = urllib.request.Request(
                "https://" + server + "/resolve?name=" + name + "&type=A",
                headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=8, context=_CTX) as r:
                d = _json.loads(r.read())
            ips = [a["data"] for a in d.get("Answer", []) if a.get("type") == 1]
            if ips:
                _DOH_CACHE[name] = ips[0]
                return ips[0]
        except Exception:
            continue
    return None


_ORIG_GAI = socket.getaddrinfo


def install_doh_hook():
    def patched(host, port, family=0, type=0, proto=0, flags=0):
        if host in _DOH_CACHE:
            return _ORIG_GAI(_DOH_CACHE[host], port, family, type, proto, flags)
        ip = _doh_lookup(host)
        if ip:
            return _ORIG_GAI(ip, port, family, type, proto, flags)
        return _ORIG_GAI(host, port, family, type, proto, flags)
    socket.getaddrinfo = patched


install_doh_hook()


def ddg_search(query, max_results=10):
    """DuckDuckGo text search via ddgs library."""
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return {"error": "no ddgs library"}
    out = []
    try:
        with DDGS() as d:
            for r in d.text(query, max_results=max_results):
                out.append({
                    "title": r.get("title"),
                    "href": r.get("href"),
                    "body": r.get("body"),
                })
    except Exception as e:
        return {"error": repr(e)[:200], "results": out}
    return {"query": query, "results": out}


def ddg_images(query, max_results=5):
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS
        except ImportError:
            return {"error": "no ddgs library"}
    out = []
    try:
        with DDGS() as d:
            for r in d.images(query, max_results=max_results):
                out.append({
                    "title": r.get("title"),
                    "image": r.get("image"),
                    "thumbnail": r.get("thumbnail"),
                    "source": r.get("source"),
                    "width": r.get("width"),
                    "height": r.get("height"),
                })
    except Exception as e:
        return {"error": repr(e)[:200], "results": out}
    return {"query": query, "results": out}


def fetch(url, timeout=20, save_as=None):
    """Fetch URL. Returns status, size, optionally saved file path."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.9",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            ct = r.headers.get("content-type", "")
            status = r.status
    except Exception as e:
        return {"ok": False, "error": repr(e)[:200], "url": url}
    result = {"ok": True, "url": url, "status": status, "content_type": ct, "size": len(raw)}
    if save_as:
        f = RUNS / save_as
        f.write_bytes(raw)
        result["file"] = str(f)
        result["file_size"] = f.stat().st_size
    return result


def download_image(url, name):
    """Download image, returns file path and basic info."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read()
    except Exception as e:
        return {"ok": False, "error": repr(e)[:200], "url": url}
    f = RUNS / name
    f.write_bytes(raw)
    return {"ok": True, "file": str(f), "size": len(raw), "url": url}


def analyze_image(path):
    """Return size, dominant colors, brightness. Uses PIL."""
    try:
        from PIL import Image
    except ImportError:
        return {"error": "no PIL"}
    p = Path(path)
    if not p.exists():
        return {"error": "not found", "path": str(p)}
    try:
        im = Image.open(p).convert("RGB")
    except Exception as e:
        return {"error": repr(e)[:200]}
    w, h = im.size
    small = im.resize((64, 64))
    pixels = list(list(small.convert('RGB').getdata()))
    avg = tuple(sum(c[i] for c in pixels) // len(pixels) for i in range(3))
    q = im.quantize(colors=5)
    palette = q.getpalette()[:15]
    top_colors = [(palette[i], palette[i+1], palette[i+2]) for i in range(0, 15, 3)]
    brightness = int(sum(avg) / 3)
    return {
        "path": str(p),
        "size": [w, h],
        "avg_rgb": avg,
        "brightness": brightness,
        "top_colors": top_colors,
    }


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("--n", type=int, default=10)
    i = sub.add_parser("images"); i.add_argument("query"); i.add_argument("--n", type=int, default=5)
    f = sub.add_parser("fetch"); f.add_argument("url"); f.add_argument("--save")
    d = sub.add_parser("dl"); d.add_argument("url"); d.add_argument("name")
    a = sub.add_parser("analyze"); a.add_argument("path")
    args = ap.parse_args()

    if args.cmd == "search":
        r = ddg_search(args.query, args.n)
    elif args.cmd == "images":
        r = ddg_images(args.query, args.n)
    elif args.cmd == "fetch":
        r = fetch(args.url, save_as=args.save)
    elif args.cmd == "dl":
        r = download_image(args.url, args.name)
    elif args.cmd == "analyze":
        r = analyze_image(args.path)
    else:
        print("usage: search|images|fetch|dl|analyze"); sys.exit(1)

    print(json.dumps(r, indent=2, ensure_ascii=False)[:3000])


if __name__ == "__main__":
    main()