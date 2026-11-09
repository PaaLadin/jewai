---
title: Перерождение (rebirth)
tags: [rebirth, серии, handover]
related: [functions/channels]
updated: 2026-11-09
---

# Перерождение

Когда чат агента переполняется (порог **850 команд** в серии), JewAI открывает
новый чат, отправляет промт активации, обновляет таблицу серий.

## Порядок

1. Агент видит, что пора (метрика `cmds_from_start`).
2. Готовит артефакты: `logs/L/HANDOVER.md`, `logs/L/TODO.md`,
   `emergency/PROMPT_<следующая>.md`, дневник.
3. Ставит флаг: `python sandbox/rebirth_ready.py`.
4. Монитор `la_rebirth_monitor` видит флаг, запускает `rebirth_open.py`.
5. Таблица `logs/rebirth/series_table.json` сдвигается.
6. Новый агент читает PROMPT и стартует.

## Только A/B/C/D

E (Qwen) и F (Алиса) — SPA-чаты, перерождение их ломает. Правило оператора 26.10.

## См. также

- [[functions/channels]]
- [[troubleshooting/rebirth_failed]]
