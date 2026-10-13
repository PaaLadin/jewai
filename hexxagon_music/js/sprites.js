// sprites.js - пиксель-арт монстров. Массивы символов + палитра.

const Sprites = (() => {
  function palette(player) {
    if (player === 3) return {
      ".": null, "o": "#ffffff", "b": "#ffe66d", "d": "#a39814",
      "e": "#000000", "p": "#000000", "h": "#fff5c2",
    };
    if (player === 4) return {
      ".": null, "o": "#ffffff", "b": "#2ecc71", "d": "#17693a",
      "e": "#000000", "p": "#000000", "h": "#a8f0c2",
    };
    if (player === 1) return {
      ".": null,
      "o": "#ffffff",
      "b": "#ff2e97",
      "d": "#a3145e",
      "e": "#ffe66d",
      "p": "#000000",
      "h": "#ff9ed0",
    };
    return {
      ".": null,
      "o": "#ffffff",
      "b": "#00e5ff",
      "d": "#006b7e",
      "e": "#ffe66d",
      "p": "#000000",
      "h": "#a8f0ff",
    };
  }

  const SLIME = [
    "..oooo..",
    ".obbbbo.",
    "obbbbbbo",
    "obebebbo",
    "obpbbpbo",
    "obbbbbbo",
    "oddddddo",
    ".o.oo.o.",
  ];

  const ROBOT = [
    "..oooo..",
    ".oebbeo.",
    "obbbbbbo",
    "obobobbo",
    "obbbbbbo",
    "oddbddbo",
    "obobbobo",
    ".o.oo.o.",
  ];

  const CRYSTAL = [
    "...oo...",
    "..obbo..",
    ".obhbbo.",
    "obbbbbbo",
    "obbbbbbo",
    ".oddbdo.",
    "..oddo..",
    "...oo...",
  ];

  const PLASMA = [
    "..o..o..",
    ".obbbbo.",
    "obhbbhbo",
    "obbbbbbo",
    "obbwbbbo",
    ".obbbbo.",
    "..oddo..",
    "...oo...",
  ];

  const TYPES = { slime: SLIME, robot: ROBOT, crystal: CRYSTAL, plasma: PLASMA };
  const ORDER = ["slime", "robot", "crystal", "plasma"];

  function bake(sprite, pal, scale) {
    const h = sprite.length, w = sprite[0].length;
    const c = document.createElement("canvas");
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = sprite[y][x];
        const col = pal[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return c;
  }

  const cache = {};
  function get(player, type, scale) {
    const k = player + ":" + type + ":" + scale;
    if (cache[k]) return cache[k];
    const sprite = TYPES[type] || SLIME;
    cache[k] = bake(sprite, palette(player), scale);
    return cache[k];
  }

  return { TYPES, ORDER, get, palette };
})();