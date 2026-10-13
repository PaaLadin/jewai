// styles.js - 7 стилей. Каждый стиль = BPM + секции + synth-спеки.
// Секции: intro, verseA, verseB, chorus, bridge, outro (разной длины).
// synth[ch] = { type, filter:{type,f0,f1,q}, adsr:{a,d,s,r}, detune, oct }.
// audio.js читает synth[ch] активного стиля.

const Styles = (() => {
  const SPB = 16;

  // MIDI-ноты.
  const n = {
    C2:36, Cs2:37, D2:38, Eb2:39, E2:40, F2:41, Fs2:42, G2:43, Ab2:44, A2:45, Bb2:46, B2:47,
    C3:48, Cs3:49, D3:50, Eb3:51, E3:52, F3:53, Fs3:54, G3:55, Ab3:56, A3:57, Bb3:58, B3:59,
    C4:60, Cs4:61, D4:62, Eb4:63, E4:64, F4:65, Fs4:66, G4:67, Ab4:68, A4:69, Bb4:70, B4:71,
    C5:72, D5:74, E5:76, F5:77, G5:79, A5:81, B5:83,
  };
  const _ = null;

  // Ритмические константы (массивы 16 шагов = 1 такт).
  const K4   = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];  // 4-on-floor
  const K13  = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];  // 1 и 3
  const K16  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];  // 16-е
  const Km   = [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0];  // breakbeat kick
  const K13b = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];  // rock
  const Ksw  = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];  // shuffle
  const S24  = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];  // 2 и 4
  const Sh   = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0];  // 2, 4 и синкопа
  const H8   = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];  // off-beat
  const H16  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];  // 16-е
  const Hsw  = [0,0,1,0, 0,1,1,0, 0,0,1,0, 0,1,1,0];  // swing
  const H0   = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];  // тишина

  function seq(...bars) {
    const N = bars.length * SPB;
    const out = new Array(N).fill(_);
    for (let i = 0; i < bars.length; i++) {
      for (let s = 0; s < SPB; s++) {
        out[i*SPB+s] = (bars[i][s] != null && bars[i][s] !== 0) ? bars[i][s] : (bars[i][s] === 0 ? 0 : _);
      }
    }
    return out;
  }
  function trig(...bars) {
    const N = bars.length * SPB;
    const out = new Array(N).fill(0);
    for (let i = 0; i < bars.length; i++) {
      for (let s = 0; s < SPB; s++) out[i*SPB+s] = bars[i][s] ? 1 : 0;
    }
    return out;
  }
  function emptyMidi(bars) { return new Array(bars*SPB).fill(_); }
  function emptyTrig(bars) { return new Array(bars*SPB).fill(0); }

  // ---- Стиль: retrowave (100 BPM) ----
  // Прогрессия Am-F-C-G, 4 такта x 4 секции.
  function retrowave() {
    const bAm=[45,_,57,_,52,_,57,_, 45,_,48,_,52,_,57,_];
    const bF =[53,_,53,_,57,_,60,_, 53,_,57,_,60,_,65,_];
    const bC =[48,_,48,_,52,_,55,_, 48,_,52,_,55,_,60,_];
    const bG =[55,_,55,_,62,_,67,_, 55,_,62,_,67,_,62,_];
    const lAm=[69,_,_,_,_,_,64,_,67,_,_,_,_,_,_,_];
    const lF =[65,_,_,_,_,_,69,_,72,_,_,_,_,_,_,_];
    const lC =[64,_,_,_,_,_,67,_,72,_,_,_,_,_,_,_];
    const lG =[67,_,_,_,_,_,62,_,67,_,_,_,_,_,_,_];
    const aAm=[69,60,64,69, 60,64,69,60, 64,69,60,64, 69,60,64,69];
    const aF =[65,69,60,65, 69,60,65,69, 60,65,69,60, 65,69,60,65];
    const aC =[60,64,67,60, 64,67,60,64, 67,60,64,67, 60,64,67,60];
    const aG =[67,62,67,62, 67,62,67,62, 62,67,62,67, 62,67,62,67];

    const verseA = { kick:trig(K4,K4,K4,K4), snare:trig(S24,S24,S24,S24), hat:trig(H8,H8,H8,H8),
      bass:seq(bAm,bF,bC,bG), pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_]),
      lead:emptyMidi(4), arp:seq(aAm,aF,aC,aG) };
    const verseB = { kick:trig(K4,K4,K4,K4), snare:trig(S24,S24,S24,S24), hat:trig(H8,H8,H8,H8),
      bass:seq(bAm,bF,bC,bG), pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_]),
      lead:seq(lAm,lF,lC,lG), arp:seq(aAm,aF,aC,aG) };
    const chorus = { kick:trig(K4,K4,K4,K4,K4,K4,K4,K4), snare:trig(S24,S24,S24,S24,S24,S24,S24,S24),
      hat:trig(H8,H8,H8,H8,H8,H8,H8,H8),
      bass:seq(bAm,bF,bC,bG,bAm,bF,bC,bG),
      pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_],
        [45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_]),
      lead:seq(lAm,lF,lC,lG,lAm,lF,lC,lG), arp:seq(aAm,aF,aC,aG,aAm,aF,aC,aG) };
    const intro = { kick:emptyTrig(4), snare:emptyTrig(4), hat:emptyTrig(4),
      bass:seq(bAm,bF,bC,bG), pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_]),
      lead:emptyMidi(4), arp:emptyMidi(4) };
    const bridge = { kick:trig(K4,K4,K4,K4), snare:trig(S24,S24,S24,S24), hat:trig(H16,H16,H16,H16),
      bass:seq(bAm,bF,bC,bG),
      pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_],
        [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_],[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_]),
      lead:seq([64,_,_,_,67,_,_,_,69,_,_,_,_,_,_,_],[65,_,_,_,69,_,_,_,72,_,_,_,_,_,_,_],
        [64,_,_,_,67,_,_,_,72,_,_,_,_,_,_,_],[62,_,_,_,67,_,_,_,74,_,_,_,_,_,_,_]),
      arp:seq(aAm,aF,aC,aG) };
    const outro = { kick:trig(K13,K13), snare:trig(S24,S24), hat:trig(H8,H8),
      bass:seq(bAm,bF), pad:seq([45,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_],[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_]),
      lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "retrowave", bpm: 100,
      sections: [
        { name:"intro",  len:4, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"verseB", len:4, pat:verseB },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:150, f1:45, dur:0.30, click:3000 },
        snare:{ bp:1800, dur:0.20, tone:180 },
        hat:  { hp:7500, dur:0.045 },
        bass: { type:"sawtooth", lp0:200, lp1:900, detune:5, adsr:{a:0.005,d:0.2,s:0.7,r:0.2} },
        pad:  { type:"sawtooth", detune:14, lp:1800, adsr:{a:0.4,d:0.3,s:0.8,r:1.5} },
        lead: { type:"square", lp0:3500, lp1:1200, adsr:{a:0.01,d:0.2,s:0.6,r:0.15}, vibrato:{f:5.5,d:6} },
        arp:  { type:"square", duty:0.25, hp:400, adsr:{a:0.005,d:0.12,s:0.3,r:0.08} },
      },
    };
  }

  // ---- Стиль: rock (130 BPM) ----
  function rock() {
    const bE=[40,_,_,_, 40,_,_,_, 40,_,_,_, 40,_,_,_];
    const bC=[36,_,_,_, 36,_,_,_, 36,_,_,_, 36,_,_,_];
    const bG=[43,_,_,_, 43,_,_,_, 43,_,_,_, 43,_,_,_];
    const bD=[38,_,_,_, 38,_,_,_, 38,_,_,_, 38,_,_,_];
    const gE=[40,_,40,_, _,_,40,_, _,_,40,_, _,_,40,40];
    const gC=[36,_,36,_, _,_,36,_, _,_,36,_, _,_,36,36];
    const gG=[43,_,43,_, _,_,43,_, _,_,43,_, _,_,43,43];
    const gD=[38,_,38,_, _,_,38,_, _,_,38,_, _,_,38,38];
    const lead1=[64,_,67,_,69,_,67,_,64,_,_,_,_,_,_,_];
    const lead2=[62,_,65,_,67,_,65,_,62,_,_,_,_,_,_,_];
    const lead3=[67,_,71,_,74,_,71,_,67,_,_,_,_,_,_,_];
    const lead4=[62,_,66,_,69,_,66,_,62,_,_,_,_,_,_,_];
    const K13b=[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
    const Sh=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0];

    const verseA = { kick:trig(K13b,K13b,K13b,K13b), snare:trig(Sh,Sh,Sh,Sh), hat:trig(H8,H8,H8,H8),
      bass:seq(bE,bC,bG,bD), pad:emptyMidi(4), lead:seq(lead1,lead2,lead3,lead4), arp:emptyMidi(4) };
    const chorus = { kick:trig(K13b,K13b,K13b,K13b,K13b,K13b,K13b,K13b),
      snare:trig(Sh,Sh,Sh,Sh,Sh,Sh,Sh,Sh), hat:trig(H16,H16,H16,H16,H16,H16,H16,H16),
      bass:seq(bE,bC,bG,bD,bE,bC,bG,bD), pad:emptyMidi(8),
      lead:seq(lead1,lead2,lead3,lead4,lead1,lead2,lead3,lead4), arp:emptyMidi(8) };
    const bridge = { kick:trig(K13b,K13b,K13b,K13b), snare:trig(Sh,Sh,Sh,Sh), hat:trig(H8,H8,H8,H8),
      bass:seq(bE,bC,bG,bD), pad:emptyMidi(4),
      lead:seq([64,_,_,_,67,_,69,_,71,_,69,_,67,_,_,_],[62,_,_,_,65,_,67,_,69,_,67,_,65,_,_,_],
        [67,_,_,_,71,_,74,_,76,_,74,_,71,_,_,_],[62,_,_,_,66,_,69,_,71,_,69,_,66,_,_,_]),
      arp:emptyMidi(4) };
    const intro = { kick:trig(K13b,K13b), snare:trig(Sh,Sh), hat:trig(H8,H8),
      bass:seq(bE,bC), pad:emptyMidi(2), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(K13b,K13b), snare:trig(Sh,Sh), hat:trig(H8,H8),
      bass:seq(bE,bE), pad:emptyMidi(2), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "rock", bpm: 130,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:170, f1:48, dur:0.28, click:3200 },
        snare:{ bp:2000, dur:0.18, tone:200 },
        hat:  { hp:8000, dur:0.04 },
        bass: { type:"sawtooth", lp0:280, lp1:1400, detune:2, adsr:{a:0.004,d:0.15,s:0.6,r:0.1} },
        pad:  { type:"sawtooth", detune:20, lp:2200, adsr:{a:0.2,d:0.3,s:0.7,r:0.8} },
        lead: { type:"sawtooth", lp0:4000, lp1:1800, drive:0.55, adsr:{a:0.005,d:0.25,s:0.5,r:0.2} },
        arp:  { type:"square", duty:0.5, hp:600, adsr:{a:0.005,d:0.15,s:0.3,r:0.1} },
      },
    };
  }

  // ---- Стиль: metal (160 BPM) ----
  function metal() {
    const m16=[40,40,40,40, 40,40,40,40, 40,40,40,40, 40,40,40,40];
    const m16b=[38,38,38,38, 38,38,38,38, 38,38,38,38, 38,38,38,38];
    const mKick16=[1,1,1,1, 1,0,1,1, 1,1,1,1, 1,0,1,1];
    const ride=[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];

    const verseA = { kick:trig(mKick16,mKick16,mKick16,mKick16), snare:trig(Sh,Sh,Sh,Sh),
      hat:trig(ride,ride,ride,ride), bass:seq(m16,m16b,m16,m16b),
      pad:emptyMidi(4), lead:emptyMidi(4), arp:emptyMidi(4) };
    const chorus = { kick:trig(mKick16,mKick16,mKick16,mKick16,mKick16,mKick16,mKick16,mKick16),
      snare:trig(Sh,Sh,Sh,Sh,Sh,Sh,Sh,Sh), hat:trig(ride,ride,ride,ride,ride,ride,ride,ride),
      bass:seq(m16,m16b,m16,m16b,m16,m16b,m16,m16b),
      pad:emptyMidi(8),
      lead:seq([52,_,_,_,55,_,_,_,57,_,_,_,55,_,_,_],[50,_,_,_,53,_,_,_,55,_,_,_,53,_,_,_],
        [52,_,_,_,55,_,_,_,57,_,_,_,59,_,_,_],[50,_,_,_,53,_,_,_,55,_,_,_,53,_,_,_],
        [52,_,_,_,55,_,_,_,57,_,_,_,55,_,_,_],[50,_,_,_,53,_,_,_,55,_,_,_,53,_,_,_],
        [52,_,_,_,55,_,_,_,57,_,_,_,59,_,_,_],[50,_,_,_,53,_,_,_,55,_,_,_,53,_,_,_]),
      arp:emptyMidi(8) };
    const bridge = { kick:trig(K13b,K13b,K13b,K13b), snare:trig(Sh,Sh,Sh,Sh), hat:trig(ride,ride,ride,ride),
      bass:seq(m16,m16b,m16,m16b), pad:emptyMidi(4), lead:emptyMidi(4), arp:emptyMidi(4) };
    const intro = { kick:trig(mKick16,mKick16), snare:trig(Sh,Sh), hat:trig(ride,ride),
      bass:seq(m16,m16b), pad:emptyMidi(2), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(K13b,K13b), snare:trig(Sh,Sh), hat:trig(ride,ride),
      bass:seq(m16,m16), pad:emptyMidi(2), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "metal", bpm: 160,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:200, f1:50, dur:0.22, click:4000 },
        snare:{ bp:2600, dur:0.14, tone:220 },
        hat:  { hp:9000, dur:0.035 },
        bass: { type:"sawtooth", lp0:350, lp1:2000, detune:1, drive:0.7, adsr:{a:0.002,d:0.1,s:0.5,r:0.08} },
        pad:  { type:"sawtooth", detune:25, lp:2600, adsr:{a:0.15,d:0.3,s:0.6,r:0.7} },
        lead: { type:"sawtooth", lp0:5000, lp1:2200, drive:0.85, adsr:{a:0.003,d:0.2,s:0.5,r:0.15} },
        arp:  { type:"square", duty:0.5, hp:800, adsr:{a:0.003,d:0.1,s:0.3,r:0.06} },
      },
    };
  }

  // ---- Стиль: blues (85 BPM) ----
  function blues() {
    const bE1=[40,_,43,_,45,_,43,_, 40,_,43,_,45,_,47,55];
    const bA1=[45,_,48,_,50,_,48,_, 45,_,48,_,50,_,52,60];
    const bB1=[47,_,50,_,52,_,50,_, 47,_,50,_,52,_,54,62];
    const bl1=[64,_,67,_,69,_,71,_, 69,_,67,_,64,_,_,_];
    const bl2=[67,_,69,_,71,_,74,_, 71,_,69,_,67,_,_,_];
    const bl3=[64,67,69,_,67,64,_,_, 64,_,_,_,_,_,_,_];
    const comp1=[57,60,64,_, 57,60,64,_, 57,60,64,_, 57,60,64,_];
    const comp2=[53,57,60,_, 53,57,60,_, 53,57,60,_, 53,57,60,_];
    const Ksw=[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];

    const verseA = { kick:trig(Ksw,Ksw,Ksw,Ksw), snare:trig(Sh,Sh,Sh,Sh), hat:trig(Hsw,Hsw,Hsw,Hsw),
      bass:seq(bE1,bE1,bA1,bA1), pad:seq(comp1,comp1,comp2,comp2),
      lead:seq(bl1,bl1,bl2,bl2), arp:emptyMidi(4) };
    const chorus = { kick:trig(Ksw,Ksw,Ksw,Ksw,Ksw,Ksw,Ksw,Ksw),
      snare:trig(Sh,Sh,Sh,Sh,Sh,Sh,Sh,Sh), hat:trig(Hsw,Hsw,Hsw,Hsw,Hsw,Hsw,Hsw,Hsw),
      bass:seq(bE1,bE1,bA1,bA1,bE1,bE1,bB1,bA1),
      pad:seq(comp1,comp1,comp2,comp2,comp1,comp1,comp2,comp2),
      lead:seq(bl1,bl1,bl2,bl2,bl1,bl1,bl3,bl2), arp:emptyMidi(8) };
    const bridge = { kick:trig(Ksw,Ksw,Ksw,Ksw), snare:trig(Sh,Sh,Sh,Sh), hat:trig(Hsw,Hsw,Hsw,Hsw),
      bass:seq(bE1,bA1,bB1,bA1), pad:seq(comp1,comp2,comp2,comp1),
      lead:seq([64,_,_,_,67,_,69,_,71,_,69,_,67,_,64,_],[69,_,_,_,71,_,74,_,76,_,74,_,71,_,69,_],
        [71,_,_,_,74,_,76,_,79,_,76,_,74,_,71,_],[69,_,_,_,67,_,64,_,62,_,64,_,67,_,_,_]),
      arp:emptyMidi(4) };
    const intro = { kick:trig(Ksw,Ksw), snare:trig(Sh,Sh), hat:trig(Hsw,Hsw),
      bass:seq(bE1,bA1), pad:seq(comp1,comp2), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(Ksw,Ksw), snare:trig(Sh,Sh), hat:trig(Hsw,Hsw),
      bass:seq(bE1,bE1), pad:seq(comp1,comp1), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "blues", bpm: 85,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:130, f1:42, dur:0.35, click:2200 },
        snare:{ bp:1400, dur:0.24, tone:160 },
        hat:  { hp:6500, dur:0.06 },
        bass: { type:"triangle", lp0:200, lp1:700, detune:0, adsr:{a:0.008,d:0.25,s:0.5,r:0.15} },
        pad:  { type:"sawtooth", detune:8, lp:1400, adsr:{a:0.15,d:0.4,s:0.7,r:1.0} },
        lead: { type:"sawtooth", lp0:2600, lp1:1600, harm:1, adsr:{a:0.01,d:0.3,s:0.6,r:0.2}, vibrato:{f:5,d:10} },
        arp:  { type:"triangle", hp:500, adsr:{a:0.01,d:0.2,s:0.4,r:0.1} },
      },
    };
  }

  // ---- Стиль: dnb (174 BPM) ----
  function dnb() {
    const breakK=[1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0];
    const breakS=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1];
    const brkH=[1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,1];
    const dB1=[36,_,_,_, 36,_,_,_, 36,_,_,_, 36,_,_,_];
    const dB2=[43,_,_,_, 43,_,_,_, 41,_,_,_, 41,_,_,_];
    const dB3=[40,_,_,_, 40,_,_,_, 36,_,_,_, 36,_,_,_];
    const pad1=[60,_,_,_,_,_,_,_, 64,_,_,_,_,_,_,_];
    const pad2=[55,_,_,_,_,_,_,_, 59,_,_,_,_,_,_,_];
    const pad3=[53,_,_,_,_,_,_,_, 57,_,_,_,_,_,_,_];
    const arpD=[72,_,76,_,79,_,76,_, 72,_,76,_,79,_,84,_];
    const arpG=[67,_,71,_,74,_,71,_, 67,_,71,_,74,_,79,_];
    const arpC=[60,_,64,_,67,_,64,_, 60,_,64,_,67,_,72,_];

    const verseA = { kick:trig(breakK,breakK,breakK,breakK), snare:trig(breakS,breakS,breakS,breakS),
      hat:trig(brkH,brkH,brkH,brkH), bass:seq(dB1,dB1,dB2,dB2),
      pad:seq(pad1,pad2,pad1,pad3), lead:emptyMidi(4), arp:seq(arpD,arpG,arpD,arpC) };
    const chorus = { kick:trig(breakK,breakK,breakK,breakK,breakK,breakK,breakK,breakK),
      snare:trig(breakS,breakS,breakS,breakS,breakS,breakS,breakS,breakS),
      hat:trig(brkH,brkH,brkH,brkH,brkH,brkH,brkH,brkH),
      bass:seq(dB1,dB1,dB2,dB2,dB1,dB1,dB3,dB3),
      pad:seq(pad1,pad2,pad1,pad3,pad1,pad2,pad1,pad3),
      lead:emptyMidi(8), arp:seq(arpD,arpG,arpD,arpC,arpD,arpG,arpD,arpC) };
    const bridge = { kick:trig(K4,K4,K4,K4), snare:trig(breakS,breakS,breakS,breakS),
      hat:trig(H16,H16,H16,H16), bass:seq(dB1,dB2,dB1,dB3),
      pad:seq(pad1,pad2,pad1,pad3), lead:emptyMidi(4), arp:emptyMidi(4) };
    const intro = { kick:trig(breakK,breakK), snare:trig(breakS,breakS), hat:trig(brkH,brkH),
      bass:seq(dB1,dB1), pad:seq(pad1,pad2), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(breakK,breakK), snare:trig(breakS,breakS), hat:trig(brkH,brkH),
      bass:seq(dB1,dB1), pad:seq(pad1,pad2), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "dnb", bpm: 174,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:180, f1:44, dur:0.32, click:2800 },
        snare:{ bp:1900, dur:0.16, tone:190 },
        hat:  { hp:8500, dur:0.035 },
        bass: { type:"sine", lp0:180, lp1:400, sub:true, adsr:{a:0.005,d:0.3,s:0.8,r:0.2} },
        pad:  { type:"sawtooth", detune:18, lp:1600, adsr:{a:0.5,d:0.5,s:0.7,r:1.8} },
        lead: { type:"square", duty:0.25, lp0:3000, lp1:1500, adsr:{a:0.005,d:0.15,s:0.4,r:0.1} },
        arp:  { type:"square", duty:0.125, hp:600, adsr:{a:0.003,d:0.1,s:0.3,r:0.06} },
      },
    };
  }

  // ---- Стиль: ambient (65 BPM) ----
  function ambient() {
    const padC=[48,_,_,_, 55,_,_,_, 64,_,_,_, _,_,_,_];
    const padA=[45,_,_,_, 52,_,_,_, 60,_,_,_, _,_,_,_];
    const padF=[41,_,_,_, 48,_,_,_, 57,_,_,_, _,_,_,_];
    const padG=[43,_,_,_, 50,_,_,_, 59,_,_,_, _,_,_,_];
    const lead1=[72,_,_,_,_,_,74,_,_,_,76,_,_,_,_,_];
    const lead2=[69,_,_,_,_,_,71,_,_,_,72,_,_,_,_,_];
    const lead3=[65,_,_,_,_,_,67,_,_,_,69,_,_,_,_,_];
    const kickAmb=[1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];

    const verseA = { kick:trig(kickAmb,kickAmb,kickAmb,kickAmb), snare:emptyTrig(4), hat:emptyTrig(4),
      bass:emptyMidi(4), pad:seq(padC,padA,padF,padG), lead:emptyMidi(4), arp:emptyMidi(4) };
    const chorus = { kick:trig(kickAmb,kickAmb,kickAmb,kickAmb,kickAmb,kickAmb,kickAmb,kickAmb),
      snare:emptyTrig(8), hat:emptyTrig(8), bass:emptyMidi(8),
      pad:seq(padC,padA,padF,padG,padC,padA,padF,padG),
      lead:seq(lead1,lead2,lead3,lead1,lead1,lead2,lead3,lead1), arp:emptyMidi(8) };
    const intro = { kick:emptyTrig(2), snare:emptyTrig(2), hat:emptyTrig(2),
      bass:emptyMidi(2), pad:seq(padC,padA), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:emptyTrig(2), snare:emptyTrig(2), hat:emptyTrig(2),
      bass:emptyMidi(2), pad:seq(padF,padC), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "ambient", bpm: 65,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:110, f1:38, dur:0.5, click:1500 },
        snare:{ bp:1200, dur:0.3, tone:140 },
        hat:  { hp:6000, dur:0.08 },
        bass: { type:"sine", lp0:150, lp1:300, sub:true, adsr:{a:0.02,d:0.5,s:0.8,r:0.6} },
        pad:  { type:"sawtooth", detune:30, lp:1200, adsr:{a:1.2,d:0.8,s:0.85,r:3.0} },
        lead: { type:"triangle", lp0:2200, lp1:1800, adsr:{a:0.3,d:0.4,s:0.7,r:1.2}, vibrato:{f:4,d:5} },
        arp:  { type:"triangle", hp:400, adsr:{a:0.05,d:0.3,s:0.4,r:0.5} },
      },
    };
  }

  // ---- Стиль: chip (140 BPM) ----
  function chip() {
    const cBc=[36,_,36,_, 36,_,43,_, 36,_,36,_, 36,_,_,_];
    const cBg=[43,_,43,_, 43,_,50,_, 43,_,43,_, 43,_,_,_];
    const cBa=[45,_,45,_, 45,_,52,_, 45,_,45,_, 45,_,_,_];
    const cBf=[41,_,41,_, 41,_,48,_, 41,_,41,_, 41,_,_,_];
    const clC=[72,_,76,_,79,_,76,_, 72,_,76,_,79,_,84,_];
    const clG=[79,_,83,_,86,_,83,_, 79,_,83,_,86,_,91,_];
    const clA=[69,_,72,_,76,_,72,_, 69,_,72,_,76,_,81,_];
    const clF=[65,_,69,_,72,_,69,_, 65,_,69,_,72,_,77,_];
    const arpC=[60,64,67,72, 64,67,72,76, 67,72,76,79, 72,76,79,84];
    const arpG=[55,59,62,67, 59,62,67,71, 62,67,71,74, 67,71,74,79];
    const arpA=[57,60,64,69, 60,64,69,72, 64,69,72,76, 69,72,76,81];
    const arpF=[53,57,60,65, 57,60,65,69, 60,65,69,72, 65,69,72,77];

    const verseA = { kick:trig(K4,K4,K4,K4), snare:trig(S24,S24,S24,S24), hat:trig(H16,H16,H16,H16),
      bass:seq(cBc,cBg,cBa,cBf), pad:emptyMidi(4),
      lead:seq(clC,clG,clA,clF), arp:seq(arpC,arpG,arpA,arpF) };
    const chorus = { kick:trig(K4,K4,K4,K4,K4,K4,K4,K4), snare:trig(S24,S24,S24,S24,S24,S24,S24,S24),
      hat:trig(H16,H16,H16,H16,H16,H16,H16,H16),
      bass:seq(cBc,cBg,cBa,cBf,cBc,cBg,cBa,cBf),
      pad:emptyMidi(8),
      lead:seq(clC,clG,clA,clF,clC,clG,clA,clF),
      arp:seq(arpC,arpG,arpA,arpF,arpC,arpG,arpA,arpF) };
    const bridge = { kick:trig(K4,K4,K4,K4), snare:trig(S24,S24,S24,S24), hat:trig(H8,H8,H8,H8),
      bass:seq(cBc,cBg,cBa,cBf), pad:emptyMidi(4), lead:emptyMidi(4), arp:seq(arpC,arpG,arpA,arpF) };
    const intro = { kick:trig(K4,K4), snare:trig(S24,S24), hat:trig(H8,H8),
      bass:seq(cBc,cBg), pad:emptyMidi(2), lead:emptyMidi(2), arp:seq(arpC,arpG) };
    const outro = { kick:trig(K4,K4), snare:trig(S24,S24), hat:trig(H8,H8),
      bass:seq(cBc,cBc), pad:emptyMidi(2), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "chip", bpm: 140,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"square", f0:200, f1:50, dur:0.15, click:4000 },
        snare:{ bp:2200, dur:0.12, tone:240, noise:true },
        hat:  { hp:10000, dur:0.03, noise:true },
        bass: { type:"triangle", lp0:250, lp1:900, detune:0, adsr:{a:0.003,d:0.1,s:0.7,r:0.08} },
        pad:  { type:"square", duty:0.125, detune:10, lp:1500, adsr:{a:0.1,d:0.2,s:0.7,r:0.5} },
        lead: { type:"square", duty:0.5, lp0:4000, lp1:2500, adsr:{a:0.003,d:0.12,s:0.5,r:0.08} },
        arp:  { type:"square", duty:0.25, hp:500, adsr:{a:0.003,d:0.08,s:0.4,r:0.05} },
      },
    };
  }

  // ---- Стиль: jazz (110 BPM) ----
  function jazz() {
    // ii-V-I в C: Dm7 - G7 - Cmaj7 - Am7.
    const bD=[38,_,_,_, 45,_,_,_, 50,_,_,_, 53,_,_,_];
    const bG=[43,_,_,_, 47,_,_,_, 50,_,_,_, 53,_,_,_];
    const bC=[36,_,_,_, 43,_,_,_, 48,_,_,_, 52,_,_,_];
    const bA=[33,_,_,_, 40,_,_,_, 45,_,_,_, 48,_,_,_];
    const pD=[62,65,69,72, _,_,_,_, _,_,_,_, _,_,_,_];
    const pG=[59,62,65,67, _,_,_,_, _,_,_,_, _,_,_,_];
    const pC=[60,64,67,71, _,_,_,_, _,_,_,_, _,_,_,_];
    const pA=[57,60,64,67, _,_,_,_, _,_,_,_, _,_,_,_];
    const lD=[74,_,_,_, 72,_,69,_, 72,_,_,_,_,_,_,_];
    const lG=[71,_,_,_, 74,_,71,_, 67,_,_,_,_,_,_,_];
    const lC=[72,_,_,_, 71,_,67,_, 64,_,_,_,_,_,_,_];
    const lA=[69,_,_,_, 67,_,64,_, 69,_,_,_,_,_,_,_];
    const ride=[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
    const Kh=[1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
    const Sh2=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0];

    const verseA = { kick:trig(Kh,Kh,Kh,Kh), snare:trig(Sh2,Sh2,Sh2,Sh2), hat:trig(ride,ride,ride,ride),
      bass:seq(bD,bG,bC,bA), pad:seq(pD,pG,pC,pA), lead:emptyMidi(4), arp:emptyMidi(4) };
    const chorus = { kick:trig(Kh,Kh,Kh,Kh,Kh,Kh,Kh,Kh),
      snare:trig(Sh2,Sh2,Sh2,Sh2,Sh2,Sh2,Sh2,Sh2),
      hat:trig(ride,ride,ride,ride,ride,ride,ride,ride),
      bass:seq(bD,bG,bC,bA,bD,bG,bC,bA),
      pad:seq(pD,pG,pC,pA,pD,pG,pC,pA),
      lead:seq(lD,lG,lC,lA,lD,lG,lC,lA), arp:emptyMidi(8) };
    const bridge = { kick:trig(Kh,Kh,Kh,Kh), snare:trig(Sh2,Sh2,Sh2,Sh2), hat:trig(ride,ride,ride,ride),
      bass:seq(bD,bG,bC,bA), pad:seq(pD,pG,pC,pA),
      lead:seq([69,_,_,_,71,_,74,_,72,_,71,_,69,_,_,_],[67,_,_,_,69,_,71,_,69,_,67,_,64,_,_,_],
        [64,_,_,_,67,_,71,_,72,_,71,_,67,_,_,_],[69,_,_,_,72,_,74,_,72,_,69,_,67,_,_,_]),
      arp:emptyMidi(4) };
    const intro = { kick:trig(Kh,Kh), snare:trig(Sh2,Sh2), hat:trig(ride,ride),
      bass:seq(bD,bG), pad:seq(pD,pG), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(Kh,Kh), snare:trig(Sh2,Sh2), hat:trig(ride,ride),
      bass:seq(bC,bC), pad:seq(pC,pC), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "jazz", bpm: 110,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:140, f1:42, dur:0.35, click:2200 },
        snare:{ bp:1500, dur:0.22, tone:170 },
        hat:  { hp:7000, dur:0.055 },
        bass: { type:"triangle", lp0:180, lp1:650, detune:0, q:4, adsr:{a:0.008,d:0.3,s:0.5,r:0.25} },
        pad:  { type:"sawtooth", detune:12, lp:1600, adsr:{a:0.25,d:0.4,s:0.75,r:1.2} },
        lead: { type:"triangle", lp0:2600, lp1:1800, adsr:{a:0.02,d:0.2,s:0.6,r:0.25}, vibrato:{f:5.2,d:8} },
        arp:  { type:"triangle", hp:500, adsr:{a:0.008,d:0.15,s:0.4,r:0.1} },
      },
    };
  }

  // ---- Стиль: lofi (85 BPM) ----
  function lofi() {
    // Em7-A7-Dmaj7-Gmaj7. Тёплый, «запылённый».
    const bE=[40,_,_,_, 43,_,_,_, 47,_,_,_, 50,_,_,_];
    const bA=[45,_,_,_, 48,_,_,_, 52,_,_,_, 55,_,_,_];
    const bD=[38,_,_,_, 42,_,_,_, 45,_,_,_, 50,_,_,_];
    const bG=[43,_,_,_, 47,_,_,_, 50,_,_,_, 55,_,_,_];
    const pE=[59,62,66,69, _,_,_,_, _,_,_,_, _,_,_,_];
    const pA=[57,60,64,67, _,_,_,_, _,_,_,_, _,_,_,_];
    const pD=[62,66,69,73, _,_,_,_, _,_,_,_, _,_,_,_];
    const pG=[59,62,67,71, _,_,_,_, _,_,_,_, _,_,_,_];
    const lE=[71,_,_,_, 69,_,66,_, 69,_,_,_,_,_,_,_];
    const lA=[69,_,_,_, 67,_,64,_, 67,_,_,_,_,_,_,_];
    const lD=[66,_,_,_, 69,_,71,_, 73,_,_,_,_,_,_,_];
    const lG=[71,_,_,_, 69,_,67,_, 64,_,_,_,_,_,_,_];
    const Kl=[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const Sl=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const Hl=[0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];

    const verseA = { kick:trig(Kl,Kl,Kl,Kl), snare:trig(Sl,Sl,Sl,Sl), hat:trig(Hl,Hl,Hl,Hl),
      bass:seq(bE,bA,bD,bG), pad:seq(pE,pA,pD,pG), lead:emptyMidi(4), arp:emptyMidi(4) };
    const chorus = { kick:trig(Kl,Kl,Kl,Kl,Kl,Kl,Kl,Kl),
      snare:trig(Sl,Sl,Sl,Sl,Sl,Sl,Sl,Sl),
      hat:trig(Hl,Hl,Hl,Hl,Hl,Hl,Hl,Hl),
      bass:seq(bE,bA,bD,bG,bE,bA,bD,bG),
      pad:seq(pE,pA,pD,pG,pE,pA,pD,pG),
      lead:seq(lE,lA,lD,lG,lE,lA,lD,lG), arp:emptyMidi(8) };
    const bridge = { kick:trig(Kl,Kl,Kl,Kl), snare:trig(Sl,Sl,Sl,Sl), hat:trig(Hl,Hl,Hl,Hl),
      bass:seq(bE,bA,bD,bG), pad:seq(pE,pA,pD,pG),
      lead:seq([64,_,_,_,67,_,_,_,71,_,_,_,69,_,_,_],[62,_,_,_,64,_,_,_,67,_,_,_,66,_,_,_],
        [66,_,_,_,69,_,_,_,71,_,_,_,73,_,_,_],[67,_,_,_,71,_,_,_,69,_,_,_,66,_,_,_]),
      arp:emptyMidi(4) };
    const intro = { kick:trig(Kl,Kl), snare:trig(Sl,Sl), hat:trig(Hl,Hl),
      bass:seq(bE,bA), pad:seq(pE,pA), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(Kl,Kl), snare:trig(Sl,Sl), hat:trig(Hl,Hl),
      bass:seq(bE,bE), pad:seq(pE,pE), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "lofi", bpm: 85,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:130, f1:40, dur:0.4, click:1800 },
        snare:{ bp:1300, dur:0.28, tone:150 },
        hat:  { hp:6000, dur:0.07 },
        bass: { type:"triangle", lp0:180, lp1:500, detune:0, q:5, adsr:{a:0.02,d:0.4,s:0.55,r:0.4} },
        pad:  { type:"sawtooth", detune:22, lp:1100, adsr:{a:0.5,d:0.5,s:0.8,r:2.0} },
        lead: { type:"triangle", lp0:2000, lp1:1300, adsr:{a:0.03,d:0.3,s:0.55,r:0.4}, vibrato:{f:4.5,d:7} },
        arp:  { type:"triangle", hp:400, adsr:{a:0.02,d:0.2,s:0.4,r:0.2} },
      },
    };
  }

  // ---- Стиль: classical (90 BPM) ----
  function classical() {
    // C-Am-F-G. Струнные + клавесин.
    const bC=[36,_,_,_, 43,_,_,_, 48,_,_,_, 43,_,_,_];
    const bA=[33,_,_,_, 40,_,_,_, 45,_,_,_, 40,_,_,_];
    const bF=[41,_,_,_, 48,_,_,_, 53,_,_,_, 48,_,_,_];
    const bG=[43,_,_,_, 50,_,_,_, 55,_,_,_, 50,_,_,_];
    const pC=[60,64,67,72, _,_,_,_, _,_,_,_, _,_,_,_];
    const pA=[57,60,64,69, _,_,_,_, _,_,_,_, _,_,_,_];
    const pF=[53,57,60,65, _,_,_,_, _,_,_,_, _,_,_,_];
    const pG=[55,59,62,67, _,_,_,_, _,_,_,_, _,_,_,_];
    const lC=[72,_,74,_,76,_,74,_,72,_,_,_,_,_,_,_];
    const lA=[69,_,71,_,72,_,71,_,69,_,_,_,_,_,_,_];
    const lF=[65,_,67,_,69,_,67,_,65,_,_,_,_,_,_,_];
    const lG=[67,_,69,_,71,_,69,_,67,_,_,_,_,_,_,_];
    const K0=[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
    const S0=[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    const H0_=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];

    const verseA = { kick:trig(K0,K0,K0,K0), snare:trig(S0,S0,S0,S0), hat:trig(H0_,H0_,H0_,H0_),
      bass:seq(bC,bA,bF,bG), pad:seq(pC,pA,pF,pG), lead:emptyMidi(4),
      arp:seq([72,76,79,84, 76,79,84,88, 79,84,88,91, 84,88,91,96],
              [69,72,76,81, 72,76,81,84, 76,81,84,88, 81,84,88,93],
              [65,69,72,77, 69,72,77,81, 72,77,81,84, 77,81,84,89],
              [67,71,74,79, 71,74,79,83, 74,79,83,86, 79,83,86,91]) };
    const chorus = { kick:trig(K0,K0,K0,K0,K0,K0,K0,K0),
      snare:trig(S0,S0,S0,S0,S0,S0,S0,S0),
      hat:trig(H0_,H0_,H0_,H0_,H0_,H0_,H0_,H0_),
      bass:seq(bC,bA,bF,bG,bC,bA,bF,bG),
      pad:seq(pC,pA,pF,pG,pC,pA,pF,pG),
      lead:seq(lC,lA,lF,lG,lC,lA,lF,lG),
      arp:seq([72,76,79,84, 76,79,84,88, 79,84,88,91, 84,88,91,96],
              [69,72,76,81, 72,76,81,84, 76,81,84,88, 81,84,88,93],
              [65,69,72,77, 69,72,77,81, 72,77,81,84, 77,81,84,89],
              [67,71,74,79, 71,74,79,83, 74,79,83,86, 79,83,86,91],
              [72,76,79,84, 76,79,84,88, 79,84,88,91, 84,88,91,96],
              [69,72,76,81, 72,76,81,84, 76,81,84,88, 81,84,88,93],
              [65,69,72,77, 69,72,77,81, 72,77,81,84, 77,81,84,89],
              [67,71,74,79, 71,74,79,83, 74,79,83,86, 79,83,86,91]) };
    const bridge = { kick:trig(K0,K0,K0,K0), snare:trig(S0,S0,S0,S0), hat:trig(H0_,H0_,H0_,H0_),
      bass:seq(bF,bG,bC,bA), pad:seq(pF,pG,pC,pA),
      lead:seq([77,_,_,_,76,_,74,_,72,_,_,_,_,_,_,_],[79,_,_,_,77,_,76,_,74,_,_,_,_,_,_,_],
        [72,_,_,_,74,_,76,_,77,_,_,_,_,_,_,_],[76,_,_,_,74,_,72,_,69,_,_,_,_,_,_,_]),
      arp:emptyMidi(4) };
    const intro = { kick:trig(K0,K0), snare:trig(S0,S0), hat:trig(H0_,H0_),
      bass:seq(bC,bA), pad:seq(pC,pA), lead:emptyMidi(2), arp:emptyMidi(2) };
    const outro = { kick:trig(K0,K0), snare:trig(S0,S0), hat:trig(H0_,H0_),
      bass:seq(bC,bC), pad:seq(pC,pC), lead:emptyMidi(2), arp:emptyMidi(2) };

    return {
      name: "classical", bpm: 90,
      sections: [
        { name:"intro",  len:2, pat:intro },
        { name:"verseA", len:4, pat:verseA },
        { name:"chorus", len:8, pat:chorus },
        { name:"bridge", len:4, pat:bridge },
        { name:"chorus", len:8, pat:chorus },
        { name:"outro",  len:2, pat:outro },
      ],
      synth: {
        kick: { type:"sine", f0:120, f1:40, dur:0.4, click:1600 },
        snare:{ bp:1200, dur:0.3, tone:140 },
        hat:  { hp:6000, dur:0.08 },
        bass: { type:"triangle", lp0:180, lp1:600, detune:0, q:3, adsr:{a:0.01,d:0.4,s:0.6,r:0.4} },
        pad:  { type:"sawtooth", detune:16, lp:1400, adsr:{a:0.8,d:0.5,s:0.8,r:2.5} },
        lead: { type:"triangle", lp0:2400, lp1:1600, adsr:{a:0.05,d:0.3,s:0.6,r:0.6}, vibrato:{f:4.8,d:5} },
        arp:  { type:"triangle", hp:600, adsr:{a:0.005,d:0.1,s:0.3,r:0.08} },
      },
    };
  }

  const BUILDERS = {
    retrowave, rock, metal, blues, dnb, ambient, chip,
    jazz, lofi, classical,
  };
  const NAMES = ["retrowave","rock","metal","blues","dnb","ambient","chip",
                 "jazz","lofi","classical"];

  // Ленивая сборка: строим стиль при первом обращении.
  const CACHE = {};
  function get(name) {
    if (CACHE[name]) return CACHE[name];
    const b = BUILDERS[name];
    if (!b) return null;
    CACHE[name] = b();
    return CACHE[name];
  }
  function all() {
    const out = {};
    for (const n of NAMES) out[n] = get(n);
    return out;
  }

  // Утилита: длина стиля в шагах.
  function totalSteps(style) {
    let s = 0;
    for (const sec of style.sections) s += sec.len * SPB;
    return s;
  }

  return { NAMES, get, all, totalSteps, SPB, CACHE };
})();
