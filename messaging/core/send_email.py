"""Send email via SMTP (Yandex). Usage:
  python sandbox/send_email.py --file path/to/body.md "Subject"
"""
import sys, smtplib, pathlib
from email.mime.text import MIMEText
from email.header import Header

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAND = [ROOT/".smtp_token", ROOT/".secrets"/".smtp_token", ROOT/"assistant"/".smtp_token"]

def find_token():
    for c in CAND:
        if c.exists():
            return c
    return None

def main():
    tok = find_token()
    if not tok:
        print("no .smtp_token"); sys.exit(0)
    lines = [l.strip() for l in tok.read_text(encoding="utf-8").splitlines()
             if l.strip() and not l.strip().startswith("#")]
    if len(lines) < 5:
        print("token <5 lines"); sys.exit(1)
    host, port, sender, recipient, password = lines[:5]
    args = sys.argv[1:]
    subj = "DeepSeek Agent Bridge"
    body = ""
    i = 0
    while i < len(args):
        if args[i] == "--file" and i+1 < len(args):
            p = pathlib.Path(args[i+1])
            if not p.exists():
                print("file not found:", p); sys.exit(3)
            body = p.read_text(encoding="utf-8")
            i += 2; continue
        if subj == "DeepSeek Agent Bridge":
            subj = args[i]
        else:
            body = (body + "\n" + args[i]) if body else args[i]
        i += 1
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(subj, "utf-8")
    msg["From"] = sender
    msg["To"] = recipient
    try:
        pn = int(port)
        if pn == 465:
            with smtplib.SMTP_SSL(host, pn, timeout=20) as s:
                s.login(sender, password)
                s.sendmail(sender, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(host, pn, timeout=20) as s:
                s.starttls()
                s.login(sender, password)
                s.sendmail(sender, [recipient], msg.as_string())
        print("email sent to", recipient)
    except Exception as e:
        print("email err:", repr(e)[:200]); sys.exit(2)

if __name__ == "__main__":
    main()