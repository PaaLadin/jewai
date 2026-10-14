// themes.js (v2) - темы 16-битного стиля: SNES, Genesis, Amiga, Arcade,
// плюс старые (neon, classic, mono, phosphor).
// Каждая тема = палитра (bg, grid, owner[0..4]) + акцентные цвета.

const Themes = (() => {
  const LIST = {
    // SNES-стиль: насыщенные, но не ядовитые. Фон — тёмно-синий.
    snes: {
      name: "snes",
      bg: "#081028",
      grid: "#1c3060",
      glow: "#4a80ff",
      owner: {
        0: [10, 20, 48],
        1: [232, 90, 156],   // малиновый
        2: [80, 176, 232],   // голубой
        3: [248, 216, 96],   // золотой
        4: [88, 200, 120],   // зелёный
      },
    },
    // Genesis-стиль: более «грязные», контрастные.
    genesis: {
      name: "genesis",
      bg: "#180828",
      grid: "#3a1048",
      glow: "#c040f0",
      owner: {
        0: [20, 8, 40],
        1: [224, 48, 112],   // роза
        2: [64, 144, 224],   // синий
        3: [240, 200, 64],   // жёлтый
        4: [64, 200, 96],    // зелёный
      },
    },
    // Amiga-стиль: HAM-режим, тёплые тона.
    amiga: {
      name: "amiga",
      bg: "#100820",
      grid: "#301848",
      glow: "#ff9040",
      owner: {
        0: [20, 10, 30],
        1: [255, 96, 64],    // оранж
        2: [80, 160, 240],   // голубой
        3: [248, 200, 120],  // песочный
        4: [80, 200, 100],   // салатовый
      },
    },
    // Arcade: ядовитый неон, высокий контраст.
    arcade: {
      name: "arcade",
      bg: "#000814",
      grid: "#002848",
      glow: "#00ffe0",
      owner: {
        0: [0, 8, 20],
        1: [255, 0, 128],    // magenta
        2: [0, 240, 255],    // cyan
        3: [255, 240, 0],    // yellow
        4: [0, 255, 96],     // green
      },
    },
    // Старые темы (совместимость).
    neon: {
      name: "neon", bg: "#0a0a1a", grid: "#1e3a5f", glow: "#7d5fff",
      owner: { 0:[14,26,46], 1:[255,46,151], 2:[0,229,255], 3:[255,230,109], 4:[46,204,113] },
    },
    classic: {
      name: "classic", bg: "#1a1a1a", grid: "#3a3a3a", glow: "#e74c3c",
      owner: { 0:[30,30,30], 1:[231,76,60], 2:[52,152,219], 3:[243,156,18], 4:[46,204,113] },
    },
    mono: {
      name: "mono", bg: "#0d0d0d", grid: "#2a2a2a", glow: "#ffffff",
      owner: { 0:[20,20,20], 1:[255,255,255], 2:[160,160,160], 3:[220,220,220], 4:[100,100,100] },
    },
    phosphor: {
      name: "phosphor", bg: "#0a1a0a", grid: "#1a3a1a", glow: "#2ecc71",
      owner: { 0:[10,26,10], 1:[46,204,113], 2:[120,255,120], 3:[200,255,180], 4:[0,180,80] },
    },
  };

  let current = "snes";

  function get(name) { return LIST[name] || LIST[current] || LIST.snes; }
  function current_() { return LIST[current] || LIST.snes; }
  function set(name) { if (LIST[name]) current = name; return LIST[current]; }
  function names() { return Object.keys(LIST); }

  // Готовый CSS-цвет из палитры owner[player].
  function ownerCss(player) {
    const t = current_();
    const rgb = t.owner[player] || t.owner[0];
    return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
  }

  return { LIST, get, current: current_, set, names, ownerCss };
})();
next_id: DDAA7278