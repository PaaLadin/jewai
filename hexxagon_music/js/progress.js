// progress.js (v6) - прогрессия прохождения. localStorage.
// Хранит: освобождённые планеты, инструменты на каждой, центр, счёт.

const Progress = (() => {
  const KEY = "hexxagon_v6_progress";

  // Стиль -> планета (порядок: от дальней к ближней).
  const PLANETS = [
    { id:"blues",     name:"Тихая Гавань",  style:"blues",     bpm:80,  ai:"easy",
      orbit:4.2, angle:0.30, color:"#5888c8", hot:1,
      desc:"Дальняя планета. Здесь всё звучит медленно и печально — блюз." },
    { id:"ambient",   name:"Мшистый Шар",   style:"ambient",   bpm:60,  ai:"easy",
      orbit:3.9, angle:0.85, color:"#4a8a7a", hot:2,
      desc:"Тихий мир туманов. Музыка здесь — эмбиент, почти без ритма." },
    { id:"lofi",      name:"Пыльный Блюз",  style:"lofi",      bpm:85,  ai:"easy",
      orbit:3.6, angle:1.40, color:"#8a7a5a", hot:3,
      desc:"Пыльные равнины. Lo-fi — тёплый, ленивый грув." },
    { id:"jazz",      name:"Лесной Ритм",   style:"jazz",      bpm:120, ai:"medium",
      orbit:3.3, angle:1.95, color:"#c8a050", hot:4,
      desc:"Живые леса. Джаз — свинг, импровизация, ride." },
    { id:"classical", name:"Лавовый Кряж",  style:"classical", bpm:95,  ai:"medium",
      orbit:3.0, angle:2.50, color:"#c87050", hot:5,
      desc:"Лавовые реки. Классика — сонатная форма, струнные." },
    { id:"chip",      name:"Кристалл",      style:"chip",      bpm:150, ai:"medium",
      orbit:2.7, angle:3.05, color:"#50c8c8", hot:6,
      desc:"Кристаллический мир. 8-бит — pulse, арпеджио, трекер." },
    { id:"rock",      name:"Кузня",         style:"rock",      bpm:140, ai:"hard",
      orbit:2.4, angle:3.60, color:"#c85a50", hot:7,
      desc:"Планета-кузня. Рок — power chords, драйв." },
    { id:"metal",     name:"Молот",         style:"metal",     bpm:170, ai:"hard",
      orbit:2.1, angle:4.15, color:"#8a3a3a", hot:8,
      desc:"Тяжёлый мир. Метал — дабл-кик, палм-мьют." },
    { id:"dnb",       name:"Шторм",         style:"dnb",       bpm:174, ai:"hard",
      orbit:1.8, angle:4.70, color:"#5a3ac8", hot:9,
      desc:"Вечный шторм. Drum-n-bass — breakbeat, sub-bass." },
    { id:"retrowave", name:"Плазма",        style:"retrowave", bpm:105, ai:"hard",
      orbit:1.5, angle:5.25, color:"#ff2e97", hot:10,
      desc:"Ближняя к звезде. Ретровейв — горячий синт, неон." },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { planets: {}, totalScore: 0 };
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { return false; }
  }
  function reset() { localStorage.removeItem(KEY); }

  // Отметить победу на планете.
  // tools - сколько инструментов захвачено (0..7),
  // center - захвачено ли центральное поле (bool).
  function markWon(planetId, tools, center) {
    const d = load();
    const score = tools * (center ? 2 : 1);
    d.planets[planetId] = { won: true, tools: tools, center: !!center,
                            score: score, ts: Date.now() };
    // Пересчитать total.
    let total = 0;
    for (const k in d.planets) total += d.planets[k].score || 0;
    d.totalScore = total;
    save(d);
    return d.planets[planetId];
  }

  function isWon(planetId) {
    const d = load();
    return !!(d.planets[planetId] && d.planets[planetId].won);
  }
  function getPlanet(planetId) {
    const d = load();
    return d.planets[planetId] || null;
  }
  function totalScore() { return load().totalScore || 0; }
  function wonCount() {
    const d = load();
    return Object.keys(d.planets).filter(k => d.planets[k].won).length;
  }
  function allWon() { return wonCount() >= PLANETS.length; }

  // Отладка: всё открыто. В релизе — ?release=1 или флаг ниже false.
  let DEBUG_UNLOCK_ALL = true;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("release") === "1") DEBUG_UNLOCK_ALL = false;
  } catch (e) {}

  function isUnlocked(planetId) {
    if (DEBUG_UNLOCK_ALL) return true;
    // Первая планета всегда доступна, дальше — по порядку.
    const idx = PLANETS.findIndex(p => p.id === planetId);
    if (idx <= 0) return true;
    return isWon(PLANETS[idx-1].id);
  }

  // ИИ-сиды открыты после освобождения ВСЕХ планет с 2×7.
  function aiSeedsUnlocked() {
    if (DEBUG_UNLOCK_ALL) return true;
    const d = load();
    for (const p of PLANETS) {
      const w = d.planets[p.id];
      if (!w || !w.won) return false;
      if (!w.center || w.tools < 7) return false;
    }
    return true;
  }

  return { PLANETS, load, save, reset, markWon, isWon, getPlanet,
           totalScore, wonCount, allWon, isUnlocked, aiSeedsUnlocked,
           DEBUG_UNLOCK_ALL, KEY };
})();