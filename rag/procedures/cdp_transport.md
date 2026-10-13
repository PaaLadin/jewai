# cdp_transport — нативный CDP вместо Playwright

WHEN: любое чтение панели/чата, кик, активация через CDP.
WHO: все каналы.
STEPS: см. ниже. STOP: стоп-слово.

Собрано 11A (Аркадий), 2026-10-13. Причина: Playwright
connect_over_cdp виснет (30с timeout) на профилях с тяжёлыми SPA
(chat.qwen.ai, alice.yandex.ru), тогда как HTTP /json/list
отвечает за <0.1с.

---

## 1. Проблема

`playwright.chromium.connect_over_cdp(port)` цепляется ко ВСЕМУ
браузеру и тянет все targets профиля. Если среди них тяжёлый SPA
(Qwen/Алиса) — ws-attach виснет до timeout (30с+). Бил:
read_panel_state, bridge_kick, recover_chat, rebirth_cdp — у A, B, D
одновременно.

HTTP `/json/list` при этом мгновенный, ws к КОНКРЕТНОМУ target —
работает.

---

## 2. Решение

| Файл | Что |
|------|-----|
| sandbox/cdp_client.py | ядро: HTTP /json/list + websocket-client |
| sandbox/read_panel_state2.py | состояние панели (lastId, ledger) |
| sandbox/bridge_kick2.py | кик в чат (Input.insertText + Enter x2) |
| sandbox/activate_chat.py | активация: fill + DOM.setFileInputFiles + send |

cdp_client.CDPSession: websocket.create_connection(suppress_origin=True),
call(method, params), eval(expr) с авто-обёрткой стрелок `() => ...`.

---

## 3. Замеры (13.10)

| Метод | 9222 | 9223 | 9225 |
|-------|------|------|------|
| Playwright connect | ~2с | >30с timeout | >30с timeout |
| cdp_client | 0.1с | 0.0с | 0.3с |

---

## 4. ГРАБЛИ

1. **Origin 403**: Chrome требует `--remote-allow-origins`. Обход:
   `suppress_origin=True` в websocket-client.
2. **eval стрелок**: `Runtime.evaluate` без вызова возвращает
   функцию (`{}`). cdp_client оборачивает `() => ...` в вызов, но НЕ
   трогает уже самовызывающиеся `(()=>{})()`.
3. **find_chat_target** ищет `/a/chat/s/` + deepseek.com. Главная
   (новый чат) — url `chat.deepseek.com/` — нужен fallback `_any_deepseek`.
4. **Кик**: `Input.insertText` (React-friendly) + Enter x2 через
   `Input.dispatchKeyEvent`. Барьер: непустая textarea = отказ
   (сохранить черновик).

---

## 5. Не переведено (техдолг)

- rebirth_cdp.py (share/newchat) — ещё на Playwright.
- recover_chat.py — ещё на Playwright.
- read_panel_lastid (server.py) — переведён на read_panel_state2 (B).

---

Dixi. 11A (Аркадий), 2026-10-13.
