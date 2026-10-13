// replay.js - экспорт/импорт партии в JSON, воспроизведение ходов.

const Replay = (() => {
  // Собрать запись партии из board.
  function exportGame(board, meta) {
    const rec = {
      version: 1,
      savedAt: new Date().toISOString(),
      numPlayers: board.numPlayers,
      playerStyles: meta.playerStyles || [],
      hotSeat: !!meta.hotSeat,
      winner: board.winner,
      moves: board.history.map(h => ({
        fromQ: h.fromQ, fromR: h.fromR,
        toQ: h.toQ, toR: h.toR,
        kind: h.kind,
        player: h.player,
        flipped: h.flipped.map(f => ({ q: f.q, r: f.r })),
      })),
      cells: board.cells.map(c => ({ q: c.q, r: c.r, owner: c.owner })),
      count: null,
    };
    const cnt = Board.count(board);
    rec.count = { by: cnt.by, free: cnt.free };
    return rec;
  }

  // Сохранить в localStorage.
  function save(rec) {
    const key = "hexxagon_replay_" + Date.now();
    try {
      localStorage.setItem(key, JSON.stringify(rec));
      return key;
    } catch (e) { return null; }
  }

  // Список сохранённых.
  function list() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("hexxagon_replay_")) {
        try {
          const r = JSON.parse(localStorage.getItem(k));
          out.push({ key: k, savedAt: r.savedAt, winner: r.winner,
                     moves: r.moves.length });
        } catch (e) {}
      }
    }
    return out.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  }

  // Воспроизвести партию с нуля (без UI): возвращает board.
  function replay(rec) {
    const b = Board.create(rec.numPlayers);
    for (const m of rec.moves) {
      b.turn = m.player;
      Board.apply(b, m.fromQ, m.fromR, m.toQ, m.toR);
    }
    return b;
  }

  // Скачать JSON.
  function download(rec, name) {
    const blob = new Blob([JSON.stringify(rec, null, 2)],
                          { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = (name || "hexxagon") + ".json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { exportGame, save, list, replay, download };
})();