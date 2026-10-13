// daily.js - "партия дня". Seed от даты YYYY-MM-DD. У всех игроков
// одинаковый вызов в один день.
// Пресеты по дню недели, стиль дня.

const Daily = (() => {
  const MODES = ["classic-2", "cross-4", "corners-4", "spiral-3"];
  const STYLES = ["retrowave","rock","metal","blues","dnb","ambient","chip"];

  function today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + dd;
  }

  // Hash строки в 32-битный int.
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function challenge(date) {
    const d = date || today();
    const h = hash(d);
    return {
      date: d,
      seed: h,
      preset: MODES[h % MODES.length],
      p1Style: STYLES[(h >> 3) % STYLES.length],
      p2Style: STYLES[(h >> 7) % STYLES.length],
      aiLevel: ["easy","medium","hard"][(h >> 11) % 3],
    };
  }

  // Записать результат дня (сохранить).
  function recordResult(date, winner, score) {
    try {
      const key = "hexxagon_daily_" + (date || today());
      localStorage.setItem(key, JSON.stringify({
        at: new Date().toISOString(),
        winner, score,
      }));
    } catch (e) {}
  }
  function getResult(date) {
    try {
      const key = "hexxagon_daily_" + (date || today());
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  return { today, challenge, recordResult, getResult };
})();