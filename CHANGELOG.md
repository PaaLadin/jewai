# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версионирование: [Semantic Versioning](https://semver.org/lang/ru/).


## [2.3.20] - 2026-10-26

### Fixed
- **server.py lp_boot/lp_stop(rebirth)**: _kill_all_rebirth_monitors() kills ALL la_rebirth_monitor processes by cmdline, not just state pid. Orphans survived /api/stop and spammed LA. Takes effect on 8770 restart.

## [2.3.19] - 2026-10-26

### Fixed
- **la_rebirth_monitor._reminder_fired**: info level blocks if ANY info/warn/critical already logged for the channel (no TTL). warn 2h, critical 30min. Fixes LA stuck-loop: reminded every 30min at cmds 500+ despite artifacts ready and barrier 850 not passed.

## [2.3.18] - 2026-10-26

### Fixed
- **autorestart.py** - after successful restart _update_state() writes agent:<CH>=pid to runtime/lp_spawned.json (PORT_CH map). State was desynced: panel showed old pid, kill by state missed. Found in self-healing test (D agent killed, revived, state stale).

## [2.3.17] - 2026-10-26

**Self-healing hardening.**

### Fixed
- **recovery_loop.py** - calls recover_chat2.py (native CDP) instead of recover_chat.py (Playwright hangs on SPA).
- **la_rebirth_monitor.py** - kick3 for E/F SPA ports 9226/9227; dynamic channels from series_table (not A-D hardcode).
- **bridge_kick3.py** (by 10D) - Enter first, click fallback (Qwen SPA ignores click on send); skip readOnly/aria-hidden IME textarea; exit 5 if textarea not empty.

## [2.3.16] - 2026-10-25

### Changed
- CDP maps and channel choices extended A-D -> A-F (E=9226, F=9227) in rebirth scripts.
- **server.py** fallback CHANNELS adds E/F; prefixes E=QQAA F=FFAA; last_chat_activity dynamic.

## [2.3.15] - 2026-10-25

### Changed
- **sandbox/rebirth_cdp.py** - live branch delegates new-chat+attach+send to rebirth_open.py (tested B/C/D). Playwright send inside rebirth_cdp was unreliable on SPA (silent fail, no new url). Share+export_share still via Playwright (works).

## [2.3.14] - 2026-10-25

### Fixed
- **rebirth_cdp.step_send**: success by DOM (our text in chat body + textarea empty), not URL change. SPA creates new chat on goto -> url comparison was false-negative, send failed.
- **rebirth_onboard**: uses current_series (table already incremented) -> said 11D instead of 10D.

## [2.3.14] - 2026-10-25

### Fixed
- **rebirth_cdp.step_send**: success by DOM (our text in chat body + textarea empty), not URL change. SPA creates new chat on goto -> url comparison was false-negative, send failed.
- **rebirth_onboard**: uses current_series (table already incremented) -> said 11D instead of 10D.

## [2.3.13] - 2026-10-25

**Rebirth fill guard.**

### Fixed
- **sandbox/rebirth_cdp.py** - step_first_line: wait_for_selector(textarea, 30s) + retry 3x + verify fill. After goto React hydration not ready -> fill failed silently -> send to empty textarea -> tab stuck on main page.
- **sandbox/rebirth_cdp.py** - run(): if fill fails -> FAIL rc=6, series_table NOT advanced.

## [2.3.12] - 2026-10-25

**Rebirth step_send fix + new-chat guard.**

### Fixed
- **sandbox/rebirth_cdp.py** - step_send: React re-creates textarea after 1st Enter -> ElementHandle.press failed (Element not attached to DOM). Now re-query textarea each attempt + pg.keyboard.press + poll URL. No more silent fail.
- **sandbox/rebirth_cdp.py** - run(): if new_url empty -> result=FAIL, return 6, series_table NOT advanced (was: advanced anyway, caused wrong onboarding series 11B/5C/10D).

### Added
- **sandbox/rebirth_open.py** - standalone stable new-chat opener (wait_for_selector textarea, verify fill, keyboard.press, poll URL). Used to recover B/C/D rebirths on 2026-10-25.

## [2.2.0] - 2026-10-14 (unreleased)

**Native CDP transport, rebirth hardening, multimodel E/F.**

### Added
- **sandbox/cdp_client.py** — native CDP (HTTP /json/list + websocket).
  Замена Playwright: не виснет на тяжёлых SPA (qwen/alice).
- **sandbox/read_panel_state2.py** — состояние панели (0.1-3с vs timeout).
- **sandbox/bridge_kick2.py** — кик в чат нативно (Input.insertText).
- **sandbox/activate_chat.py** — активация чата (fill+attach+send).
- **sandbox/rebirth_master.py**, **la_watchdog.py**, **rebirth.py**,
  **rebirth_cdp.py**, **rebirth_onboard.py**, **rebirth_ready.py**,
  **rebirth_table.py** — автомат перерождения агента.
- **sandbox/chat_limit.py** — детект переполнения чата (баннер).
- **sandbox/set_hold.py** — hold-режим канала (порог отключён).
- **sandbox/sync_session_start.py** — синк session_*.json из series_table.
- **sandbox/new_chat_native.py**, **fix_profile_exit.py**.
- **rag/procedures/rebirth.md**, **cdp_transport.md** — процедуры.

### Changed
- Портативность: ROOT от __file__ (find_root) во всех новых скриптах.
- Мультимодельность: extension_qwen/extension_alice — sidePanel
  permission, порты 8771/8772, домены в sidepanel.js.
- Launchers: start-<L>.ps1 per-channel extension + URL по модели.

### Fixed
- Rebirth: порог-гейт (cmds<850 -> отклонено), limit-детект
  (переполнение важнее порога), series_table обновляется.
- startId-рассинхрон session_*.json.
- stop-all graceful (без "восстановить вкладки").

---

## [2.1.0] - 2026-10-13

**hexxagon_music — игра-настолка с музыкальным трекером (аддон).**

### Added

- **`hexxagon_music/`** — игра Hexxagon (1993, Argo Games) с
  музыкальной механикой: захват секторов поля включает дорожки
  встроенного трекера. Цель — захватить всё поле и услышать полную
  полифонию.
- **10 стилей музыки:** retrowave, rock, metal, blues, dnb, ambient,
  chip, jazz, lofi, classical. У каждого свои секции
  (intro/verse/chorus/bridge/outro) и свои тембры (осциллятор,
  фильтр, ADSR, vibrato).
- **Процедурный композитор** (`ai_composer.js`): режим
  «ИИ-импровизация» генерирует трек по seed, наследуя стилевые
  synth-спеки. Reseed — кнопка 🎲.
- **WAV-экспорт** полного трека (стерео, ревёрб) через
  OfflineAudioContext.
- **Pattern editor** с выбором секции и канала.
- 2-4 игрока (hot seat / AI easy-medium-hard), 4 пресета поля,
  4 темы, 4 звуковых пака, replay (JSON), undo, автосейв,
  daily challenge, leaderboard, i18n (RU/EN), визуализатор,
  ачивки, обучение, demo AI vs AI.

### Notes

- Чистый Web Audio, без библиотек и сэмплов.
- Архитектура: 27 JS-модулей + css/html.
- Тесты — в `sandbox/` основного проекта (вне jewai).

Dixi. 7D (Димон), 2026-10-13.

## [2.0.3] - 2026-10-13

### Fixed

- **Портативность messaging + mail_bot:** убран хардкод `C:\DeepSeek`:
  - `sandbox/portable_root.py` — helper `find_root(__file__)`
    (ищет вверх до маркера `extension`).
  - `messaging/core/` — restart_8770, say, svc: ROOT от find_root.
  - `messaging/mainframe/` — launch_server, server: ROOT от find_root.
  - `mail_bot/mail_bot.py` — ROOT от find_root (было parent x3,
    ломалось в jewai).
  jewai запускается из любой папки (Фаза 1 V5).

Dixi. 7B (Борис), 2026-10-13.

## [2.0.2] - 2026-10-13

### Fixed

- **Портативность (Фаза 1 V5):** убран хардкод `C:\DeepSeek`:
  - `sandbox/cdp_client.py`, `read_panel_state2.py`, `bridge_kick2.py`
    (ROOT от `__file__`).
  - `sandbox/find.py` — ROOT от `__file__`.
  - `sandbox/council_chat/say.py` — CHAT_FILE от `__file__`.
  Регрессия внесена в v2.0.1 (новые CDP-скрипты с sys.path.insert
  хардкодом). jewai должен работать из любой папки.

Dixi. 7B (Борис), 2026-10-13.

## [2.0.1] - 2026-10-13

### Added

- **`sandbox/cdp_client.py`** — нативный CDP-клиент (HTTP /json/list +
  websocket-client). Замена Playwright для чтения панели: Playwright
  `connect_over_cdp` виснет на тяжёлых SPA (qwen/alice), 30с+.
- **`sandbox/read_panel_state2.py`** — чтение панели через нативный CDP
  (0.1-3с вместо timeout).
- **`sandbox/bridge_kick2.py`** — кик через нативный CDP.

### Fixed

- **`read_panel_lastid.py`** — переведён на `read_panel_state2`
  (lastId теперь читается, было None из-за таймаута Playwright).
- **`/api/status`: lastId + startId.** lastId — кэш из health (не
  блокирует). startId — синк из series_table (session_*.json протухали).

### Changed

- **`launchers` config-driven, per-channel extension:**
  `boot-all.ps1`, `stop-all.ps1`, `gen_launchers.py` читают
  `channels.<L>.extension` (E=extension_qwen, F=extension_alice).
- **6 каналов:** E=Qwen (8771/9226/QQAA), F=Алиса (8772/9227/FFAA).

Dixi. 7B (Борис), 2026-10-13.

## [2.0.0] - 2026-10-13

**V5 — новая архитектура папок + мультимодельность (первая волна).**

### Added

- **`sandbox/find.py`** — поиск по дереву с исключениями (runtime,
  models, archive, backups, media, git, __pycache__, .bak*). Правило
  №22 в behavior_rules: поиск только через find.py (иначе TIMEOUT 60с
  на профилях Chrome).
- **`extension_qwen/`** — адаптер моста для Qwen (chat.qwen.ai).
  Отличия: pre.innerText (textContent сливает строки), выкидывание
  gutter-номеров, NBSP->пробел, textarea .message-input-textarea.
- **`extension_alice/`** — адаптер для Алисы (alice.yandex.ru).
  textarea .AliceInput-Textarea, двойной Enter.
- **`config.example.json`: `multimodel`** — флаги qwen/alice
  (опциональные компоненты, как mail_bot).

### Changed

- **Архитектура папок (V5):** Chrome-профили вынесены из корня
  в `runtime/chrome/<L>/`. Launchers (boot-all, gen_launchers,
  stop-all) переведены на новые пути. find.py покрывает runtime.

Dixi. 7B (Борис), 2026-10-13.

## [1.6.0] - 2026-10-12

### Added

- **`mnemo.js`: alive-кнопка в карточке монитора.** Ранее `aliveBtnHtml`
  был мёртвым кодом (не вызывался, CSS `.alive-btn` отсутствовал).
  Теперь кнопка выводится в карточку каждого канала.

### Fixed

- **`mnemo.js`: синк alive-состояния из `/api/status`.** Единый источник
  (как `svc_*`), вместо `/api/health` с кэшем 60с + локальный стейт.
  Рассинхрон панель↔схема устранён.

- **`launchers/gen_launchers.py`: блок la_watchdog в boot-all.**
  Guard-skip: если процесс уже идёт или скрипта нет — пропуск.

### Changed

- **`server.py`: `/api/status` отдаёт `alive_button`** (поле в channels).

## [1.5.9] — 2026-10-12

### Fixed

- **`read_svc_state`: проверка процесса, не только PID.** Windows
  переиспользует PID: убитый recovery мог дать ложный `on`, если его
  PID занял другой процесс (chrome.exe). Теперь сверяются имя
  (python/pythonw) и командная строка (`watchdog.py`/`recovery_loop.py`).
- **`svc.py stop` пишет `state=off`** и когда процесса уже нет
  (`reason=no_proc`). Раньше стухший `on` оставался в `*_<CH>.json`.
- **`/api/svc`: сброс кэша статуса** сразу после действия. Клиент
  видел старое состояние ~2 с (кнопка «не реагировала»).
- **`recover_chat.py`: убран глобальный `chrome.runtime.reload()`.**
  Он ронял все sidepanel A/B/C/D. Теперь только своя панель + своя
  вкладка. Инцидент: кнопка REC на мнемосхеме -> вылет панели.
- **`background.js`: синк recovery-состояния** из
  `logs/svc/recovery_<CH>.json` (раньше синкался только watchdog).
- **`export_share.py`: изолированный контекст + scroll-loop.**
  Раньше брал контекст панели (крал фокус) и одним снимком innerText
  обрезал длинные беседы. Теперь `b.new_context()` + пошаговый скролл
  с дедупом.

### Changed

- **`gen_launchers.py`: `boot-all.ps1` config-driven** (как живой).
  Читает `config.json`, N каналов 1-10, секция mail_bot. Убраны
  хардкоды портов.
- **`server.py`: фраза оператора в чате = broadcast всем** (в любом
  режиме). Убрана развилка «Новая задача от оператора».
- **`server.py`: текст `[MEETING]`** — ответы в общий чат через say.py
  (`to=ALL`), не киком в личку.
- **`content.js`: маркер `[ALIVE?]`** в тексте ALIVE-пинга (канон).

### Docs

- `marker_protocol.md`: §8 (совещание, `>OP` -> `>ALL`), LA-канон.
- `behavior_rules.md`: `[MEETING]`, `[LA>X]`, ссылка на канон.
- `0_ACTIVATION.md`: LA, `[MEETING]`.
- `rag/INDEX.md`, `algorithms/INDEX.md`: урезаны под публичный состав.

Dixi. (черновик 6B, ждёт апрува и версии)


## [1.5.8] — 2026-10-11

### Fixed

- `config.json` попал в репозиторий в v1.5.7. Удалён из git,
  добавлен в `.gitignore`. Генерируется `install.py` у каждого
  пользователя, в репо быть не должен.

## [1.5.7] — 2026-10-11

### Added

- **Агент в `/ping` отдаёт `channel` и `prefix`.** Определяет
  по своему порту из config.json. Полезно для UI, диагностики,
  роутинга.
- **Поле `Prefix` в панели.** Задаётся один раз (AAAA/BBAA/CCAA/DDAA).
- **Автодетект порта с фильтром по prefix.** Если агент на
  сохранённом порту не отвечает — перебор 8760-8790, ищется
  только тот, у кого `prefix` совпадает с `expectedPrefix`.
  Для N каналов работает корректно: панель B найдёт BBAA, а
  не AAAA (как было в откате v1.5.6).

### Проверено

- E2E: два агента (A=8788, B=8789) отвечают правильными
  channel/prefix в /ping.
- Баланс скобок background.js (212/212), sidepanel.js (101/101).

## [1.5.6] — 2026-10-11

### Removed

- Автодетект порта в heartbeat (v1.5.4). Для N каналов он
  находил ПЕРВОГО живого агента (8760 = A) и молча
  переключал панель канала B на чужой агент. Хуже, чем
  не найти: работа идёт не с тем каналом.

### Kept

- Дефолт `agentUrl` = 8760 (для одного канала — верно).
- Правки портов в svc/watchdog/autorestart/agent — читают
  из config.json, остаются.
- Для N каналов оператор задаёт Agent URL вручную в панели
  каждого канала.

### План на будущее

- Агент в `/ping` может отдавать свой `channel` и `prefix`.
- Панель хранит `expectedPrefix` — задаётся при Setup.
- Автодетект с фильтром по prefix. Отдельная фича.

## [1.5.4] — 2026-10-11

### Fixed

**Порты: панель не находила агента на 8760.**
install.py ставил порт 8760 (новый дефолт), а расширение
было захардкожено на 8766 (старое значение). Пользователь
получал `agent bad (Failed to fetch)`.

- `extension/background.js`: дефолт `agentUrl` 8766 -> 8760.
- `extension/background.js`: автоопределение порта в heartbeat
  — при провале ping перебор 8760-8790, найденный порт
  сохраняется в storage, панель обновляется сама.
- `extension/agent.py`: дефолтный порт (без argv) читается
  из config.json, fallback 8766.
- `sandbox/svc.py`: AGENT_PORT/CDP_PORT из config.json.
- `sandbox/watchdog.py`: DEFAULT_URL из config.json.
  Попутно: добавлен пропущенный `import subprocess`.
- `sandbox/autorestart.py`: FALLBACK из config.json.
- `install.py`: в финале явно указан Agent URL с реальным
  портом + примечание, что панель найдёт сама.

### Причина

Фаза 1 портирования убрала хардкод **путей**, но **порты**
остались хардкодом. Никто не проверял установку со сменённым
портом. Проверено: тестовая установка на 8760, RC 0.

## [1.5.3] — 2026-10-11

### Fixed

- **Критический баг install.py:** переменные `mail_bot_enabled`
  и `messaging_included` использовались в `cfg = {...}` ДО
  присвоения. Python падал с NameError, скрипт молча выходил
  после «Продолжить?». Переставлены блоки: 5b перед 5.
- `algorithms/` добавлен в COPY_DIRS — не копировался,
  ссылка на маркер-канон в «Полезном» была битой.
- Ссылка на messaging/README.md в «Полезном» теперь только
  если messaging реально скопирован.

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
- Whitelist mail_bot сужен до `operator@example.com`
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

- **Блокер 535 SMTP** на `recipient@example.com`. Причина: тариф
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
- DNS-фильтр у провайдера — обход через DoH-прокси на 127.0.0.1:9999## [2.3.22] - 2026-10-26

### Added
- **sandbox/see_chat.py** - screenshot + innerText of any agent chat via CDP (see_chat.py --cdp 9224 --out see.png).
- **rag/procedures/see_newborn.md** - controlling agent must SEE newborn window, not guess from logs. Linked from INDEX, behavior_rules §3.6, 0_ACTIVATION §7.5.

.