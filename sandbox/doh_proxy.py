import sys, socket, ssl, threading, json, urllib.request, argparse
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
CACHE = {}


def doh(name):
    if name in CACHE:
        return CACHE[name]
    for srv in ("8.8.8.8", "1.1.1.1"):
        try:
            req = urllib.request.Request("https://" + srv + "/resolve?name=" + name + "&type=A",
                                         headers={"accept": "application/dns-json"})
            with urllib.request.urlopen(req, timeout=8, context=CTX) as r:
                d = json.loads(r.read())
            ips = [a["data"] for a in d.get("Answer", []) if a.get("type") == 1]
            if ips:
                CACHE[name] = ips[0]
                return ips[0]
        except Exception:
            continue
    return None


def pipe(a, b):
    try:
        while True:
            d = a.recv(65536)
            if not d:
                break
            b.sendall(d)
    except Exception:
        pass
    finally:
        try: a.close()
        except: pass
        try: b.close()
        except: pass


def handle(client):
    try:
        data = client.recv(8192)
        if not data:
            client.close()
            return
        line = data.split(b"\r\n", 1)[0].decode("utf-8", "replace")
        parts = line.split()
        if len(parts) < 2:
            client.close()
            return
        method, target = parts[0], parts[1]
        if method == "CONNECT":
            host, _, port = target.partition(":")
            port = int(port or 443)
            ip = doh(host)
            if not ip:
                client.sendall(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                client.close()
                return
            up = socket.create_connection((ip, port), timeout=15)
            client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            threading.Thread(target=pipe, args=(client, up), daemon=True).start()
            threading.Thread(target=pipe, args=(up, client), daemon=True).start()
            return
        client.sendall(b"HTTP/1.1 400 Bad Request\r\n\r\n")
        client.close()
    except Exception as e:
        print("err: " + repr(e)[:120], flush=True)
        try: client.close()
        except: pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9999)
    ap.add_argument("--test", action="store_true")
    args = ap.parse_args()
    if args.test:
        for h in ("example.com", "duckduckgo.com", "en.wikipedia.org", "www.bing.com"):
            print(h + " -> " + str(doh(h)))
        return
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", args.port))
    srv.listen(50)
    print("proxy on 127.0.0.1:" + str(args.port), flush=True)
    while True:
        try:
            c, _ = srv.accept()
            threading.Thread(target=handle, args=(c,), daemon=True).start()
        except Exception as e:
            print("accept: " + repr(e)[:100], flush=True)


if __name__ == "__main__":
    main()