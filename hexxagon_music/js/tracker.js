// tracker.js (v6) - трекер: прослушивание стилей и авторских треков.
// Разблокировка по прогрессу. ИИ-сиды после 2x7 всех планет.

const Tracker = (() => {
  let currentStyle = "retrowave";

  function fillList() {
    const box = document.getElementById("tracker-list");
    if (!box || typeof Progress === "undefined") return;
    box.innerHTML = "";
    // 10 стилей.
    for (const p of Progress.PLANETS) {
      const unlocked = Progress.isUnlocked(p.id);
      const won = Progress.isWon(p.id);
      const el = document.createElement("div");
      el.className = "tracker-item" + (unlocked ? "" : " locked") +
                     (won ? " won" : "");
      el.innerHTML = '<span class="ti-dot" style="background:'+p.color+'"></span>' +
        '<span class="ti-name">' + (unlocked ? p.name : "🔒 " + p.name) + '</span>' +
        '<span class="ti-style">' + p.style + '</span>' +
        (won ? '<span class="ti-won">✓</span>' : '');
      el.addEventListener("click", () => {
        if (!unlocked) return;
        playStyle(p.style);
      });
      box.appendChild(el);
    }
    // 30 авторских треков (только если стиль разблокирован).
    const tracks = (typeof AuthorTracks !== "undefined") ? AuthorTracks.list() : [];
    if (tracks.length) {
      const hdr = document.createElement("div");
      hdr.className = "tracker-hdr";
      hdr.textContent = "Авторские треки";
      box.appendChild(hdr);
      for (const tid of tracks) {
        const tr = AuthorTracks.get(tid);
        // Разблокировка: стиль планеты.
        const styleName = (tr.style || "").toLowerCase();
        const planet = Progress.PLANETS.find(p => p.style === styleName);
        const unlocked = planet ? Progress.isUnlocked(planet.id) : true;
        const el = document.createElement("div");
        el.className = "tracker-item" + (unlocked ? "" : " locked");
        el.innerHTML = '<span class="ti-name">' + (unlocked ? "" : "🔒 ") +
          (tr.about || tid) + '</span>';
        el.addEventListener("click", () => {
          if (!unlocked) return;
          playTrack(tid);
        });
        box.appendChild(el);
      }
    }
  }

  function playStyle(styleName) {
    currentStyle = styleName;
    if (typeof AudioEngine === "undefined") return;
    // НЕ дёргаем btn-audio: его обработчик async и позже зовёт
    // recomputeSectors(), который гасит каналы трекера.
    AudioEngine.resume();
    AudioEngine.setStyle(Styles.get(styleName));
    AudioEngine.start();
    applyInstrumentGates();
    // Повторно применить гейты после разблокировки контекста.
    setTimeout(applyInstrumentGates, 120);
  }
  function playTrack(tid) {
    const tr = AuthorTracks.get(tid);
    if (!tr) return;
    AudioEngine.setStyle(tr);
    applyInstrumentGates();
    if (!AudioEngine.isRunning()) AudioEngine.start();
  }

  // Какие инструменты сейчас отмечены в трекере.
  function checkedChannels() {
    const box = document.getElementById("tracker-instruments");
    if (!box) return null;
    const set = {};
    box.querySelectorAll("input[type=checkbox]").forEach(cb => {
      set[cb.dataset.ch] = cb.checked;
    });
    return set;
  }

  // В трекере включаем отмеченные каналы на полную (вне игры гейтов нет).
  function applyInstrumentGates() {
    if (typeof AudioEngine === "undefined") return;
    const sel = checkedChannels();
    for (const ch of AudioEngine.CHANNELS) {
      const on = sel ? !!sel[ch] : true;
      AudioEngine.setChannel(ch, { on: on, density: 1.0 });
    }
    // Синхронизировать гейны немедленно (без ожидания 16-й).
    if (AudioEngine.syncGains) AudioEngine.syncGains();
  }

  function setAllChannels(which) {
    const box = document.getElementById("tracker-instruments");
    if (!box) return;
    box.querySelectorAll("input[type=checkbox]").forEach(cb => {
      if (which === "all") cb.checked = true;
      else if (which === "none") cb.checked = false;
      else if (which === "drums") cb.checked = ["kick","snare","hat"].includes(cb.dataset.ch);
    });
    applyInstrumentGates();
  }
  function stop() {
    if (typeof AudioEngine !== "undefined") {
      AudioEngine.stop();
      for (const ch of AudioEngine.CHANNELS) {
        AudioEngine.setChannel(ch, { on: false });
      }
      if (AudioEngine.syncGains) AudioEngine.syncGains();
    }
  }

  const SEED_KEY = "hexxagon_v6_seeds";
  function loadSeeds() {
    try { return JSON.parse(localStorage.getItem(SEED_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveSeeds(arr) {
    try { localStorage.setItem(SEED_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function renderSeeds() {
    const box = document.getElementById("tracker-seeds-box");
    const list = document.getElementById("tracker-seeds-list");
    if (!box || !list) return;
    const seeds = loadSeeds();
    box.classList.toggle("hidden", seeds.length === 0);
    list.innerHTML = "";
    seeds.forEach((s, i) => {
      const chip = document.createElement("div");
      chip.className = "seed-chip";
      chip.innerHTML = '<span>' + s.style + ' #' + s.seed + '</span>' +
                       '<span class="sc-del" title="Удалить">✕</span>';
      chip.querySelector("span:first-child").addEventListener("click", () => {
        currentStyle = s.style;
        const track = AIComposer.compose(s.style, s.seed);
        if (track) AudioEngine.setStyle(track);
        applyInstrumentGates();
        if (!AudioEngine.isRunning()) AudioEngine.start();
        const h = document.getElementById("tracker-hint");
        if (h) h.textContent = "Загружен сид: " + s.style + " #" + s.seed;
      });
      chip.querySelector(".sc-del").addEventListener("click", (e) => {
        e.stopPropagation();
        const arr = loadSeeds();
        arr.splice(i, 1);
        saveSeeds(arr);
        renderSeeds();
      });
      list.appendChild(chip);
    });
  }

  function updateSeedButtons() {
    const un = (typeof Progress !== "undefined") && Progress.aiSeedsUnlocked();
    const b1 = document.getElementById("tracker-seed");
    const b2 = document.getElementById("tracker-seed-save");
    if (b1) b1.style.display = un ? "" : "none";
    if (b2) b2.style.display = un ? "" : "none";
    const hint = document.getElementById("tracker-hint");
    if (hint) {
      hint.textContent = un
        ? "ИИ-сиды разблокированы: можно рандомить и сохранять."
        : "Стили открываются по мере освобождения планет. " +
          "ИИ-сиды — после освобождения всех планет с полным набором.";
    }
  }

  function show() {
    const el = document.getElementById("tracker-screen");
    if (el) el.classList.remove("hidden");
    fillList();
    updateSeedButtons();
    renderSeeds();
  }
  function hide() {
    stop();
    const el = document.getElementById("tracker-screen");
    if (el) el.classList.add("hidden");
  }

  function init() {
    const back = document.getElementById("tracker-back");
    if (back) back.addEventListener("click", () => {
      hide();
      if (typeof Menu !== "undefined") Menu.show();
    });
    const st = document.getElementById("tracker-stop");
    if (st) st.addEventListener("click", stop);
    const box = document.getElementById("tracker-instruments");
    if (box) {
      box.querySelectorAll("input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", applyInstrumentGates);
      });
    }
    const all = document.getElementById("tracker-ch-all");
    if (all) all.addEventListener("click", () => setAllChannels("all"));
    const none = document.getElementById("tracker-ch-none");
    if (none) none.addEventListener("click", () => setAllChannels("none"));
    const drums = document.getElementById("tracker-ch-drums");
    if (drums) drums.addEventListener("click", () => setAllChannels("drums"));
    const seed = document.getElementById("tracker-seed");
    if (seed) seed.addEventListener("click", () => {
      if (!Progress.aiSeedsUnlocked()) return;
      const s = Math.floor(Math.random() * 1e9);
      const track = AIComposer.compose(currentStyle, s);
      if (track) AudioEngine.setStyle(track);
      if (!AudioEngine.isRunning()) AudioEngine.start();
      const h = document.getElementById("tracker-hint");
      if (h) h.textContent = "Сид: " + s;
    });
    const save = document.getElementById("tracker-seed-save");
    if (save) save.addEventListener("click", () => {
      if (!Progress.aiSeedsUnlocked()) return;
      // Сохранение сида (простой список).
      const h = document.getElementById("tracker-hint");
      const m = (h ? h.textContent : "").match(/(\d+)/);
      if (m) {
        const key = "hexxagon_v6_seeds";
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e){}
        arr.push({ seed: parseInt(m[1],10), style: currentStyle, ts: Date.now() });
        saveSeeds(arr);
        renderSeeds();
        if (h) h.textContent = "Сид сохранён: " + m[1];
      }
    });
  }

  return { init, show, hide, playStyle, playTrack, stop };
})();