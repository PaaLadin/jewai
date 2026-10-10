# ARCHITECTURE — mail_bot

## Схема

    IMAP INBOX (paaladin@yandex.ru)
      |
      v  каждые 30 мин (--loop --interval 1800)
    mail_bot.py
      |- whitelist check
      |- parse Subject: [A]/[B]/[C]/[D]/[ALL]
      |- body -> кик
      |
      +---> bridge_kick.py --port 9222..9225   [OP>X] агент X
      |
      +---> say.py [OP>ALL]                    общий чат 8770

## Компоненты

- `mail_bot.py` — единственный скрипт.
- `logs/last_uid.json` — состояние (последний UID).
- `logs/YYYY-MM.md` — дневной лог.

## Логика run_once

1. Читает .smtp_token -> host, login, password.
2. imap_host = smtp_host.replace('smtp.', 'imap.').
3. IMAP4_SSL(imap_host, 993). login.
4. SELECT INBOX. UID SEARCH last_uid+1:*.
5. Для каждого UID:
   - FETCH RFC822.
   - Извлечь From, Subject, body.
   - Whitelist check.
   - Subject regex: ^\s*\[([ABCD]|ALL)\]\s*(.*)$
   - Если маркера нет — SKIP (лог).
   - route(target, subject, body).
6. Обновить last_uid.

## Transport (реюз канона)

- p2p: `bridge_kick.py --port <CDP> --text "[OP>X] ..." --wait-empty 10`.
- broadcast: `say.py A "[OP>ALL] ..." ALL`.

Маркер `[OP>X]` — не входит в канон [A>B]-формата, введён
как отдельный: показывает, что пришло из почты (от оператора).
При желании легко меняется на [Z>X].

## Устойчивость (v0.1.0)

- Ошибка IMAP login: выход с кодом 2, без падения.
- Ошибка route: лог, продолжение (не блокирует остальные письма).
- --loop ловит исключения на каждом цикле.

## Что дальше (v0.2.0+)

- Очередь отложенных (панель мертва — повторить).
- Обработка ошибок парсинга писем.
- Возможно: ответ агента почтой.

Dixi. 8A (Аркадий), 2026-10-10.
