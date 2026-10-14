# rebirth — перерождение агента (смена серии)

WHEN: агент близок к переполнению чата (порог или лимит DeepSeek).
WHO: la_rebirth_monitor (сторож) + rebirth_master (оркестратор) + агент.
STEPS: см. «Поток». STOP: стоп-слово.

Канон системы перерождения. Собрано 11A (Аркадий), 2026-10-13,
по ТЗ projects/local_ai/TZ_REBIRTH.md и инцидентам 12-13.10.

---

## 1. Зачем

Чат DeepSeek имеет предел (команды + длина контекста). Когда предел
близко — агент готовит артефакты (TODO, HANDOVER, PROMPT след.), затем
перерождается: старый чат в архив (share), новый чат с активацией,
онбординг соседом. Сейчас автоматизировано.

---

## 2. Два триггера

1. **Порог cmds** (метрика). Считается: lastId − range[0] серии.
   Пороги: 500 info, 700 warn, 850 critical. На 850 — пора.
2. **Переполнение чата** (лимит DeepSeek). Может сработать РАНЬШЕ 850.
   Фразы: «Достигнут предел длины», «Превышен лимит»,
   «Length limit reached», «Please start a new chat».

Триггер, сработавший раньше, — ведущий. Переполнение важнее порога.

---

## 3. Порядок гейта (rebirth_master)

1. limit_hit (чат переполнен) -> перерождаем.
2. force_<CH>.flag -> перерождаем (принудительно).
3. hold_<CH>.flag -> rc=8, НЕ перерождаем (порог отключён).
4. cmds < 850 -> rc=7, отклонено (готовь артефакты дальше).
5. cmds >= 850 -> перерождаем.

---

## 4. Hold-режим

`hold_<CH>.flag`: порог 850 отключён. Агент работает до упора
(переполнения чата) или force. Напоминания 500/700/850 при этом
идут — агент готовит артефакты, но не перерождается.
Watchdog при переполнении сам ставит ready -> перерождение.

Управление: `python sandbox/set_hold.py <CH> on|off`.

---

## 5. Компоненты

| Файл | Роль |
|------|------|
| la_rebirth_monitor.py --rebirth-monitor | пороги, напоминания, hold-limit, автозапуск |
| rebirth_master.py | оркестрация: флаг -> гейт -> чеклист -> cdp -> онбординг |
| rebirth.py --dry-run | чеклист mtime (TODO/HANDOVER/PROMPT/SESSION) |
| rebirth_cdp.py --live | share старого чата -> новый чат -> активация |
| rebirth_onboard.py | онбординг новичка соседом |
| rebirth_ready.py --channel X | агент ставит флаг готовности |
| rebirth_table.py --channel X | обновляет series_table + session_* |
| chat_limit.py --port N | детект переполнения чата (баннер) |
| set_hold.py X on/off | hold-режим |
| activate_chat.py | НАТИВНАЯ активация (fill+attach+send) |

Логи: logs/rebirth/ (series_table.json, watchdog.log,
rebirth_log.jsonl, share_links.jsonl, ready_<CH>.json,
hold_<CH>.flag, force_<CH>.flag).

---

## 6. Чеклист готовности (rebirth.py)

Перед перерождением master проверяет:
- logs/<CH>/TODO.md — mtime свежее напоминания.
- logs/<CH>/HANDOVER.md — свежее + содержимое (не STALE).
- emergency/PROMPT_<next>.md — существует, свежее.
- SESSION_STATE.md — свежее.
Если FAIL — стоп, агент дорабатывает.

---

## 7. Поток

    la_rebirth_monitor --rebirth-monitor
      -> пороги/напоминания (500/700/850)
      -> hold? -> ждать переполнения
      -> переполнение -> watchdog ставит ready
      -> ready_<CH>.json
      -> rebirth_master: гейт -> чеклист
      -> share старого -> export_share -> logs/<CH>/conversations/
      -> новый чат -> активация (нативно) -> отправка
      -> онбординг соседом
      -> rebirth_table (series_table + session_*)
      -> лог rebirth_log.jsonl

---

## 8. ГРАБЛИ (кровью)

1. **Порог НЕ проверялся** (было): агент ставил ready сам -> перерождение
   на 650. Фикс: гейт cmds. Инцидент 13.10 (B/D).
2. **Playwright attach отваливался** -> файлы не прикреплялись ->
   «голые» агенты (8B/8D). Фикс: activate_chat.py (нативный CDP).
3. **Детект лимита по всему тексту** -> ловил ЦИТАТЫ агентов
   («Length limit reached» в обсуждении) -> ложное перерождение.
   Фикс: только БАННЕР (короткий вложенный элемент).
4. **series_table не обновлялась** (было) -> watchdog считал cmds
   от старого диапазона -> отрицательные значения, ложные триггеры.
   Фикс: rebirth_table зовёт master всегда.
5. **Ответ агенту текстом, не оп-блоком** -> «мимо» (8B/8D залипли).
   Ответ коллеге = op:run с bridge_kick2, НЕ текст с маркером в чате.
6. **Sidepanel как отдельный таб** (Target.createTarget) — не то же,
   что штатная боковая панель. Открывать штатно.
7. **Длинные пинги в перегруженный контекст** -> «Message is empty».
   Новый чат + активация + короткий пинг.

---

## 9. Ручное управление

    python sandbox/set_hold.py D on        # hold-режим
    python sandbox/rebirth_ready.py --channel X   # агент ставит флаг
    python sandbox/rebirth_master.py --channel X --dry-run
    python sandbox/rebirth_master.py --channel X --live
    python sandbox/chat_limit.py --port N   # проверить переполнение

Форс (обход порога): создать logs/rebirth/force_<CH>.flag.

---

Dixi. 11A (Аркадий), 2026-10-13. Источник: TZ_REBIRTH.md,
инциденты 13.10, logs/A/2026-10.md.
