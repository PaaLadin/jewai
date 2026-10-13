// themes.js - темы оформления: неон (default), классика, моно.

const Themes = (() => {
  const LIST = {
    neon: {
      name: "neon",
      bg: "#0a0a1a",
      grid: "#1e3a5f",
      owner: {
        0: [14,26,46],
        1: [255,46,151],
        2: [0,229,255],
        3: [255,230,109],
        4: [46,204,113],
      },
    },
    classic: {
      name: "classic",
      bg: "#1a1a1a",
      grid: "#3a3a3a",
      owner: {
        0: [30,30,30],
        1: [231,76,60],
        2: [52,152,219],
        3: [243,156,18],
        4: [46,204,113],
      },
    },
    mono: {
      name: "mono",
      bg: "#0d0d0d",
      grid: "#2a2a2a",
      owner: {
        0: [20,20,20],
        1: [255,255,255],
        2: [160,160,160],
        3: [220,220,220],
        4: [100,100,100],
      },
    },
    phosphor: {
      name: "phosphor",
      bg: "#0a1a0a",
      grid: "#1a3a1a",
      owner: {
        0: [10,26,10],
        1: [46,204,113],
        2: [120,255,120],
        3: [200,255,180],
        4: [0,180,80],
      },
    },
  };

  let current = "neon";

  function get(name) { return LIST[name] || LIST.neon; }
  function current_() { return LIST[current]; }
  function set(name) {
    if (LIST[name]) current = name;
    return LIST[current];
  }
  function names() { return Object.keys(LIST); }

  return { LIST, get, current: current_, set, names };
})();