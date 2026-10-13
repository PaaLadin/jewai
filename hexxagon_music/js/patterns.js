// patterns.js - паттерны мелодии. MVP: retrowave, 8 тактов.
// Формат: { channel: [128 значений] }.
// Ударные: 1 = триггер, 0 = тишина.
// Тональные: null = пауза, число = MIDI-нота.

const Patterns = (() => {
  const BARS = 8;
  const STEPS_PER_BAR = 16;
  const N = BARS * STEPS_PER_BAR;   // 128 шагов

  // Ноты (MIDI): A2=45, C3=48, D3=50, E3=52, F3=53, G3=55.
  const A2 = 45, C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55;
  const A3 = 57, C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69;

  // Собрать 128 шагов из 8 тактов по 16.
  function seq(...bars) {
    const out = new Array(N).fill(0);
    for (let i = 0; i < bars.length && i < BARS; i++) {
      for (let s = 0; s < STEPS_PER_BAR; s++) {
        out[i * STEPS_PER_BAR + s] = bars[i][s];
      }
    }
    return out;
  }

  // --- KICK: 4-on-floor ---
  const K1 = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  const kick = seq(K1,K1,K1,K1, K1,K1,K1,K1);

  // --- SNARE: шаги 4 и 12 ---
  const S1 = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const snare = seq(S1,S1,S1,S1, S1,S1,S1,S1);

  // --- HAT: off-beat 8-е ---
  const H1 = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
  const hat = seq(H1,H1,H1,H1, H1,H1,H1,H1);
  // --- BASS: арпеджио 1/8, прогрессия Am - F - C - G (2 такта) x4 ---
  const bAm = [A2,null,A3,null,E3,null,A3,null, A2,null,C3,null,E3,null,A3,null];
  const bF  = [F3,null,F3,null,A3,null,C4,null, F3,null,A3,null,C4,null,F4,null];
  const bC  = [C3,null,C3,null,E3,null,G3,null, C3,null,E3,null,G3,null,C4,null];
  const bG  = [G3,null,G3,null,D4,null,G4,null, G3,null,D4,null,G4,null,D4,null];

  const bass = seq(bAm,bF,bC,bG, bAm,bF,bC,bG);

  // --- PAD: длинные аккорды по тактам (базовая нота) ---
  const pAm = [A3,null,null,null, null,null,null,null, E4,null,null,null, null,null,null,null];
  const pF  = [F4,null,null,null, null,null,null,null, A4,null,null,null, null,null,null,null];
  const pC  = [C4,null,null,null, null,null,null,null, G4,null,null,null, null,null,null,null];
  const pG  = [G4,null,null,null, null,null,null,null, D4,null,null,null, null,null,null,null];
  const pad = seq(pAm,pF,pC,pG, pAm,pF,pC,pG);

  // --- LEAD: мелодия, фразами ---
  const lAm = [A4,null,null,null, null,null,C4,null, E4,null,null,null, null,null,null,null];
  const lF  = [F4,null,null,null, null,null,A4,null, C4,null,null,null, null,null,null,null];
  const lC  = [C4,null,null,null, null,null,E4,null, G4,null,null,null, null,null,null,null];
  const lG  = [G4,null,null,null, null,null,D4,null, G4,null,null,null, null,null,null,null];
  const lead = seq(lAm,lF,lC,lG, lAm,lF,lC,lG);

  // --- ARP: быстрые 16-е ---
  const aAm = [A4,C4,E4,A4, C4,E4,A4,C4, E4,A4,C4,E4, A4,C4,E4,A4];
  const aF  = [F4,A4,C4,F4, A4,C4,F4,A4, C4,F4,A4,C4, F4,A4,C4,F4];
  const aC  = [C4,E4,G4,C4, E4,G4,C4,E4, G4,C4,E4,G4, C4,E4,G4,C4];
  const aG  = [G4,D4,G4,D4, G4,D4,G4,D4, D4,G4,D4,G4, D4,G4,D4,G4];
  const arp = seq(aAm,aF,aC,aG, aAm,aF,aC,aG);

  const RW = {
    name: "retrowave",
    bpm: 100,
    bars: BARS,
    stepsPerBar: STEPS_PER_BAR,
    pattern: { kick, snare, hat, bass, pad, lead, arp },
  };

  return { RW, BARS, STEPS_PER_BAR, N };
})();