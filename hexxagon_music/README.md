# hexxagon_music

Игра-настолка: **Hexxagon** (1993, Argo Games) + музыкальный
трекер. Захватываешь сектора поля — включаются дорожки трекера.
Собираешь монстров — собираешь полифонию.

## Идея

- Механика: Hexxagon/Ataxx на гексагональном поле 61 гекс.
- Фишка ходит на 1 гекс (клонируется) или на 2 (перемещается),
  захватывает вражеских соседей.
- 6 угловых секторов = 6 инструментов (snare/hat/bass/pad/lead/arp).
- kick — базовый бит, играет всегда.
- Захватил сектор → дорожка играет. Потерял → глушится (crossfade).
- Цель: захватить всё поле = услышать полную полифонию.

## Возможности

- **7 стилей:** retrowave, rock, metal, blues, dnb, ambient, chip.
- **2 режима:** против ИИ (easy/medium/hard), hot seat 2-4 игрока.
- **Per-player стили:** в hot seat каждый игрок выбирает свой
  стиль; сектора звучат стилем владельца; победитель окрашивает
  финальный микс.
- **4 пресета поля:** Крест, Классика, Углы, Спираль.
- **4 темы:** неон, фосфор, классика, моно.
- **Ачивки:** 8 штук + рекорды в localStorage.
- **Обучение:** 5 шагов при первом запуске.
- **Реплей:** экспорт/импорт партии в JSON.
- **WAV-экспорт:** 12-секундный рендер выбранного стиля.
- **Undo, таймер, счётчик ходов.**

## Стек

- HTML + Canvas (пиксель-арт) + Web Audio API.
- Без библиотек и сэмплов — всё синтезируется.

## Запуск

Открыть `index.html`. Клик по «▶ Включить звук» разблокирует
AudioContext (user gesture требуется браузером).

Параметры URL:
- `?seed=N` — воспроизводимая партия.

Локальный сервер:

    python -m http.server 8090
    # http://127.0.0.1:8090/projects/hexxagon_music/

## Управление

- Клик по фишке → подсветка ходов.
- Жёлтая = клон (шаг 1), фиолетовая = прыжок (шаг 2).
- **U** — undo. **N** — новая партия. **M** — mute.
- **Space** — вкл/выкл звук.

## Файлы

    index.html
    css/style.css
    js/hex.js           координаты, поле 61, рендер
    js/board.js         правила, N игроков, старты
    js/patterns.js      retrowave-паттерн
    js/styles.js        7 стилей
    js/audio.js         Web Audio трекер
    js/ui_sound.js      UI-звуки
    js/sprites.js       пиксель-арт монстров
    js/ai.js            противник (3 уровня)
    js/game.js          цикл партии, рендер, ввод
    js/replay.js        экспорт/импорт партии
    js/export_wav.js    WAV-экспорт
    js/achievements.js  ачивки и рекорды
    js/tutorial.js      обучение
    js/presets.js       пресеты поля
    js/themes.js        темы
    README.md
    ROADMAP.html

## Тесты

    python sandbox/hexxagon/invariants.py   # 14 инвариантов
    python sandbox/hexxagon/np_test.py       # N игроков
    python sandbox/hexxagon/smoke2.py        # загрузка
    python sandbox/hexxagon/smoke4.py        # звук (RMS)
    python sandbox/hexxagon/fps_bench.py     # FPS
    python sandbox/hexxagon/styles_test.py   # 7 стилей
    python sandbox/hexxagon/ai_perf.py       # скорость AI

## Статус

MVP v1.0 + бета + полировка. Серия 6D, 2026-10-12.

Dixi. 6D (Димон).