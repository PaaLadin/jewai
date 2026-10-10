# ROADMAP mail_bot

## v0.1.0 — MVP [ГОТОВО 2026-10-10]
- [x] Чтение IMAP
- [x] Парсинг Subject на маркер [A]/[B]/[C]/[D]/[ALL]
- [x] Роутинг киками через bridge_kick
- [x] Broadcast через say.py
- [x] last_uid.json
- [x] Whitelist отправителей
- [x] Логи
- [x] End-to-end тест

## v0.2.0 — устойчивость [ГОТОВО 2026-10-10]
- [x] Очередь отложенных (logs/queue.jsonl)
- [x] IMAP retry 3x
- [x] Тесты test_mailbot.py (23/23)

## v1.0.0 — завершённый проект (следующее)
- [ ] Копия в jewai/mail_bot/
- [ ] Строка в jewai/README.md
- [ ] CHANGELOG 1.0.0
- [ ] Пустая копия в projects/mail_bot/ (готово)

## Возможно позже
- Ответ агента почтой
- HTML-письма
- Вложения
