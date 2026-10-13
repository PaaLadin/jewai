// compose.js - построение полной аранжировки из компактного спека.
// Стиль задаёт: прогрессию, мотивы, ритм, структуру.
// Compose разворачивает это в секции (intro/verse/chorus/bridge/outro).
// Используется как для «авторских» треков (fixed), так и для «ИИ» (seed).

const Compose = (() => {
  const SPB = 16;  // шагов на такт

  // Простая хеш-функция для seed → детерминированный ГПСЧ.
  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Бар из массива паттернов (массив длиной SPB).
  function bar(p) {
    const out = new Array(SPB).fill(null);
    for (let i = 0; i < SPB; i++) out[i] = (p[i] != null) ? p[i] : null;
    return out;
  }

  // Собрать секцию: bars раз по pattern-бару.
  function section(name, bars, patterns) {
    const out = { name, bars, channels: {} };
    for (const ch in patterns) {
      const src = patterns[ch];
      const chArr = new Array(bars * SPB).fill(null);
      for (let b = 0; b < bars; b++) {
        const bsrc = Array.isArray(src) ? (src[b % src.length]) : src;
        for (let s = 0; s < SPB; s++) {
          chArr[b * SPB + s] = (bsrc && bsrc[s] != null) ? bsrc[s] : null;
        }
      }
      out.channels[ch] = chArr;
    }
    return out;
  }

  // Быстрая обёртка: превратить массив тактов в один паттерн.
  function seq(...bars) {
    const N = bars.length * SPB;
    const out = new Array(N).fill(null);
    for (let i = 0; i < bars.length; i++) {
      for (let s = 0; s < SPB; s++) {
        out[i * SPB + s] = (bars[i][s] != null) ? bars[i][s] : null;
      }
    }
    return out;
  }

  // Генератор мотива из гаммы: n нот, длина, seed-rand.
  function genMotif(scale, count, rnd) {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(scale[Math.floor(rnd() * scale.length)]);
    }
    return out;
  }

  // Разложить мотив по шагам (простая сетка 1/8 или 1/16).
  function placeMotif(motif, stepDiv, SPB_) {
    const spb = SPB_ || SPB;
    const arr = new Array(spb).fill(null);
    const positions = [];
    for (let i = 0; i < spb; i += stepDiv) positions.push(i);
    for (let i = 0; i < motif.length && i < positions.length; i++) {
      arr[positions[i]] = motif[i];
    }
    return arr;
  }

  return { mulberry32, bar, section, seq, genMotif, placeMotif, SPB };
})();
next_id: DDAA7111