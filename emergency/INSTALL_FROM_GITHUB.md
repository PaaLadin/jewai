# INSTALL_FROM_GITHUB — установка с нуля

Полная инструкция — в корневом `INSTALL.md`. Здесь — короткая
памятка для того, кто ставит проект впервые.

---

## Что понадобится

- Windows 10/11.
- Python 3.11+ (`python --version`).
- Chrome / Edge.
- Git.

---

## Шаги

1. Клонировать репозиторий:

       git clone <URL> jewai
       cd jewai

2. Установить зависимости:

       pip install -r requirements.txt
       python -m playwright install chromium

3. Запустить установщик:

       python install.py

   Установщик спросит папку, число каналов (1–10), базовый порт
   агентов, порт DoH-прокси. Создаст структуру папок, профили
   Chrome, `config.json`, `launchers/`, сгенерирует `.agent_token`.

4. Создать ярлык на рабочем столе:

       cd launchers
       powershell -ExecutionPolicy Bypass -File create-shortcut.ps1

5. Запустить всё — двойной клик по ярлыку **jewai** или:

       cd launchers
       powershell -ExecutionPolicy Bypass -File boot-all.ps1

   `boot-all.ps1` читает `config.json` и поднимает N агентов,
   N Chrome, DoH-прокси и сервер чата.

6. В каждом Chrome установить расширение (Load unpacked →
   `extension`) и настроить сайдпанель.

7. Проверить: read-команда в чате возвращает `[AGENT REPORT]`.

---

## Если что-то не работает

- Панель серая → `OPERATOR_GUIDE.md`.
- Агент молчит → `python sandbox\ping_all.py`.
- Совсем не поднимается → корневой `INSTALL.md`, раздел
  «Восстановление».