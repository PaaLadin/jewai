// autosave.js - автосохранение текущей партии.
// Ключ: hexxagon_autosave. При загрузке можно продолжить.

const Autosave = (() => {
  const KEY = "hexxagon_autosave_v1";
  let lastSave = 0;
  const MIN_INTERVAL = 2000;   // мс между сейвами

  function snapshot(board, state) {
    return {
      savedAt: new Date().toISOString(),
      numPlayers: board.numPlayers,
      turn: board.turn,
      winner: board.winner,
      history: board.history.map(h => ({
        fromQ: h.fromQ, fromR: h.fromR, toQ: h.toQ, toR: h.toR,
        kind: h.kind, player: h.player,
      })),
      cells: board.cells.map(c => ({ q: c.q, r: c.r, owner: c.owner })),
      meta: state || {},
    };
  }

  function save(board, state) {
    const now = Date.now();
    if (now - lastSave < MIN_INTERVAL) return false;
    lastSave = now;
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot(board, state)));
      return true;
    } catch (e) { return false; }
  }

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  function clear() { localStorage.removeItem(KEY); }

  function hasSave() { return !!localStorage.getItem(KEY); }

  return { save, load, clear, hasSave };
})();