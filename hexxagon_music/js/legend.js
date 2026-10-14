// legend.js (v4) - окно-легенда: описание каждой части интерфейса.
// Клик по элементу в списке → развёрнутое описание справа.

const Legend = (() => {
  const ITEMS = [
    { id:"hud", name:"HUD (верхняя панель)",
      desc:"Показывает: чей ход, счёт фишек, состояние оркестра (7 дорожек), номер хода, время партии, текущий стиль." },
    { id:"players-select", name:"Игроков (ИГРА)",
      desc:"Сколько игроков: 2, 3 или 4. При 2 — классическая дуэль. При 3-4 — free-for-all." },
    { id:"mode-select", name:"Режим (ИГРА)",
      desc:"«против ИИ» — за остальных играет компьютер. «hot seat» — все игроки ходят по очереди за одним экраном." },
    { id:"ai-level", name:"ИИ (ИГРА)",
      desc:"Сложность противника. easy — жадный. medium — на 2 хода вперёд. hard — iterative deepening, 250 мс бюджета." },
    { id:"preset-select", name:"Пресет (ИГРА)",
      desc:"Начальная расстановка поля: Крест (4), Классика (2), Углы (4), Спираль (3)." },
    { id:"style-select", name:"Стиль (ИГРА)",
      desc:"Музыкальный стиль 7 дорожек. 10 стилей: retrowave, rock, metal, blues, dnb, ambient, chip, jazz, lofi, classical. У каждого свои мелодия, гармония, ритм и тембры." },
    { id:"music-source", name:"Источник музыки (НАСТРОЙКИ)",
      desc:"«Авторская» — фиксированные треки. «ИИ-импровизация» — процедурная генерация по seed: мелодия каждый раз новая." },
    { id:"btn-reseed", name:"🎲 reseed (НАСТРОЙКИ)",
      desc:"Новый сид ИИ-композитора. Мгновенно генерирует другой вариант мелодии в текущем стиле." },
    { id:"pack-select", name:"Звук (НАСТРОЙКИ)",
      desc:"«Железо» — набор тембров поверх стиля: аналог (тёплый), цифра (резкий), акустика (мягкий), 8-бит (квадратный)." },
    { id:"lang-select", name:"Язык (НАСТРОЙКИ)",
      desc:"RU / EN интерфейса." },
    { id:"theme-select", name:"Тема (НАСТРОЙКИ)",
      desc:"Палитра поля. 16-битные: SNES, Genesis, Amiga, Arcade. Плюс старые: неон, фосфор, классика, моно." },
    { id:"volume-slider", name:"Громкость (НАСТРОЙКИ)",
      desc:"Общая громкость. Дублируется клавишей M (mute)." },
    { id:"btn-audio", name:"▶ Включить звук (ДЕЙСТВИЯ)",
      desc:"Запускает Web Audio (требуется клик пользователя из-за браузерной политики)." },
    { id:"btn-undo", name:"↶ Отмена (ДЕЙСТВИЯ)",
      desc:"Откат последнего хода. Горячая клавиша U." },
    { id:"btn-new", name:"Новая партия (ДЕЙСТВИЯ)",
      desc:"Начать заново с текущими настройками." },
    { id:"btn-daily", name:"📅 Партия дня (ДЕЙСТВИЯ)",
      desc:"Ежедневный челлендж: seed от даты, фиксированные стили и сложность." },
    { id:"btn-share", name:"🔗 Share (ДЕЙСТВИЯ)",
      desc:"Скопировать ссылку с seed, числом игроков, пресетом и стилями." },
    { id:"btn-demo", name:"👁 Демо (ДЕЙСТВИЯ)",
      desc:"AI vs AI — посмотреть, как играет компьютер." },
    { id:"btn-editor", name:"🎛 Редактор (ДЕЙСТВИЯ)",
      desc:"Редактор паттернов: выбрать секцию, канал, BPM; рисовать шаги; экспорт/импорт JSON." },
    { id:"btn-legend", name:"🗺 Легенда секторов (ДЕЙСТВИЯ)",
      desc:"Показать на поле подписи секторов (snare, hat, bass, pad, lead, arp)." },
    { id:"btn-export", name:"💾 Экспорт (ДЕЙСТВИЯ)",
      desc:"Сохранить партию в JSON (replay)." },
    { id:"btn-import", name:"📁 Импорт (ДЕЙСТВИЯ)",
      desc:"Открыть сохранённую партию и проиграть её." },
    { id:"btn-shot", name:"📷 Скриншот (ДЕЙСТВИЯ)",
      desc:"Сохранить текущее поле как PNG." },
    { id:"btn-wav", name:"🎵 WAV (ДЕЙСТВИЯ)",
      desc:"Экспорт трека в WAV. Полный трек рендерится ~10-15 сек." },
    { id:"btn-achv", name:"🏆 Достижения (ДЕЙСТВИЯ)",
      desc:"Список ачивок и рекордов." },
    { id:"btn-lb", name:"📊 Лидеры (ДЕЙСТВИЯ)",
      desc:"Таблица топ-10 партий." },
    { id:"btn-mute", name:"🔊 Mute (ДЕЙСТВИЯ)",
      desc:"Мгновенное выключение/включение звука. Клавиша M." },
    { id:"btn-help", name:"? Помощь (ДЕЙСТВИЯ)",
      desc:"Это окно. Обучение — отдельная кнопка на титульном экране." },
    { id:"board", name:"Поле (canvas)",
      desc:"61 гекс. Клик по своей фишке — подсветка ходов (жёлтый = клон, фиолетовый = прыжок). Клик по цели — ход. Захват: вражеские фишки вокруг точки приземления становятся твоими." },
    { id:"player-styles", name:"Стили игроков",
      desc:"Выбор музыкального стиля для каждого игрока. Сектора поля звучат стилем владельца." },
  ];

  function render() {
    const list = document.getElementById("legend-list");
    const det = document.getElementById("legend-detail");
    if (!list) return;
    list.innerHTML = "";
    ITEMS.forEach((it, i) => {
      const el = document.createElement("div");
      el.className = "legend-item";
      el.textContent = it.name;
      el.dataset.idx = i;
      el.addEventListener("click", () => select(i));
      list.appendChild(el);
    });
    if (ITEMS.length) select(0);
  }

  function select(i) {
    const list = document.getElementById("legend-list");
    const det = document.getElementById("legend-detail");
    if (!list || !det) return;
    list.querySelectorAll(".legend-item").forEach((el, k) => {
      el.classList.toggle("on", k === i);
    });
    const it = ITEMS[i];
    if (it) det.innerHTML = "<h4>" + it.name + "</h4><p>" + it.desc + "</p>";
  }

  function open() {
    render();
    document.getElementById("legend-modal").classList.remove("hidden");
  }
  function close() {
    document.getElementById("legend-modal").classList.add("hidden");
  }

  return { ITEMS, open, close, select, render };
})();