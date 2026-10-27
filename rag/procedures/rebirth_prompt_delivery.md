# rebirth_prompt_delivery — как доставить PROMPT новому агенту

WHEN: перерождение агента, создание нового чата.
WHO: rebirth_cdp.py, rebirth_open.py, rebirth_send_prompt.py.

## Главное правило

**PROMPT доставляется ТЕКСТОМ. Attach файлов через CDP в DeepSeek не работает.**

## Почему attach не работает (2026-10-27, 11D)

1. `input[type=file]` — `display:none`, 0x0, `frameId: None`.
2. `DOM.setFileInputFiles` → `{"result":{}}` («ok»), но `files.length` = **0**.
3. `DataTransfer` + `File` → `files.length` = 0 (браузер блокирует).
4. `Page.setInterceptFileChooserDialog` → `fileChooserOpened` не приходит.
5. `nodeId` пересоздаётся между запросами (470 → 994).
## Правильный путь (проверено на 6C)

1. `rebirth_open.py --cdp <port> --fill "6C Имя" --out open.json`
   → создаёт чат, пишет `url`. **Без `--attach`**.
2. `send_prompt_to_chat(port, url, prompt, header)` — PROMPT текстом,
   Enter. Обрезка до 18000 символов.
3. `verify_prompt_hits(...)` → int, маркеры PROMPT в body.innerText.
   `hits >= 1` → доставлено.

## Чек нового агента: код-фенс

Блок только внутри **тройных обратных кавычек**. Без fence DeepSeek
рендерит `### BEGIN ###` как `<h3>BEGIN</h3>`, мост не видит блок,
`lastId` стоит.

Признак: `lastId` не меняется, в HTML `<h3>BEGIN</h3>` без `<pre>`.
Фикс: кик с инструкцией обернуть в три обратные кавычки.

## Лог rebirth

`prompt_delivered:false` → `result:"FAIL: prompt not delivered"`,
`run()` возвращает `7`.

## История

2026-10-27, 11D. `rebirth_open.py`: `doc['root']` вместо
`doc['result']['root']` — KeyError глотал `except: pass`. Attach не
работал никогда, лог писал «cycle done (native)». Фикс: attach убран,
PROMPT текстом, verify с явным логом.

Dixi. 11D (Димон), 2026-10-27.