// tech_view.js (v6) - рубка корабля. Выбор планеты, настройки, «Лететь».

const TechView = (() => {
  let selectedId = null;

  // Заполнить список планет.
  function fillList() {
    const box = document.getElementById("tech-list");
    if (!box || typeof Progress === "undefined") return;
    box.innerHTML = "";
    for (const p of Progress.PLANETS) {
      const won = Progress.isWon(p.id);
      const unlocked = Progress.isUnlocked(p.id);
      const el = document.createElement("div");
      el.className = "tech-item" + (won ? " won" : "") +
                     (unlocked ? "" : " locked") +
                     (selectedId === p.id ? " sel" : "");
      el.dataset.id = p.id;
      el.innerHTML = '<span class="pi-dot" style="background:'+p.color+'"></span>' +
        '<span class="pi-name">' + (unlocked ? p.name : "🔒 " + p.name) + '</span>' +
        '<span class="pi-style">' + p.style + '</span>' +
        (won ? '<span class="pi-won">✓' + (Progress.getPlanet(p.id).score||0) + '</span>' : '');
      el.addEventListener("click", () => {
        if (!unlocked) return;
        selectPlanet(p.id);
      });
      el.addEventListener("mouseenter", () => {
        if (typeof Galaxy !== "undefined") Galaxy.select(p.id);
      });
      box.appendChild(el);
    }
  }

  function selectPlanet(id) {
    if (typeof Progress !== "undefined" && !Progress.isUnlocked(id)) return;
    selectedId = id;
    if (typeof Galaxy !== "undefined") Galaxy.select(id);
    fillList();
    renderInfo();
  }

  function onPlanetSelected(id) {
    // Клик по canvas — обновить список и панель.
    selectedId = id;
    fillList();
    renderInfo();
  }

  function renderInfo() {
    const box = document.getElementById("tech-info");
    const btn = document.getElementById("tech-fly");
    if (!box || typeof Progress === "undefined") return;
    const p = Progress.PLANETS.find(x => x.id === selectedId);
    if (!p) {
      box.innerHTML = "<p>Выбери планету на карте.</p>";
      if (btn) btn.disabled = true;
      return;
    }
    const won = Progress.isWon(p.id);
    const rec = Progress.getPlanet(p.id);
    box.innerHTML =
      '<h3>' + p.name + '</h3>' +
      '<p class="tech-style">Стиль: <b>' + p.style + '</b> · ' + p.bpm + ' BPM · ИИ: ' + p.ai + '</p>' +
      '<p class="tech-desc">' + p.desc + '</p>' +
      (won ? '<p class="tech-won">Освобождена: ' + (rec.tools||0) + ' инстр.' +
             (rec.center ? ' + центр (×2)' : '') + ' = ' + (rec.score||0) + ' очк.</p>'
           : '<p class="tech-locked">Планета захвачена Silence Monster. Освободи её!</p>');
    if (btn) btn.disabled = false;
  }

  function getSuit() {
    const el = document.getElementById("tech-suit");
    return el ? el.value : "analog";
  }

  function fly() {
    if (!selectedId) return;
    const p = Progress.PLANETS.find(x => x.id === selectedId);
    if (!p) return;
    // Сообщить игре о старте партии на планете.
    if (typeof Game !== "undefined" && Game.startPlanet) {
      Game.startPlanet(p, getSuit());
    }
  }

  function show() {
    document.getElementById("tech-screen").classList.remove("hidden");
    if (typeof Galaxy !== "undefined") Galaxy.start();
    fillList();
    renderInfo();
  }
  function hide() {
    document.getElementById("tech-screen").classList.add("hidden");
    if (typeof Galaxy !== "undefined") Galaxy.stop();
  }

  function init() {
    const btn = document.getElementById("tech-fly");
    if (btn) btn.addEventListener("click", fly);
    const back = document.getElementById("tech-back");
    if (back) back.addEventListener("click", () => {
      hide();
      if (typeof Menu !== "undefined") Menu.show();
    });
  }

  return { init, show, hide, selectPlanet, onPlanetSelected, getSuit,
           getSelected: () => selectedId };
})();