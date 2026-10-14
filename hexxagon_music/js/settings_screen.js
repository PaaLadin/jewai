// settings_screen.js (v6) - экран настроек. Все параметры в одном месте.

const SettingsScreen = (() => {
  function fillSelects() {
    // Темы.
    const th = document.getElementById("set-theme");
    if (th && typeof Themes !== "undefined") {
      th.innerHTML = "";
      for (const n of Themes.names()) {
        const o = document.createElement("option");
        o.value = n; o.textContent = n;
        th.appendChild(o);
      }
      th.value = Themes.current().name;
    }
    // Стили.
    const st = document.getElementById("set-style");
    if (st && typeof Styles !== "undefined") {
      st.innerHTML = "";
      for (const n of Styles.NAMES) {
        const o = document.createElement("option");
        o.value = n; o.textContent = n;
        st.appendChild(o);
      }
    }
    // Пресеты.
    const pr = document.getElementById("set-preset");
    if (pr && typeof Presets !== "undefined") {
      pr.innerHTML = "";
      const names = (Presets.names && Presets.names()) || ["cross-4","classic-2","corners-4","spiral-3"];
      for (const n of names) {
        const o = document.createElement("option");
        o.value = n; o.textContent = n;
        pr.appendChild(o);
      }
    }
  }

  function show() {
    const el = document.getElementById("settings-screen");
    if (el) el.classList.remove("hidden");
    fillSelects();
    // Синхронизировать значения из игрового поля.
    const sync = (setId, gameId) => {
      const s = document.getElementById(setId);
      const g = document.getElementById(gameId);
      if (s && g) s.value = g.value;
    };
    sync("set-players", "players-select");
    sync("set-mode", "mode-select");
    sync("set-ai", "ai-level");
    sync("set-preset", "preset-select");
    sync("set-pack", "pack-select");
    sync("set-lang", "lang-select");
    sync("set-theme", "theme-select");
  }
  function hide() {
    const el = document.getElementById("settings-screen");
    if (el) el.classList.add("hidden");
  }

  function init() {
    const back = document.getElementById("settings-back");
    if (back) back.addEventListener("click", () => {
      hide();
      if (typeof Menu !== "undefined") Menu.show();
    });
    const reset = document.getElementById("set-progress-reset");
    if (reset) reset.addEventListener("click", () => {
      if (confirm("Сбросить прогрессию прохождения?")) {
        if (typeof Progress !== "undefined") Progress.reset();
        if (typeof Menu !== "undefined") { Menu.show(); }
      }
    });
    // Привязка контролов.
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", fn);
    };
    bind("set-lang", (e) => { if (typeof I18n !== "undefined") I18n.set(e.target.value); });
    bind("set-theme", (e) => { if (typeof Themes !== "undefined") Themes.set(e.target.value); });
    bind("set-pack", (e) => { if (typeof SoundPacks !== "undefined") SoundPacks.set(e.target.value); });
    bind("set-style", (e) => {
      if (typeof AudioEngine !== "undefined" && typeof Styles !== "undefined") {
        AudioEngine.setStyle(Styles.get(e.target.value));
      }
    });
    bind("set-ai", (e) => {
      if (typeof AI !== "undefined") AI.setLevel(e.target.value);
      const g = document.getElementById("ai-level");
      if (g) g.value = e.target.value;
    });
    // v6 этап 6: режим/игроки/пресет — синхронизировать со скрытыми
    // контролами поля и запустить новую партию.
    bind("set-players", (e) => {
      const g = document.getElementById("players-select");
      if (g) g.value = e.target.value;
      if (typeof Game !== "undefined") { Game.newGame(); Game.renderPlayerStyles(); }
    });
    bind("set-mode", (e) => {
      const g = document.getElementById("mode-select");
      if (g) { g.value = e.target.value;
               g.dispatchEvent(new Event("change")); }
    });
    bind("set-preset", (e) => {
      const g = document.getElementById("preset-select");
      if (g) { g.value = e.target.value;
               g.dispatchEvent(new Event("change")); }
    });
    const vol = document.getElementById("set-volume");
    if (vol) vol.addEventListener("input", (e) => {
      if (typeof AudioEngine !== "undefined") AudioEngine.setVolume(e.target.value / 100);
    });
  }

  return { init, show, hide, fillSelects };
})();