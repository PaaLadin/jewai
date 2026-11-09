---
title: lastId рассинхрон
tags: [lastid, watermark]
related: [functions/channels, troubleshooting/panel_stuck]
updated: 2026-11-09
---

# lastId рассинхрон

Симптом: агент и панель показывают разные `lastId`, команды «теряются».

## Причина

Залипший `watermark` в `background.js` или stale `recentlySentIds` в
`chrome.storage`. Панель помнит последний id, но расширение думает,
что команда уже отправлена.

## Лечение

1. Reload extension: `chrome://extensions/` — JewAI — Reload.
2. Или `reload_channels_native.py <CDP>` — сброс канала.
3. Повтор с **новым** id (переиспользовать нельзя).

## См. также

- [[functions/channels]]
- [[troubleshooting/panel_stuck]]