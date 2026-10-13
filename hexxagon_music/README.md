# Hexxagon Music

Игра-настолка Hexxagon (1993, Argo Games) с музыкальной механикой:
захват секторов поля включает дорожки встроенного трекера.
Цель — захватить всё поле и услышать полную полифонию.

## Что это

- **Hexxagon** — пошаговая игра на гексагональном поле (61 клетка).
  Шаг на 1 клетку (клон) или прыжок на 2 (перемещение). После хода
  все вражеские фишки вокруг точки приземления становятся твоими.
- **Трекер** — Web Audio, 7 дорожек (kick, snare, hat, bass, pad,
  lead, arp). 6 угловых секторов поля = 6 инструментов, kick — базовый.
- **10 стилей:** retrowave, rock, metal, blues, dnb, ambient, chip,
  jazz, lofi, classical. У каждого свои секции (intro/verse/chorus/
  bridge/outro) и свои тембры.
- **Процедурный композитор:** вкладка «ИИ-импровизация» генерирует
  трек по seed, наследуя стилевые synth-спеки.

## Запуск

Открыть `index.html` в браузере (Chrome/Firefox). Никаких зависимостей,
сборки нет.

## Возможности

- 2-4 игрока: hot seat или против AI (easy/medium/hard).
- 4 пресета поля, 4 темы, 4 звуковых пака.
- Per-player стили: у каждого игрока свой стиль, сектор звучит
  стилем владельца. Победа = стиль победителя на все каналы.
- WAV-экспорт трека (полный, стерео).
- Replay (JSON): сохранение/воспроизведение партии.
- Undo, автосейв, daily challenge, leaderboard, i18n (RU/EN),
  спектр-визуализатор, паттерн-редактор, ачивки, обучение, demo AI vs AI.
- Клавиатурная навигация (стрелки + Enter).

## Структура

- `index.html` — точка входа.
- `css/style.css` — неон-тема, grid-вёрстка UI.
- `js/` — 27 модулей:
  - Ядро: `hex.js`, `board.js`, `game.js`, `ai.js`.
  - Музыка: `patterns.js`, `styles.js`, `compose.js`,
    `ai_composer.js`, `audio.js`, `sound_packs.js`, `ui_sound.js`,
    `export_wav.js`.
  - Визуал: `sprites.js`, `themes.js`, `visualizer.js`.
  - UI: `toast.js`, `tutorial.js`, `pattern_editor.js`,
    `leaderboard.js`, `achievements.js`, `i18n.js`.
  - Прочее: `presets.js`, `settings.js`, `autosave.js`, `daily.js`,
    `replay.js`, `user_styles.js`.

## Тесты

В `sandbox/` основного проекта (не входят в jewai):
invariants.py, np_test.py, smoke2/3/4.py, fps_bench.py,
styles_test.py, ai_perf.py, ai_match.py, hexx_*.py.

## Лицензия

Часть проекта jewai. См. корневой LICENSE.

Dixi. 7D (Димон), 2026-10-13.