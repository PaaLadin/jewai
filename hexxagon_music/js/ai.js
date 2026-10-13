// ai.js - противник. Уровни: easy (greedy), medium (1-ply+), hard (minimax 2-ply).
// Hexxagon - детерминированная, perfect information, ход всегда меняет
// состояние. Глубина 2-3 достижима.

const AI = (() => {

  function scorePosition(b, player) {
    const cnt = Board.count(b);
    const mine = cnt.by[player] || 0;
    let opp = 0;
    for (let p = 1; p <= b.numPlayers; p++) {
      if (p !== player) opp += cnt.by[p] || 0;
    }
    // Мобильность: число доступных ходов.
    const myMoves = Board.allMoves(b, player).length;
    // Угроза: сколько моих фишек могут быть захвачены следующим ходом.
    // (Грубая оценка - не считаем точно.)
    return mine * 3 - opp * 3 + myMoves * 0.5;
  }

  function scoreMove(b, move, player) {
    const clone = Board.clone(b);
    const res = Board.apply(clone, move.fromQ, move.fromR, move.toQ, move.toR);
    if (!res.ok) return -Infinity;
    const cnt = Board.count(clone);
    const mine = cnt.by[player] || 0;
    let opp = 0;
    for (let p = 1; p <= b.numPlayers; p++) {
      if (p !== player) opp += cnt.by[p] || 0;
    }
    let s = mine * 3 - opp * 3;
    s += res.flipped.length * 4;
    if (move.kind === "clone") s += 2;
    s += Board.allMoves(clone, player).length * 0.3;
    return s;
  }

  // 1-ply greedy (easy).
  function greedy(b, player) {
    const moves = Board.allMoves(b, player);
    if (!moves.length) return null;
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      const s = scoreMove(b, m, player);
      if (s > bestS) { bestS = s; best = m; }
    }
    return best;
  }
  // Minimax с alpha-beta, глубина d.
  function minimax(b, player, depth, alpha, beta, isMax) {
    if (depth === 0 || b.winner) {
      return scorePosition(b, player);
    }
    const cur = isMax ? player : nextOpp(b, player);
    const moves = Board.allMoves(b, cur);
    if (!moves.length) {
      // Пас: смена игрока.
      return minimax(b, player, depth - 1, alpha, beta, !isMax);
    }
    if (isMax) {
      let best = -Infinity;
      for (const m of moves) {
        const clone = Board.clone(b);
        clone.turn = cur;
        Board.apply(clone, m.fromQ, m.fromR, m.toQ, m.toR);
        const v = minimax(clone, player, depth - 1, alpha, beta, false);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const clone = Board.clone(b);
        clone.turn = cur;
        Board.apply(clone, m.fromQ, m.fromR, m.toQ, m.toR);
        const v = minimax(clone, player, depth - 1, alpha, beta, true);
        if (v < best) best = v;
        if (v < beta) beta = v;
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  // Следующий игрок после player (для minimax).
  function nextOpp(b, player) {
    for (let i = 1; i <= b.numPlayers; i++) {
      const p = ((player - 1 + i) % b.numPlayers) + 1;
      if (p !== player && Board.allMoves(b, p).length > 0) return p;
    }
    return player;
  }

  // Minimax-выбор: depth 2.
  function minimaxMove(b, player, depth) {
    const moves = Board.allMoves(b, player);
    if (!moves.length) return null;
    let best = null, bestV = -Infinity;
    const alpha0 = -Infinity, beta0 = Infinity;
    for (const m of moves) {
      const clone = Board.clone(b);
      clone.turn = player;
      Board.apply(clone, m.fromQ, m.fromR, m.toQ, m.toR);
      const v = minimax(clone, player, depth - 1, alpha0, beta0, false);
      if (v > bestV) { bestV = v; best = m; }
    }
    return best;
  }

  // Iterative deepening: увеличиваем глубину, пока есть бюджет.
  function iterativeDeepening(b, player, budgetMs) {
    const t0 = performance.now();
    let best = null;
    for (let d = 1; d <= 4; d++) {
      if (performance.now() - t0 > budgetMs * 0.6) break;
      const mv = minimaxMove(b, player, d);
      if (mv) best = mv;
      if (performance.now() - t0 > budgetMs) break;
    }
    return best || greedy(b, player);
  }

  function randomMove(b, player) {
    const moves = Board.allMoves(b, player);
    if (!moves.length) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Уровень: "easy" (greedy), "medium" (greedy+), "hard" (minimax).
  let level = "medium";

  function pickMove(b, player) {
    if (level === "easy") {
      // 50% greedy, 50% random.
      if (Math.random() < 0.5) return randomMove(b, player);
      return greedy(b, player);
    }
    if (level === "hard") {
      // Iterative deepening: depth 1..3, бюджет 250 мс.
      return iterativeDeepening(b, player, 250);
    }
    // medium.
    return greedy(b, player);
  }

  function setLevel(l) { level = l; }
  function getLevel() { return level; }

  return { pickMove, randomMove, greedy, minimaxMove,
           scoreMove, scorePosition, setLevel, getLevel };
})();