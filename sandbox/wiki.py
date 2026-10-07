import sys, json, argparse, urllib.request, urllib.parse, ssl, socket
from pathlib import Path

import socket as _skt
_skt.setdefaulttimeout(20)

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 JewAI/1.0"
_ORIG = socket.getaddrinfo
_CACHE = {}


def _doh(name):
    if name in _CACHE:
        return _CACHE[name]
    for srv in ("8.8.8.8", "1.1.1.1"):
        try:
            req = urllib.request.Request(
                "https://" + srv + "/resolve?name=" + name + "&type=A",
                headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=8, context=CTX) as r:
                d = json.loads(r.read())
            ips = [a["data"] for a in d.get("Answer", []) if a.get("type") == 1]
            if ips:
                _CACHE[name] = ips[0]
                return ips[0]
        except Exception:
            continue
    return None


def _patched(host, port, family=0, type=0, proto=0, flags=0):
    if host in _CACHE:
        return _ORIG(_CACHE[host], port, family, type, proto, flags)
    ip = _doh(host)
    if ip:
        return _ORIG(ip, port, family, type, proto, flags)
    return _ORIG(host, port, family, type, proto, flags)


socket.getaddrinfo = _patched


def api(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return r.read().decode("utf-8", "replace")


def summary(title, lang="en"):
    u = "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title)
    try:
        d = json.loads(api(u))
        return {"title": d.get("title"), "extract": d.get("extract"),
                "url": d.get("content_urls", {}).get("desktop", {}).get("page")}
    except Exception as e:
        return {"error": repr(e)[:200], "url": u}


def search(q, lang="en", limit=5):
    u = ("https://" + lang + ".wikipedia.org/w/api.php?action=query&list=search"
         "&srsearch=" + urllib.parse.quote(q) + "&format=json&srlimit=" + str(limit))
    try:
        d = json.loads(api(u))
        out = []
        for r in d.get("query", {}).get("search", []):
            out.append({"title": r.get("title"), "snippet": r.get("snippet", "")[:200]})
        return {"query": q, "results": out}
    except Exception as e:
        return {"error": repr(e)[:200]}


def html(title, lang="en"):
    u = "https://" + lang + ".wikipedia.org/api/rest_v1/page/html/" + urllib.parse.quote(title)
    try:
        return api(u, timeout=30)
    except Exception as e:
        return "ERROR: " + repr(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["summary", "search", "html"])
    ap.add_argument("q")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--save", default="")
    args = ap.parse_args()
    if args.cmd == "summary":
        r = summary(args.q, args.lang)
    elif args.cmd == "search":
        r = search(args.q, args.lang, args.limit)
    else:
        r = html(args.q, args.lang)
    if args.save and isinstance(r, str):
        Path(args.save).write_text(r, encoding="utf-8")
        print("saved:", args.save, len(r))
        return
    print(json.dumps(r, indent=2, ensure_ascii=False)[:3000])


if __name__ == "__main__":
    main()