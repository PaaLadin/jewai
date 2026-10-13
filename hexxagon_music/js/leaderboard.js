// leaderboard.js - таблица лидеров. Локальная (localStorage),
// но её можно экспортировать/импортировать.

const Leaderboard = (() => {
  const KEY = "hexxagon_leaderboard_v1";
  const MAX_ENTRIES = 50;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) { return []; }
  }
  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
      return true;
    } catch (e) { return false; }
  }

  function add(entry) {
    const list = load();
    list.push({
      at: new Date().toISOString(),
      name: entry.name || "Аноним",
      winner: entry.winner,
      score: entry.score,
      moves: entry.moves,
      secs: entry.secs,
      aiLevel: entry.aiLevel,
      numPlayers: entry.numPlayers,
      preset: entry.preset,
      hotSeat: !!entry.hotSeat,
      seed: entry.seed,
    });
    // Сортировка: по очкам победителя, потом по времени.
    list.sort((a, b) => {
      if (a.hotSeat !== b.hotSeat) return a.hotSeat ? 1 : -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.secs - b.secs;
    });
    save(list);
    return list;
  }

  function clear() { localStorage.removeItem(KEY); }

  function top(n) { return load().slice(0, n || 10); }

  function exportJSON() { return JSON.stringify(load(), null, 2); }
  function importJSON(s) {
    try {
      const list = JSON.parse(s);
      if (!Array.isArray(list)) return false;
      save(list);
      return true;
    } catch (e) { return false; }
  }

  return { add, clear, top, load, exportJSON, importJSON, MAX_ENTRIES };
})();