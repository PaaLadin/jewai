# TODO mail_bot

## В работе
- [x] IMAP-доступ sender@example.com
- [x] mail_bot.py: чтение INBOX, парсинг, роутинг
- [x] last_uid.json
- [x] whitelist отправителей
- [x] логирование
- [x] тесты (23/23)
- [x] очередь отложенных
- [x] IMAP retry

## Ждёт оператора
- [ ] v1.0.0: копия в jewai + строка в README
- [ ] Автозапуск mail_bot через launchers/boot-all.ps1

## Решено оператором
- Токен: личный sender@example.com
- Ящик: sender@example.com
- Ответ агента: в чат 8770 (не почтой) — MVP

## Решено ведущим (8A)
- Whitelist: sender@example.com, recipient@example.com, operator@example.com
- Формат: Subject = [A]/[B]/[C]/[D]/[ALL] + текст
- Маркер в кик: [OP>X] / [OP>ALL]
- Состояние: logs/last_uid.json
- Очередь: logs/queue.jsonl
- Логи: logs/YYYY-MM.md
- Запуск: --once / --loop --interval 1800
- В фоне через pythonw
