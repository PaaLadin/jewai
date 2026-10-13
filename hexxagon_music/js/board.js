// board.js - состояние поля, правила Hexxagon, N игроков (2-4).
// Клетка: { q, r, owner } где owner = 0 пусто, 1..N игрок.
// Игроки: P1..PN. Цвета и стили назначаются в game.js.

const Board = (() => {
  const EMPTY = 0;
  const P1 = 1;
  const P2 = 2;
  const MAX_PLAYERS = 4;

  // 4 стартовых угла: два противоположных (для 2) + два боковых (для 4).
  // Порядок: 0=левый-верх, 1=правый-низ, 2=левый-низ, 3=правый-верх.
  // 4 стартовых угла (61-гексовое поле, 6 углов).
  // Берём 4 через один: (-4,0), (4,-4), (0,4), (-4,4)? Нет.
  // Равноудалённо: (0,-4), (4,0), (0,4), (-4,0) - стороны N/E/S/W.
  // 4 стартовых треугольника через один угол (N, SE, S, NW).
  // MinDist между группами = 3 (максимум для 4 из 6 углов 61-гекс поля).
  const STARTS = [
    [{ q:0, r:-4 }, { q:1, r:-4 }, { q:0, r:-3 }],
    [{ q:4, r:0 }, { q:3, r:1 }, { q:4, r:-1 }],
    [{ q:0, r:4 }, { q:-1, r:4 }, { q:0, r:3 }],
    [{ q:-4, r:0 }, { q:-3, r:0 }, { q:-4, r:1 }],
  ];

  function key(q, r) { return q + "," + r; }

  // Создать поле для numPlayers игроков (2..4).
  function create(numPlayers) {
    const np = Math.max(2, Math.min(MAX_PLAYERS, numPlayers || 2));
    const cells = HEX.buildBoard();
    const map = new Map();
    for (const c of cells) {
      map.set(key(c.q, c.r), { q: c.q, r: c.r, owner: EMPTY });
    }
    for (let p = 0; p < np; p++) {
      for (const s of STARTS[p]) {
        const c = map.get(key(s.q, s.r));
        if (c) c.owner = p + 1;
      }
    }
    return {
      cells: Array.from(map.values()),
      map, numPlayers: np, turn: 1, winner: 0, history: [],
    };
  }

  function clone(b) {
    return {
      cells: b.cells.map(c => ({ q: c.q, r: c.r, owner: c.owner })),
      map: new Map(Array.from(b.map, ([k, v]) => [k, { ...v }])),
      numPlayers: b.numPlayers, turn: b.turn, winner: b.winner,
      history: b.history.slice(),
    };
  }

  function ownerAt(b, q, r) {
    const c = b.map.get(key(q, r));
    return c ? c.owner : -1;
  }

  function nextPlayer(b, from) {
    for (let i = 1; i <= b.numPlayers; i++) {
      const p = ((from - 1 + i) % b.numPlayers) + 1;
      if (allMoves(b, p).length > 0) return p;
    }
    return 0;
  }
  function movesFrom(b, q, r) {
    const owner = ownerAt(b, q, r);
    if (owner === EMPTY || owner === -1) return [];
    const out = [];
    for (const t of HEX.inRange(q, r, 2)) {
      if (t.q === q && t.r === r) continue;
      const d = HEX.dist(q, r, t.q, t.r);
      if (d !== 1 && d !== 2) continue;
      if (ownerAt(b, t.q, t.r) !== EMPTY) continue;
      out.push({ toQ: t.q, toR: t.r, kind: d === 1 ? "clone" : "jump" });
    }
    return out;
  }

  function allMoves(b, player) {
    const out = [];
    for (const c of b.cells) {
      if (c.owner !== player) continue;
      for (const m of movesFrom(b, c.q, c.r)) {
        out.push({ fromQ: c.q, fromR: c.r, ...m });
      }
    }
    return out;
  }

  // Захват: все соседи точки приземления, не принадлежащие игроку,
  // становятся игроком.
  function capture(b, toQ, toR, player) {
    const flipped = [];
    for (const n of HEX.neighbors(toQ, toR)) {
      const c = b.map.get(key(n.q, n.r));
      if (c && c.owner !== EMPTY && c.owner !== player) {
        c.owner = player;
        flipped.push({ q: n.q, r: n.r, was: c.owner });
      }
    }
    return flipped;
  }

  function apply(b, fromQ, fromR, toQ, toR) {
    const player = b.turn;
    const src = b.map.get(key(fromQ, fromR));
    const dst = b.map.get(key(toQ, toR));
    if (!src || !dst) return { ok: false, reason: "off-board" };
    if (src.owner !== player) return { ok: false, reason: "not-owner" };
    if (dst.owner !== EMPTY) return { ok: false, reason: "occupied" };
    const d = HEX.dist(fromQ, fromR, toQ, toR);
    if (d !== 1 && d !== 2) return { ok: false, reason: "distance" };
    const kind = d === 1 ? "clone" : "jump";
    dst.owner = player;
    if (kind === "jump") src.owner = EMPTY;
    const flipped = capture(b, toQ, toR, player);
    b.history.push({ fromQ, fromR, toQ, toR, kind, flipped, player });
    // Следующий игрок.
    const nxt = nextPlayer(b, player);
    if (nxt === 0) { finish(b); return { ok: true, kind, flipped, ended: true }; }
    b.turn = nxt;
    return { ok: true, kind, flipped };
  }

  function count(b) {
    const by = {};
    for (let p = 1; p <= b.numPlayers; p++) by[p] = 0;
    for (const c of b.cells) {
      if (c.owner !== EMPTY) by[c.owner] = (by[c.owner] || 0) + 1;
    }
    let free = 0;
    for (const c of b.cells) if (c.owner === EMPTY) free++;
    // Рейтинг: отсортированный список [player, score].
    const ranked = Object.entries(by)
      .map(([p, s]) => ({ player: +p, score: s }))
      .sort((a, b2) => b2.score - a.score);
    return { by, free, ranked, p1: by[1] || 0, p2: by[2] || 0 };
  }

  function finish(b) {
    const c = count(b);
    b.winner = c.ranked[0].player;
    b.finalCount = c;
  }

  // Обратная совместимость с 2-игроковой логикой.
  function count2(b) {
    const c = count(b);
    return { p1: c.by[1] || 0, p2: c.by[2] || 0, free: c.free };
  }

  return { EMPTY, P1, P2, MAX_PLAYERS, STARTS, create, clone, ownerAt,
           movesFrom, allMoves, apply, count, count2, finish, key };
})();