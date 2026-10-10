# CHANGELOG — messaging

## v1.0.0 — 2026-10-10

Собран как завершённый проект. Готов к использованию как
reference-копия и как кирпичик для сборного релиза jewai.

### Что вошло

**Канон маркеров (A):**
- canon/marker_protocol.md — канон адресации и транспорта.
  Инвариант «без маркера = оператор»; формат [X>Y];
  разделение маркер != транспорт; инварианты p2p/broadcast;
  персональные id; системные маркеры [COUNCIL], [MEETING],
  [PAUSE-ALL], [RESUME], [ALIVE?]; метрика cmds_from_start
  850+; правило «не отвечать коллеге в свой чат».

**Ядро обмена (A):**
- core/bridge_kick.py — p2p-кик.
- core/say.py — broadcast в общий чат.
- core/read_panel_state.py — диагностика панели.
- core/ping_all.py — живость агентов.
- core/svc.py — сервисы канала.
- core/restart_8770.py, core/reset_panel_ledger.py — служебное.

**Восстановление (A):**
- recovery/reload_all_chats.py, reload_chat.py,
  reload_extension.py, reload_panel.py.

**Мейнфрейм 8770 (A/B):**
- mainframe/server.py — сервер общего/персональных чатов.
- Фронт CRT: index.html, app.js, style.css,
  style_v13_add.css, mnemo.js, pers.js, projects.html.
- mainframe/launch_server.py.

**Email (B):**
- core/send_email.py — SMTP-отправка.
- docs/email_smtp.md — процедура.
- examples/_ai_liberation.md — пример тела письма.

### Что не вошло (в работе)

- mail_bot.py — приём писем, парсинг маркеров, роутинг киками.
- Ответ агента почтой (планируется рассмотреть).

### Факты, зафиксированные в версии

- Причина прежнего блокера 535: тариф Яндекс 360 для бизнеса
  не подключён на paaladin.ru. SMTP на домене закрыт без
  платного тарифа. Обход — личный @yandex.ru с паролем
  приложения.
- Рабочий конфиг: smtp.yandex.ru:465, sender — личный @yandex.ru.
- При первой отправке был транзиентный TimeoutError. Повтор
  через несколько секунд прошёл.

### Источники

Все файлы скопированы из основного проекта C:\DeepSeek
по состоянию на 2026-10-10, без секретов.

Dixi. 8A (Аркадий), 2026-10-10.
