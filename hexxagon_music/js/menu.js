// menu.js (v6) - главное меню. 6 пунктов + переключение экранов.

const Menu = (() => {
  function show() {
    // Скрыть все игровые экраны.
    ["game-screen","tech-screen","tracker-screen","settings-screen"]
      .forEach(id => { const e = document.getElementById(id);
                       if (e) e.classList.add("hidden"); });
    const m = document.getElementById("menu-screen");
    if (m) m.classList.remove("hidden");
    // Тема меню — только если звук уже разбужен и не идёт лор/партия.
    if (AudioEngine.isRunning && AudioEngine.isRunning()) playMenuTheme();
  }

  // Тема меню — простая мелодичная, играет в меню (если звук уже разбужен).
  let menuPlaying = false;
  function playMenuTheme() {
    if (typeof AudioEngine === "undefined" || typeof AuthorTracks === "undefined") return;
    if (!AudioEngine.isReady || !AudioEngine.isReady()) return;
    const th = AuthorTracks.get("theme_Menu");
    if (!th) return;
    AudioEngine.setStyle(th);
    // Все каналы, кроме pad (убран). Плотность выше.
    for (const ch of AudioEngine.CHANNELS) {
      const on = (ch !== "pad");
      AudioEngine.setChannel(ch, { on: on, density: 1.0 });
    }
    if (AudioEngine.syncGains) AudioEngine.syncGains();
    if (!AudioEngine.isRunning()) AudioEngine.start();
    menuPlaying = true;
  }
  function hide() {
    const m = document.getElementById("menu-screen");
    if (m) m.classList.add("hidden");
  }

  function startStory() {   // 1vsPC с лором
    hide();
    const goTech = () => { if (typeof TechView !== "undefined") TechView.show(); };
    if (typeof Lore !== "undefined" && Lore.introSlides) {
      // Заглавный трек: полный оркестр, по слайдам теряем инструменты.
      startTitleTheme();
      Lore.open({
        slides: Lore.introSlides(),
        onSlide: fadeInstrument,
        onClose: () => { stopAll(); goTech(); },
      });
    } else {
      goTech();
    }
  }

  // Порядок потери инструментов (от мелодии к ритму).
  const FADE_ORDER = ["arp","lead","pad","bass","hat","snare","kick"];
  let titleStarted = false;
  function startTitleTheme() {
    if (typeof AudioEngine === "undefined" || typeof AuthorTracks === "undefined") return;
    const th = AuthorTracks.get("theme_MusicStar");
    if (!th) return;
    AudioEngine.resume();
    AudioEngine.setStyle(th);
    const allOn = () => {
      for (const ch of AudioEngine.CHANNELS) {
        AudioEngine.setChannel(ch, { on: true, density: 1.0 });
      }
      if (AudioEngine.syncGains) AudioEngine.syncGains();
      if (!AudioEngine.isRunning()) AudioEngine.start();
    };
    allOn();
    setTimeout(allOn, 200);   // повтор после разблокировки ctx
    titleStarted = true;
  }
  // С 3-го слайда (idx=2) теряем по одному инструменту за шаг.
  function fadeInstrument(idx) {
    if (idx < 2) return;                 // первые 2 слайда - полный звук
    const losses = idx - 1;              // idx=2 -> 1 потеря ... idx=8 -> 7 (тишина)
    for (let i = 0; i < losses && i < FADE_ORDER.length; i++) {
      AudioEngine.setChannel(FADE_ORDER[i], { on: false });
    }
    if (AudioEngine.syncGains) AudioEngine.syncGains();
  }
  function stopAll() {
    titleStarted = false;
    if (typeof AudioEngine !== "undefined") AudioEngine.stop();
  }
  function startQuick() {   // 1vsPC быстрая
    hide();
    if (typeof Game !== "undefined" && Game.startQuick) Game.startQuick();
  }
  function start2P() {      // 2 игрока
    hide();
    if (typeof Game !== "undefined" && Game.start2P) Game.start2P();
  }
  function openTracker() {  // трекер
    hide();
    if (typeof Tracker !== "undefined") Tracker.show();
  }
  function openSettings() { // настройки
    hide();
    if (typeof SettingsScreen !== "undefined") SettingsScreen.show();
  }
  function exitGame() {     // выход (к титульнику/лору)
    hide();
    if (typeof Lore !== "undefined") Lore.open();
  }

  function init() {
    const map = {
      "menu-story": startStory,
      "menu-quick": startQuick,
      "menu-2p": start2P,
      "menu-tracker": openTracker,
      "menu-settings": openSettings,
      "menu-exit": exitGame,
    };
    for (const id in map) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", map[id]);
    }
  }

  return { init, show, hide, playTheme: playMenuTheme, stopAll };
})();