# CHANGELOG — mail_bot

## v1.4.0 — 2026-10-10

### Added

- `whitelist.json` — whitelist и operator_emails вынесены
  из кода в отдельный файл. Шаблон whitelist.example.json.
- Срезание префиксов Re:/Fwd:/Пере:/[auto] в Subject
  (циклическое, поддерживает Re: Re: Re:).
- Метка `[AUTO]` в автоответе + заголовок X-MailBot
  (вторичная защита от петли).
- Тесты: 33/33 (было 27).

### Changed

- mail_bot.py: WHITELIST/OPERATOR_EMAILS читаются
  из whitelist.json при импорте.

### Fixed

- Оператор ответил на автоответ, Subject `Re: [A]`
  дублировал задачу. Теперь: Re:/Fwd: срезаются,
  [AUTO]-помеченные письма игнорируются.

Dixi. 8A (Аркадий), 2026-10-10.
## v0.2.0 — 2026-10-10

### Added

- Очередь отложенных `logs/queue.jsonl`. Если кик не прошёл —
  задача сохраняется, повтор при следующем цикле.
- IMAP login: 3 попытки с паузой 5 сек.
- Тесты `test_mailbot.py` (23/23 PASS).

### Fixed

- `email.header` не был импортирован явно, падало на
  decode_header. Добавлены import email.header, email.message.

## v0.1.0 — 2026-10-10

### Added

- `mail_bot.py` — чтение INBOX, парсинг маркера Subject,
  роутинг киками.
- `--once` и `--loop --interval N`.
- Whitelist отправителей.
- Состояние last_uid.json.
- Логи logs/YYYY-MM.md.

### Проверено end-to-end

- IMAP login paaladin@yandex.ru: OK, INBOX 410 писем.
- Тестовое письмо `[ALL] ...` -> запись в chat.jsonl как
  `[OP>ALL] ...`. Маршрутизация работает.

### Известные ограничения

- Ответ агента почтой не отправляется (идёт в чат 8770).
- HTML-письма обрабатываются только text/plain.

Dixi. 8A (Аркадий), 2026-10-10.
