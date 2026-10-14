// sprites.js (v2) - пиксель-арт монстров 16x16, 16-битный стиль.
// Палитра: 8 цветов на игрока (блик/свет/тело/тень/контур + 3 акцента).
// Дизеринг (шахматный узор) для имитации объёма и свечения.

const Sprites = (() => {
  // Палитры 16-битного стиля (SNES-like).
  // o - контур (чёрный), h - блик, l - свет, b - тело, d - тень,
  // e - глаз, p - зрачок, x - акцент (свечение), g - дизер (полутон).
  function palette(player) {
    if (player === 1) return {  // magenta / неон
      ".": null, "o": "#1a0a18", "h": "#ffd6ec", "l": "#ff77c2",
      "b": "#ff2e97", "d": "#8c1352", "e": "#ffe66d", "p": "#1a0a18",
      "x": "#fff5c2", "g": "#c21e72",
    };
    if (player === 2) return {  // cyan
      ".": null, "o": "#0a1620", "h": "#d6f8ff", "l": "#77e2ff",
      "b": "#00e5ff", "d": "#007d8c", "e": "#ffe66d", "p": "#0a1620",
      "x": "#fff5c2", "g": "#00a8c2",
    };
    if (player === 3) return {  // yellow
      ".": null, "o": "#1a1408", "h": "#fff8d6", "l": "#ffe066",
      "b": "#f4c22b", "d": "#8c6a10", "e": "#000000", "p": "#1a1408",
      "x": "#ffffff", "g": "#c29418",
    };
    return {  // player 4 — green
      ".": null, "o": "#0a1a10", "h": "#d6ffe2", "l": "#77e69a",
      "b": "#2ecc71", "d": "#17693a", "e": "#000000", "p": "#0a1a10",
      "x": "#ffffff", "g": "#209154",
    };
  }

  // --- 16x16 спрайты монстров. Четыре типа. ---

  // SLIME — капля. Симметричный, блик слева сверху.
  const SLIME = [
    "......oooo......",
    "....oohhhhoo....",
    "...ohhhhhhhho...",
    "..ohhhllllhhho..",
    "..ohllllllllho..",
    ".ohlllbbbbbllho.",
    ".ohlbbbbbbbbgho.",
    "ohhbbbbbbbbbbgho",
    "ohlbbbebebbbbbgo",
    "ohlbbbepebbbbbgo",
    "ohlbbbbbbbbbbdgo",
    "ohlbbbbbbbbbbdgo",
    "ohldbddddddddbgo",
    "ohlddddddddddggo",
    ".ohddddddddddho.",
    "..oooooooooooo..",
  ];

  // ROBOT — квадратный, антенна, глаза-лампы, "рот" из пикселей.
  const ROBOT = [
    ".......xx.......",
    ".......oo.......",
    "....oooooooo....",
    "...ohhllllhho...",
    "..ohlllllllllho.",
    "..olbbbxxbbbbho.",
    "..olbbeppebbbho.",
    "..olbbbxxbbbbho.",
    "..olbbbbbbbbgho.",
    "..olbddddddbgho.",
    "..olbddddddbgho.",
    "..olbbbbbbbbgho.",
    "..olbxbxbxbxgho.",
    "..olbdbdbdbdgho.",
    "..ohldddddddho..",
    "..oooooooooooo..",
  ];

  // CRYSTAL — ромб, фасетки, свечение в центре.
  const CRYSTAL = [
    ".......oo.......",
    "......ohho......",
    ".....ohllho.....",
    "....ohllllho....",
    "...ohllllllho...",
    "..ohlllxxlllho..",
    ".ohllllxxllllho.",
    "ohllllllllllllho",
    "ohllllxxxxllllho",
    ".ohllllxxllllho.",
    "..ohllllllllho..",
    "...ohlddddgho...",
    "....ohdddgho....",
    ".....ohdgho.....",
    "......oggo......",
    ".......oo.......",
  ];

  // PLASMA — рваный, асимметричный, искры.
  const PLASMA = [
    "...o..oooo..o...",
    "..oho.ohho.oho..",
    "..ohhoohhhoohho.",
    ".ohhllhhhhllhho.",
    "ohllllbxxbllllho",
    "ohlbbbbxxbbbbgho",
    "ohlbbbeppebbbgho",
    "ohlbbbbxxbbbbgho",
    "ohlbbbbbbbbbbgho",
    ".ohlbbbxxbbbgho.",
    "..ohdbbxxbbdgho.",
    "...ohddddddgho..",
    "....ohddddgho...",
    "..o..ohddgho..o.",
    ".oho..ogggo..oho",
    "..o....oo....o..",
  ];

  // GHOST — призрак, зубчатый низ, пустые глаза.
  const GHOST = [
    "......oooo......",
    "....oohhhhoo....",
    "...ohhhhhhhho...",
    "..ohhhlllllho...",
    "..ohllllllllho..",
    ".ohllllllllllho.",
    ".ohlbbbbbbbbgho.",
    "ohhbbbxxbbxxbgho",
    "ohlbbbeppebbbgo.",
    "ohlbbbeppebbbgo.",
    "ohlbbbxxbbbbggho",
    "ohlbbbbbbbbbdgo.",
    "ohlbdbdbdbdbbgo.",
    "ohdododododogdo.",
    ".oo.oo.oo.oo.oo.",
    "................",
  ];

  // DRAGON — головa дракона, рога, зубы, огонь.
  const DRAGON = [
    "o.....o.....o...",
    ".oo..oo...oo....",
    "..oohhhoohho....",
    "...ohhllllho....",
    "..ohlllllllho...",
    "..olbbbxxbbho...",
    "..olbbeppebbo...",
    ".ohbbxxbbxxbho..",
    ".ohlbbbbbbbbho..",
    "..olbxxxxxbbbo..",
    "...olbxbxbxbo...",
    "....olbxbxbo....",
    ".....olbbbo.....",
    "......olbo......",
    ".......oo.......",
    "................",
  ];

  const TYPES = { slime: SLIME, robot: ROBOT, crystal: CRYSTAL, plasma: PLASMA,
                  ghost: GHOST, dragon: DRAGON };
  const ORDER = ["slime", "robot", "crystal", "plasma", "ghost", "dragon"];

  // Дизеринг: для пикселя на чётной/нечётной позиции — разный оттенок.
  // Используется, когда символа 'g' в спрайте нет, но нужен полутон.

  function bake(sprite, pal, scale) {
    const h = sprite.length, w = sprite[0].length;
    const c = document.createElement("canvas");
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
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

  // Дизер-паттерн для фона/свечения.
  function dither(ctx, x, y, w, h, colorA, colorB, size) {
    const s = size || 2;
    for (let j = 0; j < h; j += s) {
      for (let i = 0; i < w; i += s) {
        const even = ((i / s) + (j / s)) % 2 === 0;
        ctx.fillStyle = even ? colorA : colorB;
        ctx.fillRect(x + i, y + j, s, s);
      }
    }
  }

  // 8x8 bitmap-шрифт (пиксельный, 16-бит стиль).
  const FONT = {
    "0": ["01110","10001","10011","10101","11001","10001","01110","00000"],
    "1": ["00100","01100","00100","00100","00100","00100","01110","00000"],
    "2": ["01110","10001","00001","00010","00100","01000","11111","00000"],
    "3": ["11111","00010","00100","00010","00001","10001","01110","00000"],
    "4": ["00010","00110","01010","10010","11111","00010","00010","00000"],
    "5": ["11111","10000","11110","00001","00001","10001","01110","00000"],
    "6": ["00110","01000","10000","11110","10001","10001","01110","00000"],
    "7": ["11111","00001","00010","00100","01000","01000","01000","00000"],
    "8": ["01110","10001","10001","01110","10001","10001","01110","00000"],
    "9": ["01110","10001","10001","01111","00001","00010","01100","00000"],
    ":": ["00000","00100","00100","00000","00100","00100","00000","00000"],
    " ": ["00000","00000","00000","00000","00000","00000","00000","00000"],
    "P": ["11110","10001","10001","11110","10000","10000","10000","00000"],
    "A": ["01110","10001","10001","11111","10001","10001","10001","00000"],
    "I": ["11111","00100","00100","00100","00100","00100","11111","00000"],
    "W": ["10001","10001","10001","10101","10101","11011","10001","00000"],
    "N": ["10001","11001","10101","10011","10001","10001","10001","00000"],
    "L": ["10000","10000","10000","10000","10000","10000","11111","00000"],
    "O": ["01110","10001","10001","10001","10001","10001","01110","00000"],
    "S": ["01111","10000","10000","01110","00001","00001","11110","00000"],
    "E": ["11111","10000","10000","11110","10000","10000","11111","00000"],
    "H": ["10001","10001","10001","11111","10001","10001","10001","00000"],
    "X": ["10001","10001","01010","00100","01010","10001","10001","00000"],
    "G": ["01110","10001","10000","10111","10001","10001","01110","00000"],
    "-": ["00000","00000","00000","11111","00000","00000","00000","00000"],
    "!": ["00100","00100","00100","00100","00100","00000","00100","00000"],
    "?": ["01110","10001","00001","00110","00100","00000","00100","00000"],
  };

  return { TYPES, ORDER, get, palette, dither, FONT };
})();
