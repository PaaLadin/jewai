#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""mail_bot.py - приём писем -> кик агентам.

Читает INBOX paaladin@yandex.ru, парсит Subject на маркер [A]/[B]/[C]/[D]/[ALL],
роутит кик через bridge_kick.py. Ответ агента идёт в чат 8770, не почтой (MVP).

Запуск:
  python projects/mail_bot/mail_bot.py --once
  python projects/mail_bot/mail_bot.py --loop --interval 1800
"""
import argparse
import email
import email.header
import email.message
import imaplib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # C:\DeepSeek
HERE = Path(__file__).resolve().parent
LOG_DIR = HERE / "logs"
LOG_DIR.mkdir(exist_ok=True)
STATE_FILE = LOG_DIR / "last_uid.json"
QUEUE_FILE = LOG_DIR / "queue.jsonl"
DAILY_LOG = LOG_DIR / (datetime.now().strftime("%Y-%m") + ".md")

# CDP-порты каналов
CDP = {"A": 9222, "B": 9223, "C": 9224, "D": 9225}
SAY_PY = ROOT / "sandbox" / "council_chat" / "say.py"
KICK_PY = ROOT / "sandbox" / "bridge_kick.py"

# Whitelist отправителей (нижний регистр). Пополняется вручную.
# Адаптивный интервал (правка оператора 2026-10-10)
BASE_INTERVAL = 300     # 5 мин база
BOOST_INTERVAL = 60     # 1 мин в boost
BOOST_DURATION = 600    # 10 мин boost после письма оператора

# Кому отвечаем на почту
OPERATOR_EMAILS = {"uncle@naben.ru", "paaladin@yandex.ru",
                   "paaladin@paaladin.ru", "ai@paaladin.ru"}

# Whitelist отправителей команд. Задача оператора 2026-10-10:
# принимать команды ТОЛЬКО с uncle@naben.ru.
# Откат: добавить сюда нужные адреса.
WHITELIST = {
    "uncle@naben.ru",
}

# Маркер адресата в начале Subject: [A], [B], [C], [D], [ALL]
RE_SUBJ = re.compile(r"^\s*\[([ABCD]|ALL|ALLCHANNELS)\]\s*(.*)$", re.IGNORECASE)


def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = "- %s %s\n" % (ts, msg)
    with DAILY_LOG.open("a", encoding="utf-8") as f:
        f.write(line)
    print(line, end="")


def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"last_uid": 0}


def save_state(st):
    STATE_FILE.write_text(json.dumps(st, ensure_ascii=False, indent=2),
                          encoding="utf-8")

def get_token():
    """Прочитать .smtp_token (host, port, sender, recipient, password)."""
    tok = ROOT / ".smtp_token"
    if not tok.exists():
        log("no .smtp_token")
        return None
    lines = [l.strip() for l in tok.read_text(encoding="utf-8").splitlines()
             if l.strip() and not l.strip().startswith("#")]
    if len(lines) < 5:
        log("token <5 lines")
        return None
    return {"host": lines[0], "port": int(lines[1]), "sender": lines[2],
            "recipient": lines[3], "password": lines[4]}


def imap_host_from_smtp(smtp_host):
    return smtp_host.replace("smtp.", "imap.")


def decode_header(raw):
    if not raw:
        return ""
    parts = email.header.decode_header(raw)
    out = []
    for data, enc in parts:
        if isinstance(data, bytes):
            out.append(data.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(data)
    return "".join(out)


def get_body_text(msg):
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                try:
                    return part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="replace")
                except Exception:
                    pass
        return "(no text/plain part)"
    try:
        return msg.get_payload(decode=True).decode(
            msg.get_content_charset() or "utf-8", errors="replace")
    except Exception:
        return ""


def route(target, subject, body, sender):
    """target: A/B/C/D/ALL. Отправка кика или say."""
    text = "[OP>%s] %s\n\n%s" % (target, subject, body[:1500])
    if target == "ALL":
        args = [sys.executable, str(SAY_PY), "A", text, "ALL"]
    else:
        port = CDP.get(target)
        if not port:
            log("unknown target %s" % target); return False
        args = [sys.executable, str(KICK_PY), "--port", str(port),
                "--text", text, "--wait-empty", "10"]
    try:
        r = subprocess.run(args, cwd=str(ROOT), capture_output=True,
                           text=True, timeout=40, encoding="utf-8",
                           errors="replace")
        if r.returncode == 0:
            log("routed to %s: %s" % (target, subject[:60]))
            return True
        log("route fail %s rc=%d err=%s" % (target, r.returncode, (r.stderr or "")[:120]))
        if sender != "queue":
            queue_add(target, subject, body, "route_fail rc=%d" % r.returncode)
        return False
    except Exception as e:
        log("route exc: %r" % (e,)[:200])
        if sender != "queue":
            queue_add(target, subject, body, "route_exc")
        return False


def process_mail(m, uid, token):
    """Возвращает True, если письмо от оператора."""
    typ, data = m.uid("FETCH", uid, "(RFC822)")
    if typ != "OK" or not data or not data[0]:
        log("fetch fail uid=%s" % uid); return
    raw = data[0][1]
    msg = email.message_from_bytes(raw)
    sender = (msg.get("From") or "").lower()
    # извлечь email из "Name <email>"
    import re as _re
    m2 = _re.search(r"<([^>]+)>", sender)
    sender_email = m2.group(1).strip() if m2 else sender.strip()
    subject = decode_header(msg.get("Subject"))
    log("uid=%s from=%s subj=%s" % (uid, sender_email, subject[:80]))
    if sender_email not in WHITELIST:
        log("SKIP (not in whitelist): %s" % sender_email); return
    msubj = RE_SUBJ.match(subject)
    if not msubj:
        log("SKIP (no target marker in subject)"); return
    target = msubj.group(1).upper()
    if target == "ALLCHANNELS":
        target = "ALL"
    clean_subj = msubj.group(2).strip()
    body = get_body_text(msg).strip()
    route(target, clean_subj, body, sender_email)
    if sender_email in OPERATOR_EMAILS:
        reply_to_operator(subject, target, body, sender_email)
        return True
    return False


def reply_to_operator(orig_subject, target, body_snippet, reply_to):
    """Короткий ответ оператору: задача принята."""
    try:
        tok = get_token()
        if not tok:
            return False
        import smtplib
        from email.mime.text import MIMEText
        body = ("Принято.\n\nЦелевой канал: [%s]\nТема: %s\n\nФрагмент:\n%s\n"
                % (target, orig_subject, body_snippet[:300]))
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = "Re: " + orig_subject
        msg["From"] = tok["sender"]
        msg["To"] = reply_to
        with smtplib.SMTP_SSL(tok["host"], int(tok["port"]), timeout=20) as s:
            s.login(tok["sender"], tok["password"])
            s.sendmail(tok["sender"], [reply_to], msg.as_string())
        log("reply sent to %s" % reply_to)
        return True
    except Exception as e:
        log("reply fail: %r" % (e,)[:150])
        return False


def queue_add(target, subject, body, reason):
    """Отложить задачу на повтор."""
    rec = {"ts": time.time(), "target": target, "subject": subject,
           "body": body, "reason": reason, "tries": 0}
    with QUEUE_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    log("queued (reason=%s): %s" % (reason, subject[:50]))


def queue_process():
    """Пройтись по очереди, попробовать снова. Успешные - выкинуть."""
    if not QUEUE_FILE.exists():
        return 0
    lines = [l for l in QUEUE_FILE.read_text(encoding="utf-8").splitlines() if l.strip()]
    if not lines:
        return 0
    remaining = []
    ok = 0
    for line in lines:
        try:
            rec = json.loads(line)
        except Exception:
            continue
        t = rec.get("target", "")
        s = rec.get("subject", "")
        b = rec.get("body", "")
        if route(t, s, b, "queue"):
            ok += 1
        else:
            rec["tries"] = rec.get("tries", 0) + 1
            remaining.append(json.dumps(rec, ensure_ascii=False))
    QUEUE_FILE.write_text(("\n".join(remaining) + "\n") if remaining else "",
                          encoding="utf-8")
    if ok:
        log("queue: processed %d, remaining %d" % (ok, len(remaining)))
    return ok


def run_once():
    token = get_token()
    if not token:
        return 1
    host = imap_host_from_smtp(token["host"])
    user = token["sender"]
    pw = token["password"]
    st = load_state()
    last_uid = int(st.get("last_uid", 0))
    operator_mail_seen = False
    m = None
    for attempt in range(3):
        try:
            m = imaplib.IMAP4_SSL(host, 993, timeout=20)
            m.login(user, pw)
            break
        except Exception as e:
            log("IMAP login attempt %d fail: %r" % (attempt+1, (e,)[:150]))
            time.sleep(5)
    if m is None:
        log("IMAP login fail after 3 attempts"); return 2
    m.select("INBOX")
    typ, data = m.uid("SEARCH", None, "UID", "%d:*" % (last_uid + 1))
    uids = data[0].split() if data and data[0] else []
    log("found %d new uids (last=%d)" % (len(uids), last_uid))
    queue_process()
    max_uid = last_uid
    for u in uids:
        try:
            u_int = int(u)
        except Exception:
            continue
        if u_int <= last_uid:
            continue
        if process_mail(m, u.decode(), token):
            operator_mail_seen = True
        if u_int > max_uid:
            max_uid = u_int
    if max_uid > last_uid:
        st["last_uid"] = max_uid
        save_state(st)
    m.logout()
    return {"operator_mail": operator_mail_seen, "processed": len(uids)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--interval", type=int, default=1800)
    a = ap.parse_args()
    if a.loop:
        base = a.interval if a.interval != 1800 else BASE_INTERVAL
        log("=== mail_bot loop start (base=%ds boost=%ds dur=%ds) ==="
            % (base, BOOST_INTERVAL, BOOST_DURATION))
        boost_until = 0
        while True:
            try:
                res = run_once()
                if isinstance(res, dict) and res.get("operator_mail"):
                    boost_until = time.time() + BOOST_DURATION
                    log("BOOST on: +%ds" % BOOST_DURATION)
            except Exception as e:
                log("loop exc: %r" % (e,)[:200])
            now = time.time()
            if now < boost_until:
                wait = BOOST_INTERVAL
                log("sleep %ds (boost, %ds left)" % (wait, int(boost_until - now)))
            else:
                wait = base
                log("sleep %ds (base)" % wait)
            time.sleep(wait)
    else:
        log("=== mail_bot once ===")
        run_once()
        return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
