// tutorial.js - обучение. 5 шагов, показываются при первом запуске
// или по кнопке "?".

const Tutorial = (() => {
  const KEY = "hexxagon_tutorial_done";

  const STEPS = [
    {
      title: "Цель игры",
      text: "Захвати всё поле. Победа = больше всего монстров " +
            "+ полная полифония (все 7 дорожек играют).",
    },
    {
      title: "Ход на 1 гекс",
      text: "Клик по своей фишке → подсветятся ходы. " +
            "Жёлтые — клон (шаг на 1): число твоих фишек растёт.",
    },
    {
      title: "Ход на 2 гекса",
      text: "Фиолетовые — прыжок на 2: число не растёт, " +
            "но фишка улетает дальше.",
    },
    {
      title: "Захват",
      text: "После хода все вражеские фишки вокруг точки " +
            "приземления становятся твоими.",
    },
    {
      title: "Музыка",
      text: "Каждый сектор поля = инструмент. Захватил сектор — " +
            "его дорожка зазвучала. Потерял — замолчала. " +
            "В hot seat у каждого игрока свой стиль.",
    },
  ];

  let idx = 0;
  let active = false;

  function start() {
    idx = 0;
    active = true;
    show();
  }

  function show() {
    const el = document.getElementById("tutorial");
    if (!el) return;
    const s = STEPS[idx];
    document.getElementById("tut-title").textContent =
      (idx + 1) + "/" + STEPS.length + "  " + s.title;
    document.getElementById("tut-text").textContent = s.text;
    document.getElementById("tut-next").textContent =
      idx === STEPS.length - 1 ? "Начать!" : "Далее →";
    el.classList.remove("hidden");
  }

  function next() {
    if (idx < STEPS.length - 1) { idx++; show(); }
    else { close(); }
  }

  function close() {
    active = false;
    document.getElementById("tutorial").classList.add("hidden");
    localStorage.setItem(KEY, "1");
  }

  function shouldShow() {
    return !localStorage.getItem(KEY);
  }

  function reset() { localStorage.removeItem(KEY); }

  return { start, next, close, shouldShow, reset, STEPS };
})();