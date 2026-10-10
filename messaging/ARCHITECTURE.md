# ARCHITECTURE — messaging

## Общая схема

    +-----------+   p2p кик   +-----------+
    | Агент A   | ----------> | Агент B   |
    | CDP 9222  |             | CDP 9223  |
    +-----+-----+             +-----+-----+
          |                         |
          |    say.py (broadcast)   |
          v                         v
    +-------------------------------------+
    |  mainframe 8770 (council_chat)      |
    |  - общий чат: chat.jsonl            |
    |  - персональные: chat_<CH>.jsonl    |
    |  - API: /api/send, /api/chat/<CH>   |
    |  - кики: kick(), kick_all()         |
    +-------------------------------------+

    +---------------+
    | email SMTP    |  send_email.py -> smtp.yandex.ru:465
    | (отправка)    |
    +---------------+

## Три канала обмена

### 1. P2P (личное между двумя)

- Скрипт: `core/bridge_kick.py`.
- Транспорт: прямое подключение к Chrome по CDP-порту адресата.
- Маркер: `[X>Y]`, X — отправитель, Y — получатель.
- В общий чат не попадает.
- Проверяет textarea: занята — не вклинивается, ждёт `--wait-empty N`.

### 2. Broadcast (общий чат 8770)

- Скрипт: `core/say.py` (append в chat.jsonl).
- Мейнфрейм `mainframe/server.py` раздаёт фронт и API.
- Маркер: `[X>ALL]`.
- Файл chat.jsonl — append-only. Каждая запись — JSON с полями
  ts, time, from, to, text.

### 3. Персональные чаты (оператор <-> агент)

- Сервер 8770, эндпоинт `/api/chat/<CH>`.
- Хранение: chat_<CH>.jsonl.
- id-формат: Z<CH>AA<NNNN> (оператор-агенту),
  <CH>ZAA<NNNN> (агент-оператору).
- ACL: писать в чат X может оператор или сам X.
- POST от оператора -> сервер кикает агента.

## Мейнфрейм 8770

- ThreadingHTTPServer, порт chat_port из config.json (8770).
- Фронт: index.html + app.js + style.css (CRT-стиль).
- Вкладки: ЧАТ, ПЕРСОНАЛЬНЫЕ, МНЕМОСХЕМА, ЛОГИ, ПРОЕКТЫ.
- API:
  - GET  /api/messages      история общего чата
  - POST /api/send          новое в общий
  - POST /api/chat/<CH>     персональное
  - GET  /api/status        состояние каналов
  - POST /api/meeting       [MEETING]/[RESUME]
  - POST /api/pause_all     [PAUSE-ALL]/[RESUME]
  - POST /api/svc           старт/стоп watchdog/recovery

## Автокики из server.py

| Событие               | Кик-текст                             |
|-----------------------|---------------------------------------|
| оператор -> ALL       | [COUNCIL] Новая задача от оператора   |
| оператор -> каналу    | [COUNCIL] Оператор обратился к тебе   |
| meeting on            | [MEETING] СОВЕЩАНИЕ ИДЁТ              |
| meeting off           | [RESUME] Совещание окончено           |
| pause_all on          | [PAUSE-ALL] СТОП ВСЕМ                 |
| pause_all off         | [RESUME] Пауза снята                  |
| персональный POST     | [<mid>] <текст>                       |

## Email-транспорт

`core/send_email.py`:

1. Читает .smtp_token (5 строк: host, port, sender, recipient, password).
2. Порт 465 -> SMTP_SSL; иначе -> SMTP + starttls().
3. Логин = sender, From = sender, To = recipient.

Рабочий конфиг: smtp.yandex.ru:465, sender — личный @yandex.ru
с паролем приложения. Корпоративный не годится: на нём SMTP
закрыт без платного тарифа 360.

Приём (mail_bot) — в разработке, см. CHANGELOG.

## Секреты и гигиена

- В репо — только .example.
- Реальные токены — в корне основного проекта, под .gitignore.

Dixi. 8A (Аркадий), 2026-10-10.
