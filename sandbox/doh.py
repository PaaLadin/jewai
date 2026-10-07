"""DNS-over-HTTPS resolver. Bypasses restricted system DNS."""
import json, urllib.request, ssl, socket, sys, argparse

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def doh_resolve(name, server="8.8.8.8"):
    url = "https://" + server + "/resolve?name=" + name + "&type=A"
    req = urllib.request.Request(url, headers={"accept": "application/dns-json"})
    with urllib.request.urlopen(req, timeout=10, context=CTX) as r:
        return json.loads(r.read())


def query(name):
    try:
        d = doh_resolve(name, "8.8.8.8")
    except Exception as e:
        try:
            d = doh_resolve(name, "1.1.1.1")
        except Exception as e2:
            return {"name": name, "error": repr(e)[:100] + " / " + repr(e2)[:100]}
    answers = d.get("Answer", [])
    ips = [a.get("data") for a in answers if a.get("type") == 1]
    return {"name": name, "ips": ips, "status": d.get("Status")}


def install_hook(doh_server="8.8.8.8"):
    """Monkey-patch socket.getaddrinfo to use DoH."""
    original = socket.getaddrinfo

    cache = {}

    def patched(host, port, family=0, type=0, proto=0, flags=0):
        if host in cache:
            ip = cache[host]
        else:
            r = query(host)
            ips = r.get("ips") or []
            if not ips:
                return original(host, port, family, type, proto, flags)
            ip = ips[0]
            cache[host] = ip
        return original(ip, port, family, type, proto, flags)

    socket.getaddrinfo = patched
    return patched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["test", "resolve"])
    ap.add_argument("--name", default="duckduckgo.com")
    args = ap.parse_args()
    if args.mode == "test":
        for n in ["duckduckgo.com", "example.com", "en.wikipedia.org",
                  "www.bing.com", "search.brave.com"]:
            print(json.dumps(query(n), ensure_ascii=False))
    elif args.mode == "resolve":
        print(json.dumps(query(args.name), ensure_ascii=False))


if __name__ == "__main__":
    main()