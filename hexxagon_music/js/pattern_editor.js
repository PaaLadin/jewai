// pattern_editor.js - визуальный редактор паттерна для одного канала.
// Пользователь выбирает канал, BPM, рисует шаги, слушает.

const PatternEditor = (() => {
  let current = null;    // channel name
  let secIdx = 0;        // индекс текущей секции
  let grid = [];         // массив 0/1 или нот
  let bpm = 100;
  let playing = false;
  let timer = null;
  let stepIdx = 0;

  const CHANNELS = ["kick","snare","hat","bass","pad","lead","arp"];
  const N = 16;   // один такт

  // Заполнить селектор секций.
  function fillSections(st) {
    const sel = document.getElementById("pe-section");
    if (!sel) return;
    sel.innerHTML = "";
    st.sections.forEach((sec, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = (i+1) + ". " + sec.name + " (" + sec.len + " такт.)";
      if (i === secIdx) o.selected = true;
      sel.appendChild(o);
    });
  }

  function open(channel, sectionIdx) {
    current = channel || "kick";
    if (sectionIdx != null) secIdx = sectionIdx;
    const st = Styles.get("retrowave");
    if (secIdx >= st.sections.length) secIdx = 0;
    const sec = st.sections[secIdx];
    const pat = (sec && sec.pat) || {};
    const src = pat[current] || new Array(N).fill(0);
    grid = src.slice(0, N).map(v => v || 0);
    bpm = st.bpm;
    stepIdx = 0;
    fillSections(st);
    render();
    document.getElementById("pe-modal").classList.remove("hidden");
  }

  function switchSection(i) {
    secIdx = i;
    const sel = document.getElementById("pe-section");
    if (sel) sel.value = String(i);
    const st = Styles.get("retrowave");
    const sec = st.sections[secIdx];
    const pat = (sec && sec.pat) || {};
    const src = pat[current] || new Array(N).fill(0);
    grid = src.slice(0, N).map(v => v || 0);
    render();
  }

  function switchChannel(ch) {
    current = ch;
    const st = Styles.get("retrowave");
    const sec = st.sections[secIdx];
    const pat = (sec && sec.pat) || {};
    const src = pat[current] || new Array(N).fill(0);
    grid = src.slice(0, N).map(v => v || 0);
    render();
  }

  function close() {
    stop();
    document.getElementById("pe-modal").classList.add("hidden");
  }

  function render() {
    document.getElementById("pe-channel").value = current;
    document.getElementById("pe-bpm").value = bpm;
    const box = document.getElementById("pe-grid");
    box.innerHTML = "";
    for (let i = 0; i < N; i++) {
      const cell = document.createElement("div");
      cell.className = "pe-cell" + (grid[i] ? " on" : "");
      cell.dataset.idx = i;
      cell.textContent = i % 4 === 0 ? (i/4 + 1) : "";
      cell.addEventListener("click", () => {
        grid[i] = grid[i] ? 0 : 1;
        render();
      });
      box.appendChild(cell);
    }
  }

  function start() {
    if (playing) return;
    playing = true;
    stepIdx = 0;
    const stepDur = (60 / bpm) / 4 * 1000;
    const c = AudioEngine.getCtx && AudioEngine.getCtx();
    if (!c) return;
    let next = c.currentTime + 0.1;
    function tick() {
      if (!playing) return;
      const t = next;
      next += (60 / bpm) / 4;
      // Играем по каналу.
      const v = grid[stepIdx];
      if (v) playStep(current, t);
      stepIdx = (stepIdx + 1) % N;
      render2Step(stepIdx);
      timer = setTimeout(tick, stepDur);
    }
    tick();
  }

  function playStep(ch, t) {
    // Используем playX у AudioEngine? Они не экспортированы.
    // Простейший способ: короткий blip через UI-канал.
    const c = AudioEngine.getCtx();
    const g = AudioEngine.getBus();
    if (!c || !g) return;
    const o = c.createOscillator();
    const gain = c.createGain();
    const freq = {
      kick: 60, snare: 400, hat: 6000,
      bass: 100, pad: 200, lead: 800, arp: 1200,
    }[ch] || 440;
    o.type = ch === "kick" ? "sine" : ch === "hat" ? "square" : "sawtooth";
    o.frequency.value = freq;
    const dur = ch === "pad" ? 0.4 : 0.08;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gain).connect(g);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function render2Step(idx) {
    const cells = document.querySelectorAll("#pe-grid .pe-cell");
    cells.forEach((c, i) => {
      c.classList.toggle("active", i === idx);
    });
  }

  function stop() {
    playing = false;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function applyToGame() {
    const st = Styles.get("retrowave");
    const sec = st.sections[secIdx];
    const pat0 = (sec && sec.pat) || {};
    const p = {};
    for (const ch of CHANNELS) {
      p[ch] = pat0[ch] ? pat0[ch].slice() : new Array(N).fill(0);
    }
    p[current] = grid.slice();
    // Спросить имя.
    const name = prompt("Имя пользовательского стиля:", "my_style");
    if (!name) return;
    UserStyles.addStyle(name, { bpm: bpm, pattern: p });
    if (typeof Toast !== "undefined") Toast.show("Стиль '" + name + "' сохранён",
      { color: "#2ecc71" });
    // Перерисовать player-styles.
    if (typeof Game !== "undefined" && Game.renderPlayerStyles) {
      Game.renderPlayerStyles();
    }
  }

  // Экспорт текущей секции в JSON-файл.
  function exportSection() {
    const st = Styles.get("retrowave");
    const sec = st.sections[secIdx];
    const pat = (sec && sec.pat) || {};
    // Собрать полную копию всех каналов секции.
    const out = {
      version: 1,
      style: "retrowave",
      section: secIdx,
      name: sec.name,
      len: sec.len,
      spb: 16,
      channels: {},
    };
    for (const ch of CHANNELS) {
      out.channels[ch] = (pat[ch] || []).slice();
    }
    // Текущий канал — с учётом правок в grid.
    out.channels[current] = grid.slice();
    const blob = new Blob([JSON.stringify(out, null, 2)],
                          { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hexxagon_section_" + sec.name + "_" + current + ".json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof Toast !== "undefined")
      Toast.show("Секция экспортирована", { color: "#2ecc71" });
  }

  // Импорт секции из JSON (заменяет каналы в grid и паттерне стиля).
  function importSection(text) {
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      if (typeof Toast !== "undefined")
        Toast.show("Ошибка JSON: " + e.message, { color: "#e74c3c" });
      return false;
    }
    if (!data || !data.channels || !data.name) {
      if (typeof Toast !== "undefined")
        Toast.show("Неверный формат файла", { color: "#e74c3c" });
      return false;
    }
    const st = Styles.get("retrowave");
    // Если есть секция с таким именем — перезаписать; иначе добавить.
    let idx = st.sections.findIndex(x => x.name === data.name);
    if (idx < 0) {
      st.sections.push({ name: data.name, len: data.len || 4,
                         pat: data.channels });
      idx = st.sections.length - 1;
    } else {
      st.sections[idx].pat = data.channels;
    }
    secIdx = idx;
    const sec = st.sections[idx];
    const pat = sec.pat || {};
    const src = pat[current] || new Array(N).fill(0);
    grid = src.slice(0, N).map(v => v || 0);
    fillSections(st);
    render();
    if (typeof Toast !== "undefined")
      Toast.show("Секция '" + data.name + "' импортирована", { color: "#2ecc71" });
    return true;
  }

  return { open, close, start, stop, applyToGame, switchSection, switchChannel,
           exportSection, importSection, CHANNELS, N };
})();