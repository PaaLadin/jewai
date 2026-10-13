// presets.js - пресеты игры: разные старты, размеры, темы.
// Пресет меняет Board.STARTS, numPlayers по умолчанию, BPM.

const Presets = (() => {
  const LIST = [
    {
      id: "classic-2",
      name: "Классика (2 игрока)",
      desc: "Противоположные углы, как в оригинале.",
      numPlayers: 2,
      starts: [
        [{ q:0, r:-4 }, { q:1, r:-4 }, { q:0, r:-3 }],
        [{ q:0, r:4 }, { q:-1, r:4 }, { q:0, r:3 }],
      ],
    },
    {
      id: "cross-4",
      name: "Крест (4 игрока)",
      desc: "4 старта через один угол (N, SE, S, NW).",
      numPlayers: 4,
      starts: [
        [{ q:0, r:-4 }, { q:1, r:-4 }, { q:0, r:-3 }],
        [{ q:4, r:0 }, { q:3, r:1 }, { q:4, r:-1 }],
        [{ q:0, r:4 }, { q:-1, r:4 }, { q:0, r:3 }],
        [{ q:-4, r:0 }, { q:-3, r:0 }, { q:-4, r:1 }],
      ],
    },
    {
      id: "corners-4",
      name: "Углы (4 игрока)",
      desc: "4 соседних угла - более плотные стычки.",
      numPlayers: 4,
      starts: [
        [{ q:0, r:-4 }, { q:1, r:-4 }, { q:0, r:-3 }],
        [{ q:4, r:-4 }, { q:4, r:-3 }, { q:3, r:-4 }],
        [{ q:4, r:0 }, { q:3, r:1 }, { q:4, r:-1 }],
        [{ q:0, r:4 }, { q:-1, r:4 }, { q:0, r:3 }],
      ],
    },
    {
      id: "spiral-3",
      name: "Спираль (3 игрока)",
      desc: "3 старта через два угла.",
      numPlayers: 3,
      starts: [
        [{ q:0, r:-4 }, { q:1, r:-4 }, { q:0, r:-3 }],
        [{ q:4, r:0 }, { q:3, r:1 }, { q:4, r:-1 }],
        [{ q:-4, r:0 }, { q:-3, r:0 }, { q:-4, r:1 }],
      ],
    },
  ];

  function get(id) { return LIST.find(p => p.id === id) || LIST[0]; }

  // Применить пресет к Board (мутирует Board.STARTS).
  function apply(preset) {
    Board.STARTS.length = 0;
    for (const g of preset.starts) Board.STARTS.push(g);
    return preset;
  }

  return { LIST, get, apply };
})();