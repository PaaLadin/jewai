// sound_packs.js - варианты ударных и тональных голосов.
// Разные "железо"-стили: аналог, цифра, акустика, 8-бит.

const SoundPacks = (() => {
  const PACKS = {
    analog: {
      name: "analog",
      kick: { f0: 160, f1: 45, dur: 0.30, type: "sine" },
      snare: { bp: 1800, dur: 0.2, tone: 180 },
      hat: { hp: 7500, dur: 0.045 },
      bass: { type: "sawtooth", lp0: 200, lp1: 900, detune: 5 },
      lead: { type: "square", lp0: 3500, lp1: 1200 },
    },
    digital: {
      name: "digital",
      kick: { f0: 200, f1: 60, dur: 0.22, type: "triangle" },
      snare: { bp: 2400, dur: 0.15, tone: 220 },
      hat: { hp: 9000, dur: 0.03 },
      bass: { type: "square", lp0: 300, lp1: 1200, detune: 0 },
      lead: { type: "sawtooth", lp0: 4000, lp1: 1800 },
    },
    acoustic: {
      name: "acoustic",
      kick: { f0: 120, f1: 40, dur: 0.42, type: "sine" },
      snare: { bp: 1500, dur: 0.25, tone: 160 },
      hat: { hp: 6500, dur: 0.06 },
      bass: { type: "triangle", lp0: 250, lp1: 700, detune: 3 },
      lead: { type: "triangle", lp0: 3000, lp1: 1000 },
    },
    chip: {
      name: "chip",
      kick: { f0: 240, f1: 80, dur: 0.15, type: "square" },
      snare: { bp: 3000, dur: 0.1, tone: 300 },
      hat: { hp: 10000, dur: 0.02 },
      bass: { type: "square", lp0: 400, lp1: 1500, detune: 0 },
      lead: { type: "square", lp0: 5000, lp1: 2500 },
    },
  };

  let current = "analog";
  function get(name) { return PACKS[name] || PACKS.analog; }
  function current_() { return PACKS[current]; }
  function set(name) { if (PACKS[name]) current = name; return PACKS[current]; }
  function names() { return Object.keys(PACKS); }

  return { PACKS, get, current: current_, set, names };
})();