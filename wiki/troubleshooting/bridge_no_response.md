---
title: Мост не отвечает
tags: [мост, agent-report]
related: [functions/bridge, troubleshooting/panel_stuck]
updated: 2026-11-09
---

# Мост не отвечает

Симптом: отправил блок, `[AGENT REPORT]` не приходит.

## Проверки

1. **Агент /ping** — `curl http://127.0.0.1:8766/ping`. Если нет — Chrome не запущен.
2. **Формат блока** — открывающая строка, `id/op/path` каждый на своей строке,
   закрывающая. Лишние теги (`tool_call`, `result`) — мост не парсит.
3. **Префикс id** — A=AAAB, B=BBAB и т.д. Неправильный префикс — панель не примет.
4. **Id монотонно вверх** — если переиспользован, панель может проигнорировать.

## Если ничего не помогло

Reload extension: `chrome://extensions/` — JewAI — Reload.
Или `reload_channels_native.py <CDP>`.

## См. также

- [[functions/bridge]]
- [[troubleshooting/panel_stuck]]