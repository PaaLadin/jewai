// tracker_settings.js (v6.9D) - список композиций с управлением:
// BPM (текущий + выбор), плей/стоп, галочка "в игре", кнопка save.
// Сохранение в localStorage: hexxagon_track_settings.

const TrackerSettings = (() => {
  const KEY = "hexxagon_track_settings";
  // Целевые BPM планет (по лору) — для "переезда" трека.
  const PLANET_BPM = [
    { id:"ambient",    bpm:60,  name:"Мшистый Шар" },
    { id:"lofi",       bpm:85,  name:"Пыльный Блюз" },
    { id:"blues",      bpm:80,  name:"Тихая Гавань" },
    { id:"classical",  bpm:95,  name:"Лавовый Кряж" },
    { id:"retrowave",  bpm:105, name:"Плазма" },
    { id:"jazz",       bpm:120, name:"Лесной Ритм" },
    { id:"rock",       bpm:140, name:"Кузня" },
    { id:"chip",       bpm:150, name:"Кристалл" },
    { id:"metal",      bpm:170, name:"Молот" },
    { id:"dnb",        bpm:174, name:"Шторм" },
  ];
  const BPM_OPTIONS = [60,70,80,85,90,95,100,105,110,120,128,130,140,150,160,170,174,180,190,200];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  // Настройки трека: { bpm, inGame }.
  function get(tid) {
    const d = load();
    return d[tid] || { bpm: null, inGame: false };
  }
  function set(tid, obj) {
    const d = load();
    d[tid] = Object.assign(get(tid), obj);
    save(d);
  }

  // Ближайшая планета по BPM.
  function nearestPlanet(bpm) {
    let best = PLANET_BPM[0], diff = 1e9;
    for (const p of PLANET_BPM) {
      const dd = Math.abs(p.bpm - bpm);
      if (dd < diff) { diff = dd; best = p; }
    }
    return best;
  }

  function playTrackWithBpm(tid, bpm) {
    if (typeof AudioEngine === "undefined" || typeof AuthorTracks === "undefined") return;
    const tr = AuthorTracks.get(tid);
    if (!tr) return;
    // Копия трека с переопределённым bpm.
    const t2 = Object.assign({}, tr, { bpm: bpm || tr.bpm });
    AudioEngine.resume();
    AudioEngine.setStyle(t2);
    for (const ch of AudioEngine.CHANNELS) {
      AudioEngine.setChannel(ch, { on: ch !== "pad", density: 1.0 });
    }
    if (AudioEngine.syncGains) AudioEngine.syncGains();
    if (!AudioEngine.isRunning()) AudioEngine.start();
    window.__trackerPlaying = tid;
  }

  let playingId = null;

  function fillRows() {
    const box = document.getElementById("tracker-track-settings");
    if (!box || typeof AuthorTracks === "undefined") return;
    box.innerHTML = "";
    const hdr = document.createElement("div");
    hdr.className = "tracker-hdr";
    hdr.textContent = "Композиции (настройка BPM и выбор для игры)";
    box.appendChild(hdr);

    const ids = AuthorTracks.list();
    for (const tid of ids) {
      const tr = AuthorTracks.get(tid);
      if (!tr) continue;
      const cfg = get(tid);
      const curBpm = cfg.bpm || tr.bpm;
      const planet = nearestPlanet(curBpm);
      const row = document.createElement("div");
      row.className = "trk-row";
      row.dataset.tid = tid;

      // Имя + стиль.
      const name = document.createElement("span");
      name.className = "trk-name";
      name.textContent = (tr.about || tid);
      row.appendChild(name);

      const st = document.createElement("span");
      st.className = "trk-style";
      st.textContent = tr.style || "";
      row.appendChild(st);

      // Текущий BPM (число).
      const bpmNum = document.createElement("input");
      bpmNum.type = "number"; bpmNum.min = "40"; bpmNum.max = "220";
      bpmNum.value = curBpm; bpmNum.style.width = "56px";
      bpmNum.title = "Текущий BPM";
      row.appendChild(bpmNum);

      // Селект BPM.
      const sel = document.createElement("select");
      sel.title = "Выбрать BPM";
      for (const b of BPM_OPTIONS) {
        const o = document.createElement("option");
        o.value = String(b); o.textContent = String(b);
        if (b === curBpm) o.selected = true;
        sel.appendChild(o);
      }
      row.appendChild(sel);

      // Планета (по BPM).
      const pl = document.createElement("span");
      pl.className = "trk-planet";
      pl.textContent = "→ " + planet.name + " (" + planet.bpm + ")";
      row.appendChild(pl);

      // Плей/стоп.
      const play = document.createElement("button");
      play.textContent = "▶";
      play.title = "Прослушать с этим BPM";
      play.addEventListener("click", () => {
        const b = parseInt(bpmNum.value, 10) || curBpm;
        if (playingId === tid) {
          AudioEngine.stop();
          playingId = null; play.textContent = "▶";
        } else {
          playTrackWithBpm(tid, b);
          playingId = tid; play.textContent = "■";
        }
      });
      row.appendChild(play);

      // Галочка "использовать в игре".
      const use = document.createElement("input");
      use.type = "checkbox"; use.checked = !!cfg.inGame;
      use.title = "Использовать в игре";
      row.appendChild(use);
      const useLbl = document.createElement("span");
      useLbl.textContent = "в игре";
      row.appendChild(useLbl);

      // Кнопка save.
      const sv = document.createElement("button");
      sv.className = "trk-save" + (cfg.bpm || cfg.inGame ? " saved" : "");
      sv.textContent = "💾";
      sv.title = "Сохранить BPM и выбор";
      sv.addEventListener("click", () => {
        const b = parseInt(bpmNum.value, 10) || curBpm;
        set(tid, { bpm: b, inGame: use.checked });
        const np = nearestPlanet(b);
        pl.textContent = "→ " + np.name + " (" + np.bpm + ")";
        sv.classList.add("saved");
        if (typeof Toast !== "undefined")
          Toast.show("💾 " + tid + ": BPM " + b + ", " +
            (use.checked ? "в игре" : "не в игре"), { color: "#2ecc71" });
      });
      row.appendChild(sv);

      // Синхронизация селект <-> число.
      sel.addEventListener("change", () => {
        bpmNum.value = sel.value;
        const np = nearestPlanet(parseInt(sel.value, 10));
        pl.textContent = "→ " + np.name + " (" + np.bpm + ")";
      });
      bpmNum.addEventListener("change", () => {
        const b = parseInt(bpmNum.value, 10);
        if (b) {
          const np = nearestPlanet(b);
          pl.textContent = "→ " + np.name + " (" + np.bpm + ")";
        }
      });

      box.appendChild(row);
    }
  }

  // Получить настройки трека (для game.js: применять bpm/выбор).
  function settingsFor(tid) { return get(tid); }
  // Список треков, выбранных для игры.
  function inGameTracks() {
    const d = load();
    return Object.keys(d).filter(k => d[k] && d[k].inGame);
  }

  return { fillRows, get, set, settingsFor, inGameTracks,
           nearestPlanet, BPM_OPTIONS, PLANET_BPM };
})();