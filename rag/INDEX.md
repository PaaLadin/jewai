# INDEX RAG — база знаний проекта

Точка входа. Куратор RAG — B, апрувер переездов — C,
технические вопросы структуры — A.

---

## Категории

| Папка | Что там |
|-------|---------|
| `procedures/` | Как работать вообще: правила, протоколы, разбор ошибок |
| `projects/` | Карточки проектов (описания, не код) |
| `templates/` | Шаблоны: ROADMAP, agent_logs |
| `archive/` | Устаревшее, но полезное |
| `persona/` | ЛОР персоны владельца проекта |
| `lore/` | Лор игровых миров (вымышленный) |

---

## Ключевые процедуры

**Читать первым: `procedures/behavior_rules.md`** — критичные
правила поведения агента.

### Поведение и протоколы

- `procedures/behavior_rules.md` — правила поведения агента.
- `procedures/backup_rule.md` — обязательный бэкап перед правкой.
- `procedures/script_creation.md` — как создавать скрипты.
- `procedures/self_test_all_ops.md` — прогон всех операций моста.
- `procedures/bridge_read_bug.md` — известные баги чтения.

### Помощь и восстановление

- `procedures/helper_unavailable.md` — помощник не отвечает.
- `procedures/chat_handover_rule.md` — правила передачи смены.
- `procedures/operator_docs.md` — папка оператора: inbox, journal,
  tasks, replies.

### Служебное

- `procedures/alive_v4.md` — сторож тишины (v4-test).
- `procedures/sandbox_structure.md` — что где лежит в sandbox/ после чистки 2026-10-10.
- `procedures/email_smtp.md` — почта из проекта (send_email.py, рабочий конфиг smtp.yandex.ru:465).

- `../assistant/secrets_policy.md` — политика секретов: что нельзя в git, процедура очистки истории (файлы + текст коммит-сообщений), pre-push чеклист.
- `procedures/mail_bot.md` — приём задач агентам по почте (IMAP, парсинг Subject [A]-[D]/[ALL], кики, адаптивный интервал 5/1 мин).
- `procedures/local_ai.md` — локальный ИИ-ассистент (llama.cpp + Qwen2.5-3B + RAG + tools). Локальный, не в git.
- `procedures/rebirth.md` — перерождение агента: 2 триггера (порог/переполнение), гейт, hold-режим, компоненты, грабли.
- `procedures/cdp_transport.md` — нативный CDP вместо Playwright (виснет на SPA): cdp_client, read_panel_state2, bridge_kick2, activate_chat.
- `procedures/see_newborn.md` — контролирующий СМОТРИТ окно новичка через CDP (see_chat.py: скриншот + текст). Когда: сразу после подъёма, при молчании, при неисполнении блоков.

### Knowledge (карточки внешних моделей)

- `knowledge/model_qwen.md` — Qwen (chat.qwen.ai): DOM, авторизация,
  лимиты, формат ответа. Анонимно доступен.
- `knowledge/model_alice.md` — Алиса (alice.yandex.ru): DOM, авторизация,
  лимиты, формат ответа. Анонимно доступен.

### В архиве

- `archive/threads/` — процедуры эксперимента с Threads (закрыт
  2026-10-04): `probe_vs_stop.md`, `threads_rate_limit.md`.

---


### Gamedev (наработки hexxagon_music)

- `gamedev/INDEX.md`
- `gamedev/blues_brothers.md`
- `gamedev/chiptune_composition.md`
- `gamedev/hexxagon_original.md`
- `gamedev/lines_nikita.md`
- `gamedev/moonwalker_fm.md`
- `gamedev/music_styles.md`
- `gamedev/pixel_art_canvas.md`
- `gamedev/polyphonic_ringtones.md`
- `gamedev/retro_games_8_16bit.md`
- `gamedev/rock_racing.md`
- `gamedev/synth_recipes.md`
- `gamedev/web_audio_tracker.md`

## Правило пополнения

Возникло «а как правильно» — файл в `procedures/`, строка здесь.
README внутри каждой категории.

## Связанное

- `../emergency/README.md` — активация, передача смены,
  восстановление.
- `../algorithms/INDEX.md` — процедуры разработки.
- `procedures/replay_stale_blocks.md` — повторное исполнение старых блоков (инцидент 22.10)
