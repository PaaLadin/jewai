---
title: Rebirth не создал новый чат
tags: [rebirth, ошибка]
related: [functions/rebirth]
updated: 2026-11-09
---

# Rebirth не создал новый чат

Симптом: монитор `la_rebirth_monitor` видит флаг, но новый чат не появился.

## Проверки

1. `logs/rebirth/rebirth_log.jsonl` — последние записи, `result` и `new_url`.
2. `logs/rebirth/series_table.json` — сдвинулась ли серия.
3. PROMPT — `emergency/PROMPT_<следующая>.md` существует.

## Ручной запуск

`python sandbox/rebirth_open.py --channel X`

## Guard

Если `new_url` пуст — rebirth НЕ должен сдвигать таблицу. Иначе следующий
агент получит неправильный диапазон и не запустится.

## См. также

- [[functions/rebirth]]
- [[functions/channels]]