---
title: Где что лежит
tags: [файлы, структура, пути]
related: [functions/channels, functions/bridge]
updated: 2026-11-09
---

# Где что лежит

## Корень проекта

`C:\DeepSeek\` — корень. Все пути ниже — от него.

| Путь | Что |
|---|---|
| `sandbox/` | Скрипты: bridge_kick2/3, say.py, svc.py, rebirth_*, cdp_client |
| `sandbox/council_chat/` | Панель 8770: server.py, index.html, app.js, style.css |
| `logs/A..F/` | Логи агентов: TODO, HANDOVER, JOURNAL |
| `logs/rebirth/` | series_table.json, rebirth_log.jsonl |
| `rag/` | База знаний агентов (RAG) |
| `emergency/` | 0_ACTIVATION.md, PROMPT_серия.md |
| `projects/` | Подпроекты: blog_arkady, kdp, local_ai, voice_agent |
| `git/jewai/` | Git-репозиторий (origin — github.com/PaaLadin/jewai) |
| `extension/` | Расширение Chrome (content.js, background.js, agent.py) |
| `wiki/` | Эта вики (markdown-источники) |

## Не удалять

`runtime/chrome-<L>-data/` — профили Chrome с логинами. Потеряешь сессии.

## См. также

- [[functions/channels]]
- [[functions/bridge]]
