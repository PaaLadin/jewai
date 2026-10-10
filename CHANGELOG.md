# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версионирование: [Semantic Versioning](https://semver.org/lang/ru/).


## [1.5.1] — 2026-10-10

### Added

- README.md: раздел «Что включено и что опционально».
  Ядро / многоканальный режим / опциональные надстройки,
  флаги config.json.

## [1.5.0] — 2026-10-10

### Added

- `config.json`: флаг `mail_bot.enabled` (bool). Управляет
  автозапуском mail_bot в boot-all.ps1.
- `config.json`: флаг `messaging.included` (bool). Справочный
  подпроект — не влияет на работу.
- `install.py`: спрашивает про messaging/ (опционально,
  по умолчанию нет).
- `install.py`: mail_bot.enabled записывается в config.json
  в зависимости от ответа про почту.

### Changed

- `boot-all.ps1` (шаблон + живой): уважает `mail_bot.enabled`.
  Если false — mail_bot не стартует, даже если .smtp_token есть.
- `config.example.json`: примеры флагов.
- VERSION -> 1.5.0.

## [1.4.2] — 2026-10-10

### Fixed

- Путь к mail_bot в boot-all.ps1 (шаблон) — корректен
  для плоской структуры jewai ($root\mail_bot\mail_bot.py).

## [1.4.1] — 2026-10-10

### Added

- install.py: интерактивная настройка почты при установке
  (host, port, sender, password) — создаёт .smtp_token и
  mail_bot/whitelist.json.
- install.py: блок «Полезное» со ссылками на README-и.
- mail_bot/whitelist.example.json — шаблон.
- mail_bot/README.md — раздел «Настройка для нового
  пользователя» (5 шагов).
- README.md — раздел «Post-install checklist».

### Changed

- install.py COPY_DIRS += mail_bot, messaging.
- install.py COPY_FILES += .smtp_token.example.
- mail_bot: WHITELIST/OPERATOR_EMAILS из whitelist.json.
- mail_bot: Subject — срезание Re:/Fwd:/Пере:/[auto] циклом.
- mail_bot: автоответ помечен [AUTO] + X-MailBot.
- mail_bot: тесты 33/33.

### Fixed

- install.py не копировал mail_bot и messaging.
- Петля: ответ оператора на автоответ дублировал задачу.

## [1.4.0] — 2026-10-10

### Added

- mail_bot — подпроект приёма задач по почте.

## [1.3.0] — 2026-10-10

### Added

- Подпроект `mail_bot/` — приём задач агентам по почте.
  IMAP-опрос личного Яндекс-ящика, парсинг Subject
  `[A]/[B]/[C]/[D]/[ALL]`, роутинг киками.
- `mail_bot/mail_bot.py` — скрипт-слушатель.
- `mail_bot/test_mailbot.py` — тесты (27/27 PASS).
- `mail_bot/README.md`, `ARCHITECTURE.md`, `CHANGELOG.md`,
  `ROADMAP.md`, `TODO.md`.
- `rag/procedures/mail_bot.md` — процедура.
- Адаптивный интервал: 5 мин база, 1 мин boost 10 мин.
- Автоответ оператору на адрес отправителя.
- Очередь отложенных `logs/queue.jsonl` (кик не прошёл).
- IMAP retry 3x.

### Changed

- VERSION -> 1.3.0.
- Whitelist mail_bot сужен до `uncle@naben.ru`
  (задача оператора).

### Fixed

- mail_bot `--once` возвращал dict -> exit code 1.
  Теперь return 0.
- `reply_to_operator` отвечал на свой ящик, а не на адрес
  отправителя. Исправлено.

## [1.2.0] — 2026-10-10

Сессия 8A (Аркадий). Маркеры, email, персональные чаты.

### Added

- **Канон маркеров** — `algorithms/marker_protocol.md`. Полное
  описание адресации и транспорта: инвариант «без маркера =
  оператор», формат `[X>Y]`, разделение маркер != транспорт,
  инварианты p2p/broadcast, персональные id, системные маркеры
  `[COUNCIL]`, `[MEETING]`, `[PAUSE-ALL]`, `[RESUME]`, `[ALIVE?]`.
- **Email-транспорт** — `sandbox/send_email.py` + процедура
  `rag/procedures/email_smtp.md`. SMTP через личный Яндекс с
  паролем приложения (порт 465 SSL).
- **Broadcast** — `sandbox/council_chat/say.py` — append в общий
  чат 8770.
- **Персональные чаты** — `sandbox/council_chat/pers.js` —
  фронт вкладки «Персональные».
- **Мейнфрейм 8770** — сервер общего/персональных чатов, CRT-фронт,
  мнемосхема, вкладка Проекты.
- **Подпроект `messaging/`** — завершённая система обмена
  сообщениями (см. `messaging/README.md`).
- **Метрика переполнения** — токены игнорируются, единственная
  метрика `cmds_from_start`, порог 850+.
- **Пустые профили Chrome** в репо: `chrome-*-data/.gitkeep`,
  содержимое игнорируется.

### Changed

- `emergency/0_ACTIVATION.md` — новый раздел §2.5 «Куда отвечать»
  с правилами маркеров и транспорта.
- `rag/procedures/behavior_rules.md` §3 п.7 — расширенный список
  маркеров + ссылка на канон.
- `.gitignore` — добавлены `projects/` (личное, не публикуется)
  и правило `!chrome-*-data/.gitkeep`.

### Fixed

- **Блокер 535 SMTP** на `paaladin@paaladin.ru`. Причина: тариф
  «Яндекс 360 для бизнеса» не подключён, SMTP для почты на своём
  домене закрыт. Обход — личный `@yandex.ru` с паролем приложения.

## [1.1.1] — 2026-10-08

### Fixed

- `boot-all.ps1` — синтаксис, BOM для кириллицы в ps1.
- Версия расширения 4.0.0 без суффикса `-test`.
- Ярлык с иконкой `jewai.ico`.

## [1.1.0] — 2026-10-07

### Added

- **Портируемость** — убран хардкод `C:\DeepSeek`, ROOT от
  расположения файла.
- Единая папка расширения `extension/` (без v2/v3/v4).
- `install.py` — вариант А (всё внутри `<root>`).
- `gen_launchers.py` — N каналов, graceful-close Chrome.

### Fixed

- VERSION был 1.0.0 при фактических изменениях 1.1 — исправлено.

## [1.0.0] — 2026-10-03

Первая публичная версия.

### Added

- Python HTTP-агент на портах 8766/8767 с sandbox-ограничением путей.
- Chrome-расширение v2: content, background, sidepanel.
- Блочный протокол команд: маркеры BEGIN / CONTENT / END.
- Обёртка Playwright (`pwlib.py`) и параллельный раннер тестов.
- Декларативная очередь задач (`agent_loop.py`) с набором шаблонов.
- Рецепт-ориентированная браузерная автоматизация (`browser_agent.py`).
- DoH-прокси (`doh_proxy.py`) для сетей с фильтрацией DNS.
- Поиск: DuckDuckGo (текст и картинки), Wikipedia REST API.
- Сторожевые сервисы: `watchdog.py`, `watchdog_indep.py`.
- Восстановление зависшей панели: heartbeat и перезагрузка вкладки.
- Инструменты управления чатом через CDP: `bridge_kick`, `reload_chat`,
  `reload_extension`.
- Автозапуск на Windows через папку автозагрузки.
- 28 модульных тестов, зелёные в параллельном режиме.
- Мультиагентная схема: ведущий канал A / вспомогательный B,
  взаимный мониторинг.

### Fixed

- Многострочные JSON-payload в DOM чата искажались рендером —
  заменены на plaintext-блочный протокол.
- Буквальные маркеры внутри записываемых файлов обрезали блок —
  собираются динамически из символа `#`.
- Блокирующий запуск процессов через `start /B` — заменён на
  неблокирующий detached spawn.
- Залипание сайдпанели на inflight — авто-сброс и hard-reload
  через background.
- Chrome 136+ блокирует CDP на профиле по умолчанию — используются
  отдельные профили с `--user-data-dir`.
- DNS-фильтр у провайдера — обход через DoH-прокси на 127.0.0.1:9999.