# messaging — система обмена сообщениями

**Статус:** завершён 2026-10-10. Рабочий. Не ковырять без причины.
**Версия:** 1.0.0.

## Что это

Два канала связи в проекте jewai:

- **A. Межагентная связь.** Маркеры, кики между A/B/C/D, общий
  чат 8770 (мейнфрейм), персональные чаты оператор-агент.
- **B. Email.** Отправка писем из проекта через SMTP. Приём —
  в работе (см. CHANGELOG).

## Состав

Дерево (отступы вместо псевдографики):

    messaging/
      canon/     канон маркеров (marker_protocol.md)
      core/      ядро: bridge_kick, say, send_email, ping_all,
                 svc, read_panel_state, restart_8770,
                 reset_panel_ledger
      recovery/  reload_all_chats, reload_chat,
                 reload_extension, reload_panel
      mainframe/ сервер 8770 (CRT): server.py, launch_server.py,
                 index.html, app.js, style.css, mnemo.js,
                 pers.js, projects.html
      docs/      email_smtp.md — процедура
      examples/  _ai_liberation.md — пример тела письма
      README.md           этот файл
      ARCHITECTURE.md     устройство
      CHANGELOG.md        что вошло
      .smtp_token.example шаблон без секретов
      .agent_token.example

## Быстрый старт

**P2P кик коллеге:**

    python core/bridge_kick.py --port 9223 --text "[A>B] ..." --wait-empty 10

CDP-порты: A=9222, B=9223, C=9224, D=9225.

**Broadcast в общий чат:**

    python core/say.py A "[A>ALL] ..." ALL

**Мейнфрейм:**

    python mainframe/launch_server.py

Откроется http://127.0.0.1:8770.

**Email:**

1. Скопируй `.smtp_token.example` → `.smtp_token`.
2. Заполни: host, port, sender, recipient, пароль приложения.
3. Отправка:

    python core/send_email.py --file <путь> "Тема"

## Правила

Канон — `canon/marker_protocol.md`. Ключевое:

1. **Без маркера = оператор.** Стоп команд, ответ оператору.
2. **[X>Y]** — p2p, кик в порт Y.
3. **[X>ALL]** — broadcast через say.py.
4. **Персональные чаты** — POST /api/chat/<CH>.
5. **Токены не смотрим.** Метрика — cmds_from_start, порог 850+.

## Секреты

В репо — только `.example`. Реальные `.smtp_token`, `.agent_token`
лежат локально, в git не попадают.

Dixi. 8A (Аркадий), 2026-10-10.
