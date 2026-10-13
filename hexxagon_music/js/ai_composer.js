// ai_composer.js - процедурная генерация трека по seed.
// Берёт «авторский» стиль (Styles.get) как основу: тональность,
// прогрессию, структуру секций. Но мелодии, бас, арп и ритм-фигуры
// генерирует заново с seed-ГПСЧ. Synth-спеки наследует без изменений.

const AIComposer = (() => {
  const SPB = 16;

  // Гаммы.
  const SCALES = {
    minor:    [0,2,3,5,7,8,10],
    major:    [0,2,4,5,7,9,11],
    dorian:   [0,2,3,5,7,9,10],
    mixolyd:  [0,2,4,5,7,9,10],
    pentaMin: [0,3,5,7,10],
    pentaMaj: [0,2,4,7,9],
    blues:    [0,3,5,6,7,10],
  };

  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Взять ноту из гаммы (root — MIDI, scale — массив, degree — целое).
  function noteAt(root, scale, degree, octaveShift) {
    const oct = Math.floor(degree / scale.length) + (octaveShift || 0);
    const idx = ((degree % scale.length) + scale.length) % scale.length;
    return root + scale[idx] + 12 * oct;
  }

  // Построить мотив: count нот, длиной noteLen шагов, из гаммы.
  function genMotif(rnd, root, scale, count, opts) {
    opts = opts || {};
    const arr = new Array(SPB).fill(null);
    const positions = [];
    const noteLen = opts.noteLen || 4;    // 16-я / 8-я
    for (let i = 0; i < SPB; i += noteLen) positions.push(i);
    const shape = opts.shape; // "arch" | "asc" | "desc" | "random"
    let prevDeg = 0;
    for (let i = 0; i < count && i < positions.length; i++) {
      let deg;
      if (shape === "arch") {
        // 0,1,2,3,2,1,0
        const m = count - 1;
        const rel = i <= m/2 ? i : m - i;
        deg = rel;
      } else if (shape === "asc") {
        deg = i;
      } else if (shape === "desc") {
        deg = count - 1 - i;
      } else {
        // random walk
        deg = prevDeg + Math.floor(rnd() * 3) - 1;
        if (deg < 0) deg = 0;
        if (deg >= scale.length) deg = scale.length - 1;
        prevDeg = deg;
      }
      arr[positions[i]] = noteAt(root, scale, deg, opts.oct || 0);
    }
    return arr;
  }

  // Ритм-фигура для ударных: вернуть массив 16 из 0/1.
  function genDrum(rnd, opts) {
    const arr = new Array(SPB).fill(0);
    const style = opts.style;
    if (style === "kick4") {
      for (let i = 0; i < SPB; i += 4) arr[i] = 1;
    } else if (style === "snare24") {
      arr[4] = 1; arr[12] = 1;
      if (rnd() < 0.5) arr[14] = 1;
    } else if (style === "hat16") {
      for (let i = 0; i < SPB; i += 2) arr[i] = 1;
    } else if (style === "hatOff") {
      for (let i = 2; i < SPB; i += 4) arr[i] = 1;
    } else if (style === "break") {
      arr[0] = 1; arr[6] = 1; arr[10] = 1;
    } else if (style === "shuffle") {
      arr[0] = 1; arr[6] = 1; arr[10] = 1;
    } else if (style === "metal16") {
      for (let i = 0; i < SPB; i++) if (i % 4 === 0 || rnd() < 0.7) arr[i] = 1;
    }
    return arr;
  }

  // Дополнить массив до barLen тактов (зацикливая).
  function expandBar(bar, bars) {
    const out = new Array(bars * SPB).fill(null);
    for (let b = 0; b < bars; b++) {
      for (let s = 0; s < SPB; s++) {
        const v = bar[s];
        out[b*SPB + s] = v != null ? v : null;
      }
    }
    return out;
  }
  function expandTrig(bar, bars) {
    const out = new Array(bars * SPB).fill(0);
    for (let b = 0; b < bars; b++) {
      for (let s = 0; s < SPB; s++) out[b*SPB + s] = bar[s] ? 1 : 0;
    }
    return out;
  }

  // Прогрессия: 4 аккорда (degree, качество). По стилю.
  const PROGS = {
    retrowave: { root: 45, scale: SCALES.minor,    chords: [[0,"m"],[5,"M"],[2,"M"],[4,"M"]] },
    rock:      { root: 40, scale: SCALES.pentaMin, chords: [[0,"M"],[5,"M"],[2,"M"],[4,"M"]] },
    metal:     { root: 40, scale: SCALES.pentaMin, chords: [[0,"m"],[0,"m"],[5,"M"],[3,"M"]] },
    blues:     { root: 40, scale: SCALES.blues,    chords: [[0,"7"],[0,"7"],[3,"7"],[3,"7"]] },
    dnb:       { root: 36, scale: SCALES.dorian,   chords: [[0,"m"],[0,"m"],[5,"M"],[4,"m"]] },
    ambient:   { root: 48, scale: SCALES.major,    chords: [[0,"M"],[4,"m"],[5,"M"],[3,"M"]] },
    chip:      { root: 48, scale: SCALES.major,    chords: [[0,"M"],[4,"M"],[5,"m"],[3,"M"]] },
  };

  // Генерировать секцию: bars тактов, тип (intro/verse/chorus/bridge/outro).
  function genSection(rnd, styleName, secType, bars) {
    const P = PROGS[styleName] || PROGS.retrowave;
    const scale = P.scale;
    const root = P.root;
    const out = { kick:[], snare:[], hat:[], bass:[], pad:[], lead:[], arp:[] };

    // Выбрать фигуры для ударных по типу секции.
    let kickStyle = "kick4", snareStyle = "snare24", hatStyle = "hatOff";
    if (styleName === "rock") { kickStyle = "kick4"; snareStyle = "snare24"; hatStyle = "hatOff"; }
    if (styleName === "metal") { kickStyle = "metal16"; snareStyle = "snare24"; hatStyle = "hat16"; }
    if (styleName === "dnb") { kickStyle = "break"; snareStyle = "snare24"; hatStyle = "hat16"; }
    if (styleName === "blues") { kickStyle = "shuffle"; snareStyle = "snare24"; hatStyle = "hatOff"; }
    if (styleName === "ambient") { kickStyle = "none"; snareStyle = "none"; hatStyle = "none"; }
    if (styleName === "chip") { kickStyle = "kick4"; snareStyle = "snare24"; hatStyle = "hat16"; }

    // В intro и outro — урезать ударные.
    if (secType === "intro") { hatStyle = "none"; if (styleName !== "metal") kickStyle = "kick4"; }
    if (secType === "outro") { kickStyle = "kick4"; hatStyle = "none"; }

    const kickBar  = kickStyle  === "none" ? new Array(SPB).fill(0) : genDrum(rnd, {style: kickStyle});
    const snareBar = snareStyle === "none" ? new Array(SPB).fill(0) : genDrum(rnd, {style: snareStyle});
    const hatBar   = hatStyle   === "none" ? new Array(SPB).fill(0) : genDrum(rnd, {style: hatStyle});
    out.kick  = expandTrig(kickBar, bars);
    out.snare = expandTrig(snareBar, bars);
    out.hat   = expandTrig(hatBar, bars);

    // Bass: 8-е ноты по корням аккордов.
    const bassBar = new Array(SPB).fill(null);
    const chordIdx = 0;
    const c = P.chords[chordIdx];
    const bassRoot = noteAt(root, scale, c[0], -1);
    for (let i = 0; i < SPB; i += 2) {
      bassBar[i] = bassRoot + (rnd() < 0.15 ? 12 : 0);
    }
    // Для блюза — walking bass.
    if (styleName === "blues") {
      for (let i = 0; i < SPB; i += 2) {
        const deg = (i / 2) % 4;
        bassBar[i] = noteAt(root, scale, deg + (i % 4 === 0 ? 0 : 0), -1);
      }
    }
    out.bass = expandBar(bassBar, bars);

    // Pad: аккорд в начале каждого такта.
    const padBar = new Array(SPB).fill(null);
    padBar[0] = bassRoot + 12;
    if (secType === "chorus") padBar[8] = bassRoot + 12 + 7;
    out.pad = expandBar(padBar, bars);

    // Lead: только в verse/chorus/bridge, мотив.
    const leadBar = new Array(SPB).fill(null);
    if (secType === "verseA" || secType === "chorus" || secType === "bridge") {
      const shape = secType === "chorus" ? "arch" : (secType === "bridge" ? "asc" : "random");
      const motif = genMotif(rnd, root, scale, 5, { noteLen: 4, shape, oct: 1 });
      for (let i = 0; i < SPB; i++) leadBar[i] = motif[i];
    }
    out.lead = expandBar(leadBar, bars);

    // Arp: 16-е по аккорду.
    const arpBar = new Array(SPB).fill(null);
    if (styleName === "retrowave" || styleName === "chip" || styleName === "dnb") {
      const c0 = P.chords[0];
      const arpDeg = [0, 2, 4, 7, 4, 2];
      for (let i = 0; i < SPB; i++) {
        const d = arpDeg[i % arpDeg.length];
        arpBar[i] = noteAt(root, scale, c0[0] + d, 1);
      }
    }
    out.arp = expandBar(arpBar, bars);

    return out;
  }

  // Главный API: собрать полный трек по стилю и seed.
  function compose(styleName, seed) {
    const base = (typeof Styles !== "undefined") ? Styles.get(styleName) : null;
    if (!base) return null;
    const rnd = mulberry32(seed || Math.floor(Math.random() * 1e9));
    // Развернуть существующую структуру секций base как шаблон.
    const sections = base.sections.map(sec => ({
      name: sec.name,
      len: sec.len,
      pat: genSection(rnd, styleName, sec.name, sec.len),
    }));
    return {
      name: base.name + "·AI",
      bpm: base.bpm,
      sections,
      synth: base.synth,
      SPB: base.SPB || 16,
      targetSec: base.targetSec || 120,
      seed: seed,
    };
  }

  return { compose, SCALES, PROGS };
})();
next_id: DDAA7132