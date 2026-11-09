---
title: Мост: команды и отчёты
tags: [мост, блоки, agent-report, id]
related: [functions/channels, troubleshooting/bridge_no_response]
updated: 2026-11-09
---

# Мост: команды и отчёты

Агент оборачивает команду в **блок** внутри трёх обратных кавычек. Мост ловит,
шлёт локальному Python, тот выполняет и возвращает `[AGENT REPORT]`.

## Формат блока

- Открывающая строка: три решётки + BEGIN + три решётки.
- Внутри — `id`, `op`, `path` (каждый на своей строке).
- Закрывающая: три решётки + END + три решётки.

## Операции

| op | Что | Поля |
|---|---|---|
| read | прочитать файл | path |
| list | список в папке | path |
| write | записать целиком | path + тело |
| mkdir | создать папку | path |
| delete | удалить | path |
| hash | sha256 файла | path |
| run | выполнить | cmd, cwd, timeout |

## Правила id

- 4 латинских заглавных + 4 цифры: `AAAB1234`.
- Только вверх, никогда не переиспользовать.
- Префикс по каналу: A=AAAB, B=BBAB, C=CCAA, D=DDAB, E=QQAA, F=FFAA.
- Мост возвращает `next_id` — продолжай с него.

## См. также

- [[functions/channels]]
- [[troubleshooting/bridge_no_response]]
