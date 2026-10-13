// achievements.js - ачивки и рекорды. Хранятся в localStorage.

const Achv = (() => {
  const KEY = "hexxagon_achv_v1";

  const DEFS = [
    { id: "first_win",   name: "Первая победа",   desc: "Выиграть партию" },
    { id: "flawless",    name: "Безупречно",      desc: "Победить, не потеряв ни одной фишки" },
    { id: "orchestra",   name: "Оркестр",         desc: "Захватить все 6 угловых секторов" },
    { id: "full_mix",    name: "Полный микс",     desc: "Услышать 7 дорожек одновременно" },
    { id: "hotseat_4",   name: "Квартет",         desc: "Игра в hot seat на 4 игрока" },
    { id: "hard_win",    name: "Против сильного", desc: "Победить на уровне hard" },
    { id: "all_styles",  name: "Меломан",         desc: "Попробовать все 7 стилей" },
    { id: "wav_export",  name: "Звукорежиссёр",   desc: "Экспортировать мелодию в WAV" },
  ];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) { return {}; }
  }
  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function unlock(id) {
    const st = load();
    if (st[id]) return false;
    st[id] = { at: new Date().toISOString() };
    save(st);
    // Событие для UI.
    window.dispatchEvent(new CustomEvent("achv", { detail: { id } }));
    return true;
  }

  function isUnlocked(id) { return !!load()[id]; }
  function all() {
    const st = load();
    return DEFS.map(d => ({ ...d, unlocked: !!st[d.id], at: st[d.id]?.at }));
  }

  // Рекорды.
  const RK = "hexxagon_rec_v1";
  function getRecords() {
    try { return JSON.parse(localStorage.getItem(RK) || "{}"); }
    catch (e) { return {}; }
  }
  function tryRecord(name, value, better) {
    const r = getRecords();
    const cur = r[name];
    if (cur == null || better(value, cur)) {
      r[name] = value;
      localStorage.setItem(RK, JSON.stringify(r));
      return true;
    }
    return false;
  }

  return { DEFS, load, unlock, isUnlocked, all, getRecords, tryRecord };
})();