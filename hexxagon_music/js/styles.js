// styles.js (v4) - 10 стилей, каждый со своей гармонией, мелодией,
// ритмом и тембрами. Стили различаются не только BPM.

const Styles = (() => {
  const SPB = 16;
  const _ = null;
  const n = {
    C2:36,Cs2:37,D2:38,Eb2:39,E2:40,F2:41,Fs2:42,G2:43,Ab2:44,A2:45,Bb2:46,B2:47,
    C3:48,Cs3:49,D3:50,Eb3:51,E3:52,F3:53,Fs3:54,G3:55,Ab3:56,A3:57,Bb3:58,B3:59,
    C4:60,Cs4:61,D4:62,Eb4:63,E4:64,F4:65,Fs4:66,G4:67,Ab4:68,A4:69,Bb4:70,B4:71,
    C5:72,D5:74,E5:76,F5:77,G5:79,A5:81,B5:83,C6:84,
  };

  // Ритм-константы.
  const K4  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  const K13 = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
  const Kamb= [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  const K13b= [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0];
  const K16 = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
  const Ksw = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
  const Kdnb= [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0];
  const S24 = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const Ssh = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,1,0];
  const H8  = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0];
  const H16 = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
  const Hsw = [0,0,1,0, 0,1,1,0, 0,0,1,0, 0,1,1,0];
  const Hdnb= [1,0,1,0, 1,1,1,0, 1,0,1,0, 1,1,1,1];
  const H0  = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  const ride=[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1];

  function seq(...bars) {
    const N = bars.length * SPB;
    const out = new Array(N).fill(_);
    for (let i = 0; i < bars.length; i++)
      for (let s = 0; s < SPB; s++) out[i*SPB+s] = bars[i][s] != null ? bars[i][s] : _;
    return out;
  }
  function trig(...bars) {
    const N = bars.length * SPB;
    const out = new Array(N).fill(0);
    for (let i = 0; i < bars.length; i++)
      for (let s = 0; s < SPB; s++) out[i*SPB+s] = bars[i][s] ? 1 : 0;
    return out;
  }
  const em = (bars)=>new Array(bars*SPB).fill(_);
  const et = (bars)=>new Array(bars*SPB).fill(0);

  // Собрать секцию: bars раз по bar-паттерну.
  function rep(bar, bars) {
    const out = new Array(bars*SPB).fill(_);
    for (let b = 0; b < bars; b++)
      for (let s = 0; s < SPB; s++) out[b*SPB+s] = bar[s] != null ? bar[s] : _;
    return out;
  }
  function repT(bar, bars) {
    const out = new Array(bars*SPB).fill(0);
    for (let b = 0; b < bars; b++)
      for (let s = 0; s < SPB; s++) out[b*SPB+s] = bar[s] ? 1 : 0;
    return out;
  }

  // ============ RETROWAVE (100 BPM) ============
  // Прогрессия: Am - F - C - G. Плавная мелодия, saw + хорус.
  function retrowave() {
    // Форма 80-х: intro - build - DROP - verse - chorus - drop - outro.
    const bA=[45,_,57,_,52,_,57,_,45,_,48,_,52,_,57,_];
    const bF=[53,_,53,_,57,_,60,_,53,_,57,_,60,_,65,_];
    const bC=[48,_,48,_,52,_,55,_,48,_,52,_,55,_,60,_];
    const bG=[55,_,55,_,62,_,67,_,55,_,62,_,67,_,62,_];
    const lA=[69,_,_,72,_,71,_,_,69,_,_,64,_,67,_,_];
    const lF=[65,_,_,69,_,67,_,_,65,_,_,60,_,64,_,_];
    const lC=[64,_,_,67,_,65,_,_,64,_,_,60,_,62,_,_];
    const lG=[67,_,_,71,_,69,_,_,67,_,_,62,_,64,_,_];
    const arpA=[69,60,64,69,60,64,69,60,64,69,60,64,69,60,64,69];
    const arpF=[65,57,60,65,57,60,65,57,60,65,57,60,65,57,60,65];
    const arpC=[60,52,55,60,52,55,60,52,55,60,52,55,60,52,55,60];
    const arpG=[67,55,59,67,55,59,67,55,59,67,55,59,67,55,59,67];
    const padA=[45,_,_,_,_,_,_,_,52,_,_,_,_,_,_,_];
    const padF=[53,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_];
    const padC=[48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_];
    const padG=[55,_,_,_,_,_,_,_,62,_,_,_,_,_,_,_];
    // DROP: тяжёлый saw-бас на четвертях + все слои.
    const dropBass=[45,_,45,_,45,_,45,_, 53,_,53,_,53,_,53,_,
                    48,_,48,_,48,_,48,_, 55,_,55,_,55,_,55,_];
    const dropLead=[81,_,_,_,79,_,_,_,76,_,_,_,72,_,_,_,
                    77,_,_,_,76,_,_,_,72,_,_,_,69,_,_,_,
                    72,_,_,_,76,_,_,_,79,_,_,_,76,_,_,_,
                    79,_,_,_,76,_,_,_,72,_,_,_,67,_,_,_];

    const K = K4, H = H8;

    function S(name, len, pat) { return { name:name, len:len, pat:pat }; }
    return {
      name: "retrowave", bpm: 105, form: "intro-build-drop-verse-chorus",
      sections: [
        // intro: только пэд + арп.
        S("intro", 4, { kick:et(4), snare:et(4), hat:et(4),
          bass:seq(bA,bF,bC,bG), pad:seq(padA,padF,padC,padG),
          lead:em(4), arp:seq(arpA,arpF,arpC,arpG) }),
        // build: добавляется hat + редкий kick.
        S("build", 4, { kick:repT(K13,4), snare:et(4), hat:repT(H,4),
          bass:seq(bA,bF,bC,bG), pad:seq(padA,padF,padC,padG),
          lead:em(4), arp:seq(arpA,arpF,arpC,arpG) }),
        // DROP: полный оркестр.
        S("drop", 8, { kick:repT(K,8), snare:repT(S24,8), hat:repT(H,8),
          bass:seq(dropBass.slice(0,16),dropBass.slice(16,32),
                   dropBass.slice(0,16),dropBass.slice(16,32),
                   dropBass.slice(0,16),dropBass.slice(16,32),
                   dropBass.slice(0,16),dropBass.slice(16,32)),
          pad:em(8),
          lead:seq(dropLead.slice(0,16),dropLead.slice(16,32),
                   dropLead.slice(32,48),dropLead.slice(48,64),
                   dropLead.slice(0,16),dropLead.slice(16,32),
                   dropLead.slice(32,48),dropLead.slice(48,64)),
          arp:em(8) }),
        // verse: лид молчит, арп ведёт.
        S("verse", 4, { kick:repT(K,4), snare:repT(S24,4), hat:repT(H,4),
          bass:seq(bA,bF,bC,bG), pad:seq(padA,padF,padC,padG),
          lead:em(4), arp:seq(arpA,arpF,arpC,arpG) }),
        // chorus: лид + арп.
        S("chorus", 8, { kick:repT(K,8), snare:repT(S24,8), hat:repT(H,8),
          bass:seq(bA,bF,bC,bG,bA,bF,bC,bG),
          pad:seq(padA,padF,padC,padG,padA,padF,padC,padG),
          lead:seq(lA,lF,lC,lG,lA,lF,lC,lG),
          arp:seq(arpA,arpF,arpC,arpG,arpA,arpF,arpC,arpG) }),
        // outro: затухание.
        S("outro", 4, { kick:repT(K13,4), snare:repT(S24,4), hat:repT(H,4),
          bass:seq(bA,bF,bC,bG), pad:seq(padA,padF,padC,padG),
          lead:em(4), arp:seq(arpA,arpF,arpC,arpG) }),
      ],
      synth: {
        kick:{type:"sine",f0:150,f1:45,dur:0.30,click:3000},
        snare:{bp:1800,dur:0.20,tone:180},
        hat:{hp:7500,dur:0.045},
        bass:{type:"sawtooth",lp0:200,lp1:900,detune:5,adsr:{a:0.005,d:0.2,s:0.7,r:0.2}},
        pad:{type:"sawtooth",detune:14,lp:1800,adsr:{a:0.4,d:0.3,s:0.8,r:1.5}},
        lead:{type:"square",lp0:3500,lp1:1200,adsr:{a:0.01,d:0.2,s:0.6,r:0.15},vibrato:{f:5.5,d:6}},
        arp:{type:"square",hp:400,adsr:{a:0.005,d:0.12,s:0.3,r:0.08}},
      },
    };
  }

  // ============ ROCK (140 BPM) ============
  // Прогрессия: E5 - D5 - A5 - E5 (power chords). Резкий рифф.
  function rock() {
    // Форма: intro - riff - verse - chorus - solo - chorus - outro.
    const bE=[40,_,40,_,40,_,_,40, 40,_,40,_,40,_,_,_];
    const bD=[38,_,38,_,38,_,_,38, 38,_,38,_,38,_,_,_];
    const bA=[45,_,45,_,45,_,_,45, 45,_,45,_,45,_,_,_];
    const bG=[43,_,43,_,43,_,_,43, 43,_,43,_,43,_,_,_];
    const riffE=[40,_,_,40,40,_,40,_, 40,_,_,40,40,_,40,_];
    const riffD=[38,_,_,38,38,_,38,_, 38,_,_,38,38,_,38,_];
    const riffA=[45,_,_,45,45,_,45,_, 45,_,_,45,45,_,45,_];
    const riffG=[43,_,_,43,43,_,43,_, 43,_,_,43,43,_,43,_];
    const lE=[64,_,67,_,69,_,67,64, 69,_,67,_,64,_,_,_];
    const lD=[62,_,65,_,67,_,65,62, 67,_,65,_,62,_,_,_];
    const lA=[69,_,72,_,74,_,72,69, 74,_,72,_,69,_,_,_];
    const lG=[67,_,71,_,74,_,71,67, 74,_,71,_,67,_,_,_];
    // Соло — быстрая фраза в пентатонике.
    const solo=[64,67,69,71,72,71,69,67, 64,67,69,72,71,69,67,64];
    const Krock=[1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0];

    return {
      name: "rock", bpm: 140, swing: 0.15, form: "riff-verse-chorus-solo",
      sections: [
        { name:"intro", len:2, pat:{ kick:repT(Krock,2), snare:repT(Ssh,2),
          hat:repT(H8,2), bass:rep(bE,2), pad:em(2), lead:em(2), arp:em(2) }},
        { name:"riff", len:2, pat:{ kick:repT(Krock,2), snare:repT(Ssh,2),
          hat:repT(H8,2), bass:rep(bE,2), pad:em(2), lead:rep(riffE,2), arp:em(2) }},
        { name:"verse", len:4, pat:{ kick:repT(Krock,4), snare:repT(Ssh,4),
          hat:repT(H8,4), bass:seq(bE,bD,bA,bG), pad:em(4), lead:em(4), arp:em(4) }},
        { name:"chorus", len:4, pat:{ kick:repT(Krock,4), snare:repT(Ssh,4),
          hat:repT(H16,4), bass:seq(bE,bD,bA,bG), pad:em(4),
          lead:seq(lE,lD,lA,lG), arp:em(4) }},
        { name:"solo", len:4, pat:{ kick:repT(Krock,4), snare:repT(Ssh,4),
          hat:repT(H8,4), bass:seq(bE,bD,bA,bG), pad:em(4),
          lead:rep(solo,4), arp:em(4) }},
        { name:"chorus", len:4, pat:{ kick:repT(Krock,4), snare:repT(Ssh,4),
          hat:repT(H16,4), bass:seq(bE,bD,bA,bG), pad:em(4),
          lead:seq(lE,lD,lA,lG), arp:em(4) }},
        { name:"outro", len:2, pat:{ kick:repT(Krock,2), snare:repT(Ssh,2),
          hat:repT(H8,2), bass:rep(bE,2), pad:em(2), lead:em(2), arp:em(2) }},
      ],
      synth: {
        kick:{type:"sine",f0:170,f1:48,dur:0.28,click:3200},
        snare:{bp:2000,dur:0.18,tone:200},
        hat:{hp:8000,dur:0.04},
        bass:{type:"sawtooth",lp0:280,lp1:1400,detune:2,adsr:{a:0.004,d:0.15,s:0.6,r:0.1}},
        pad:{type:"sawtooth",detune:20,lp:2200,adsr:{a:0.2,d:0.3,s:0.7,r:0.8}},
        lead:{type:"sawtooth",lp0:4000,lp1:1800,drive:0.55,adsr:{a:0.005,d:0.25,s:0.5,r:0.2}},
        arp:{type:"square",hp:600,adsr:{a:0.005,d:0.15,s:0.3,r:0.1}},
      },
    };
  }

  // ============ METAL (170 BPM) ============
  // Прогрессия: E5 - F5 - G5 - E5 (хроматика). Тремоло, дабл-кик.
  function metal() {
    // Riff-loop: 2-тактовый рифф E-F-G-E, повторяется.
    const chugE = [40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40];
    const chugF = [41,41,41,41,41,41,41,41,41,41,41,41,41,41,41,41];
    const chugG = [43,43,43,43,43,43,43,43,43,43,43,43,43,43,43,43];
    const mKick = [1,1,1,1,1,0,1,1,1,1,1,1,1,0,1,1];
    const leadE = [52,_,55,_,57,_,55,52,57,_,55,_,52,_,_,_];
    const leadF = [53,_,56,_,58,_,56,53,58,_,56,_,53,_,_,_];
    const leadG = [55,_,58,_,60,_,58,55,60,_,58,_,55,_,_,_];

    // Рифф-луп: E-E-F-F-G-G-E-E (8 тактов = 4 секции по 2).
    const riffA = { kick:repT(mKick,2), snare:repT(Ssh,2), hat:repT(ride,2),
      bass:seq(chugE,chugE), pad:em(2), lead:rep(leadE,2), arp:em(2) };
    const riffB = { kick:repT(mKick,2), snare:repT(Ssh,2), hat:repT(ride,2),
      bass:seq(chugF,chugF), pad:em(2), lead:rep(leadF,2), arp:em(2) };
    const riffC = { kick:repT(mKick,2), snare:repT(Ssh,2), hat:repT(ride,2),
      bass:seq(chugG,chugG), pad:em(2), lead:rep(leadG,2), arp:em(2) };
    const riffE2 = { kick:repT(mKick,2), snare:repT(Ssh,2), hat:repT(ride,2),
      bass:seq(chugE,chugE), pad:em(2), lead:rep(leadE,2), arp:em(2) };

    return {
      name: "metal", bpm: 170, form: "riff-loop",
      sections: [
        { name:"riffA", len:2, pat:riffA },
        { name:"riffA", len:2, pat:riffA },
        { name:"riffB", len:2, pat:riffB },
        { name:"riffB", len:2, pat:riffB },
        { name:"riffC", len:2, pat:riffC },
        { name:"riffC", len:2, pat:riffC },
        { name:"riffA", len:2, pat:riffA },
        { name:"riffE", len:2, pat:riffE2 },
      ],
      synth: {
        kick:{type:"sine",f0:200,f1:50,dur:0.22,click:4000},
        snare:{bp:2600,dur:0.14,tone:220},
        hat:{hp:9000,dur:0.035},
        bass:{type:"sawtooth",lp0:350,lp1:2000,drive:0.7,adsr:{a:0.002,d:0.1,s:0.5,r:0.08}},
        pad:{type:"sawtooth",detune:25,lp:2600,adsr:{a:0.15,d:0.3,s:0.6,r:0.7}},
        lead:{type:"sawtooth",lp0:5000,lp1:2200,drive:0.85,adsr:{a:0.003,d:0.2,s:0.5,r:0.15}},
        arp:{type:"square",hp:800,adsr:{a:0.003,d:0.1,s:0.3,r:0.06}},
      },
    };
  }

  // ============ BLUES (80 BPM) ============
  // 12-такт блюз (E7-A7-B7). Свинг, шаффл, walking bass, губная гармоника.
  function blues() {
    // 12-тактовая форма: I-I-I-I-IV-IV-I-I-V-IV-I-V.
    // В E: E7-E7-E7-E7-A7-A7-E7-E7-B7-A7-E7-B7.
    const Eb = [40,_,43,_,45,_,47,_, 40,_,43,_,45,_,47,55];  // E7 walking
    const Ab = [45,_,48,_,50,_,52,_, 45,_,48,_,50,_,52,60];  // A7
    const Bb = [47,_,50,_,52,_,54,_, 47,_,50,_,52,_,54,62];  // B7
    const lE = [64,_,67,_,69,_,71,_, 69,_,67,_,64,_,_,_];
    const lA = [69,_,72,_,74,_,76,_, 74,_,72,_,69,_,_,_];
    const lB = [71,_,74,_,76,_,78,_, 76,_,74,_,71,_,_,_];
    const cmp = [56,59,63,_, 56,59,63,_, 56,59,63,_, 56,59,63,_]; // E7 chord

    // Секции по 2 такта (6 секций = 12 тактов).
    function sect(name, b, l) {
      return { name: name, len: 2, pat: {
        kick:repT(Ksw,2), snare:repT(Ssh,2), hat:repT(Hsw,2),
        bass:rep(b,2), pad:rep(cmp,2), lead:rep(l,2), arp:em(2) }};
    }
    return {
      name: "blues", bpm: 80, swing: 0.66, form: "12-bar",
      sections: [
        sect("I_1",   Eb, lE), sect("I_2",   Eb, lE),
        sect("IV_1",  Ab, lA), sect("I_3",   Eb, lE),
        sect("V",     Bb, lB), sect("IV_2",  Ab, lA),
        sect("I_4",   Eb, lE), sect("turn",  Bb, lB),
      ],
      synth: {
        kick:{type:"sine",f0:130,f1:42,dur:0.35,click:2200},
        snare:{bp:1400,dur:0.24,tone:160},
        hat:{hp:6500,dur:0.06},
        bass:{type:"triangle",lp0:200,lp1:700,adsr:{a:0.008,d:0.25,s:0.5,r:0.15}},
        pad:{type:"sawtooth",detune:8,lp:1400,adsr:{a:0.15,d:0.4,s:0.7,r:1.0}},
        lead:{type:"sawtooth",lp0:2600,lp1:1600,adsr:{a:0.01,d:0.3,s:0.6,r:0.2},vibrato:{f:5,d:10}},
        arp:{type:"triangle",hp:500,adsr:{a:0.01,d:0.2,s:0.4,r:0.1}},
      },
    };
  }

  // ============ DNB (174 BPM) ============
  // Прогрессия: Em - C - G - D. Breakbeat, sub-bass, арп.
  function dnb() {
    // 2-тактовый breakbeat loop (32 шага на фразу).
    const bk1 = [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0];
    const bk2 = [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0];
    const sn1 = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1];
    const sn2 = [0,0,0,0,1,0,0,0,0,0,1,0,1,0,1,0];
    const ht1 = [1,0,1,0,1,1,1,0,1,0,1,0,1,1,1,1];
    const ht2 = [1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1];
    const bEm = [40,_,_,_,40,_,_,_,40,_,_,_,40,_,_,_];
    const bC  = [36,_,_,_,36,_,_,_,36,_,_,_,36,_,_,_];
    const pEm = [64,_,_,_,_,_,_,_,67,_,_,_,_,_,_,_];
    const pC  = [60,_,_,_,_,_,_,_,64,_,_,_,_,_,_,_];
    const aEm = [76,79,83,88,79,83,88,91,83,88,91,95,88,91,95,100];
    const aC  = [72,76,79,84,76,79,84,88,79,84,88,91,84,88,91,96];

    // Луп из 4 секций по 2 такта: Em-Em-C-C.
    function sec(name, bk, sn, ht, b, p, a) {
      return { name:name, len:2, pat:{ kick:seq(bk,bk), snare:seq(sn,sn),
        hat:seq(ht,ht), bass:rep(b,2), pad:rep(p,2), lead:em(2), arp:rep(a,2) } };
    }
    return {
      name: "dnb", bpm: 174, form: "breakbeat-loop",
      sections: [
        sec("loopA", bk1, sn1, ht1, bEm, pEm, aEm),
        sec("loopB", bk2, sn2, ht2, bEm, pEm, aEm),
        sec("loopC", bk1, sn1, ht1, bC, pC, aC),
        sec("loopD", bk2, sn2, ht2, bC, pC, aC),
      ],
      synth: {
        kick:{type:"sine",f0:180,f1:44,dur:0.32,click:2800},
        snare:{bp:1900,dur:0.16,tone:190},
        hat:{hp:8500,dur:0.035},
        bass:{type:"sine",lp0:180,lp1:400,adsr:{a:0.005,d:0.3,s:0.8,r:0.2}},
        pad:{type:"sawtooth",detune:18,lp:1600,adsr:{a:0.5,d:0.5,s:0.7,r:1.8}},
        lead:{type:"square",lp0:3000,lp1:1500,adsr:{a:0.005,d:0.15,s:0.4,r:0.1}},
        arp:{type:"square",hp:600,adsr:{a:0.003,d:0.1,s:0.3,r:0.06}},
      },
    };
  }

  // ============ AMBIENT (65 BPM) ============
  // C - Am - F - G. Без ударных, длинные пэды, флейта.
  function ambient() {
    // Непрерывный поток: 4 длинных блока по 4 такта, без ударных.
    const pC = [48,_,_,_,_,_,_,_,55,_,_,_,_,_,_,_,64,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_];
    const pA = [45,_,_,_,_,_,_,_,52,_,_,_,_,_,_,_,60,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_];
    const pF = [41,_,_,_,_,_,_,_,48,_,_,_,_,_,_,_,57,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_];
    const pG = [43,_,_,_,_,_,_,_,50,_,_,_,_,_,_,_,59,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_];
    const lC = [72,_,_,_,_,_,_,_,_,_,_,_,_,74,_,_,_,_,_,_,_,_,_,_,76,_,_,_,_,_,_,_];
    const lA = [69,_,_,_,_,_,_,_,_,_,_,_,_,71,_,_,_,_,_,_,_,_,_,_,72,_,_,_,_,_,_,_];
    const lF = [65,_,_,_,_,_,_,_,_,_,_,_,_,67,_,_,_,_,_,_,_,_,_,_,69,_,_,_,_,_,_,_];
    const lG = [67,_,_,_,_,_,_,_,_,_,_,_,_,69,_,_,_,_,_,_,_,_,_,_,71,_,_,_,_,_,_,_];
    function sec(name, p, l) {
      return { name:name, len:4, pat:{ kick:repT(Kamb,4), snare:et(4), hat:et(4),
        bass:em(4), pad:rep(p,4), lead:rep(l,4), arp:em(4) } };
    }
    return {
      name: "ambient", bpm: 60, form: "continuous",
      sections: [
        sec("flowA", pC, lC), sec("flowB", pA, lA),
        sec("flowC", pF, lF), sec("flowD", pG, lG),
      ],
      synth: {
        kick:{type:"sine",f0:110,f1:38,dur:0.5,click:1500},
        snare:{bp:1200,dur:0.3,tone:140},
        hat:{hp:6000,dur:0.08},
        bass:{type:"sine",lp0:150,lp1:300,adsr:{a:0.02,d:0.5,s:0.8,r:0.6}},
        pad:{type:"sawtooth",detune:30,lp:1200,adsr:{a:1.2,d:0.8,s:0.85,r:3.0}},
        lead:{type:"triangle",lp0:2200,lp1:1800,adsr:{a:0.3,d:0.4,s:0.7,r:1.2},vibrato:{f:4,d:5}},
        arp:{type:"triangle",hp:400,adsr:{a:0.05,d:0.3,s:0.4,r:0.5}},
      },
    };
  }

  // ============ CHIP (150 BPM) ============
  // C - G - Am - F. Быстрое арпеджио, pulse lead, triangle bass.
  function chip() {
    // Трекерный order list: короткие 2-тактовые loop-секции.
    const bC=[36,_,36,_,36,_,43,_,36,_,36,_,36,_,_,_];
    const bG=[43,_,43,_,43,_,50,_,43,_,43,_,43,_,_,_];
    const bAm=[45,_,45,_,45,_,52,_,45,_,45,_,45,_,_,_];
    const bF=[41,_,41,_,41,_,48,_,41,_,41,_,41,_,_,_];
    const lC=[84,_,_,_,83,_,_,_,79,_,_,_,76,_,_,_];
    const lG=[91,_,_,_,88,_,_,_,86,_,_,_,83,_,_,_];
    const lAm=[88,_,_,_,86,_,_,_,84,_,_,_,81,_,_,_];
    const lF=[84,_,_,_,81,_,_,_,77,_,_,_,72,_,_,_];
    const arpC=[72,76,79,84,76,79,84,88,79,84,88,91,84,88,91,96];
    const arpG=[79,83,86,91,83,86,91,95,86,91,95,98,91,95,98,103];
    const arpAm=[81,84,88,93,84,88,93,96,88,93,96,100,93,96,100,105];
    const arpF=[77,81,84,89,81,84,89,93,84,89,93,96,89,93,96,101];
    const Kc=[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0]; // трекерный kick 16-е

    function loop(name, b, l, a) {
      return { name:name, len:2, pat:{ kick:repT(Kc,2), snare:repT(S24,2),
        hat:repT(H16,2), bass:rep(b,2), pad:em(2), lead:rep(l,2), arp:rep(a,2) }};
    }
    return {
      name: "chip", bpm: 150, form: "order-list",
      // Order: C-G-Am-F-C-G-Am-F (loop 4 раза).
      sections: [
        loop("ord_C1", bC, lC, arpC),
        loop("ord_G1", bG, lG, arpG),
        loop("ord_Am", bAm, lAm, arpAm),
        loop("ord_F1", bF, lF, arpF),
        loop("ord_C2", bC, lC, arpC),
        loop("ord_G2", bG, lG, arpG),
        loop("ord_Am2", bAm, lAm, arpAm),
        loop("ord_F2", bF, lF, arpF),
      ],
      synth: {
        kick:{type:"square",f0:200,f1:50,dur:0.15,click:4000},
        snare:{bp:2200,dur:0.12,tone:240},
        hat:{hp:10000,dur:0.03},
        bass:{type:"triangle",lp0:250,lp1:900,adsr:{a:0.003,d:0.1,s:0.7,r:0.08}},
        pad:{type:"square",detune:10,lp:1500,adsr:{a:0.1,d:0.2,s:0.7,r:0.5}},
        lead:{type:"square",lp0:4000,lp1:2500,adsr:{a:0.003,d:0.12,s:0.5,r:0.08}},
        arp:{type:"square",hp:500,adsr:{a:0.003,d:0.08,s:0.4,r:0.05}},
      },
    };
  }

  // ============ JAZZ (120 BPM) ============
  // ii-V-I: Dm7 - G7 - Cmaj7 - Am7. Свинг, ride, walking bass.
  function jazz() {
    // AABA: A8-A8-B8-A8, ii-V-I. 4 секции по 8 тактов.
    const bD=[38,_,41,_,45,_,48,_,50,_,48,_,45,_,41,_];
    const bG=[43,_,47,_,50,_,53,_,55,_,53,_,50,_,47,_];
    const bC=[36,_,40,_,43,_,47,_,48,_,47,_,43,_,40,_];
    const bAm=[33,_,36,_,40,_,43,_,45,_,43,_,40,_,36,_];
    const lD=[74,_,72,_,69,_,72,_,74,_,76,_,74,_,_,_];
    const lG=[71,_,74,_,71,_,67,_,71,_,69,_,67,_,_,_];
    const lC=[72,_,71,_,67,_,64,_,67,_,69,_,71,_,_,_];
    const lAm=[69,_,67,_,64,_,67,_,69,_,71,_,69,_,_,_];
    const cmpD=[62,65,69,72,_,65,69,_,62,65,69,72,_,65,69,_];
    const cmpG=[59,62,65,67,_,62,65,_,59,62,65,67,_,62,65,_];
    const cmpC=[60,64,67,71,_,64,67,_,60,64,67,71,_,64,67,_];
    const cmpAm=[57,60,64,67,_,60,64,_,57,60,64,67,_,60,64,_];

    function A(name, b1,b2,b3,b4, l1,l2,l3,l4, c1,c2,c3,c4) {
      return { name:name, len:8, pat: {
        kick:repT(Ksw,8), snare:repT(Ssh,8), hat:repT(ride,8),
        bass:seq(b1,b2,b3,b4),
        pad:seq(c1,c2,c3,c4),
        lead:seq(l1,l2,l3,l4),
        arp:em(8) } };
    }
    return {
      name: "jazz", bpm: 120, swing: 0.66, form: "AABA",
      sections: [
        A("A1", bD,bG,bC,bAm, lD,lG,lC,lAm, cmpD,cmpG,cmpC,cmpAm),
        A("A2", bD,bG,bC,bAm, lD,lG,lC,lAm, cmpD,cmpG,cmpC,cmpAm),
        A("B",  bD,bG,bC,bAm,
          [69,_,_,71,_,74,_,72,_,71,_,69,_,_,_,_],
          [67,_,_,69,_,71,_,69,_,67,_,64,_,_,_,_],
          [64,_,_,67,_,71,_,72,_,71,_,67,_,_,_,_],
          [69,_,_,72,_,74,_,72,_,69,_,67,_,_,_,_],
          cmpD,cmpG,cmpC,cmpAm),
        A("A3", bD,bG,bC,bAm, lD,lG,lC,lAm, cmpD,cmpG,cmpC,cmpAm),
      ],
      synth: {
        kick:{type:"sine",f0:140,f1:42,dur:0.35,click:2200},
        snare:{bp:1500,dur:0.22,tone:170},
        hat:{hp:7000,dur:0.055},
        bass:{type:"triangle",lp0:180,lp1:650,q:4,adsr:{a:0.008,d:0.3,s:0.5,r:0.25}},
        pad:{type:"sawtooth",detune:12,lp:1600,adsr:{a:0.25,d:0.4,s:0.75,r:1.2}},
        lead:{type:"triangle",lp0:2600,lp1:1800,adsr:{a:0.02,d:0.2,s:0.6,r:0.25},vibrato:{f:5.2,d:8}},
        arp:{type:"triangle",hp:500,adsr:{a:0.008,d:0.15,s:0.4,r:0.1}},
      },
    };
  }

  // ============ LOFI (85 BPM) ============
  // Em7 - A7 - Dmaj7 - Gmaj7. Тёплый, запылённый, ленивый ритм.
  function lofi() {
    // Форма: A-B-A-C (loop), ленивый грув, dilla-swing.
    const bE=[40,_,_,_,43,_,_,_,47,_,_,_,50,_,_,_];
    const bA=[45,_,_,_,48,_,_,_,52,_,_,_,55,_,_,_];
    const bD=[38,_,_,_,42,_,_,_,45,_,_,_,50,_,_,_];
    const bG=[43,_,_,_,47,_,_,_,50,_,_,_,55,_,_,_];
    const pE=[59,62,66,69,_,_,_,_,_,_,_,_,_,_,_,_];
    const pA=[57,60,64,67,_,_,_,_,_,_,_,_,_,_,_,_];
    const pD=[62,66,69,73,_,_,_,_,_,_,_,_,_,_,_,_];
    const pG=[59,62,67,71,_,_,_,_,_,_,_,_,_,_,_,_];
    const lE=[71,_,_,69,_,66,_,69,_,_,_,_,_,_,_,_];
    const lA=[69,_,_,67,_,64,_,67,_,_,_,_,_,_,_,_];
    const lD=[66,_,_,69,_,71,_,73,_,_,_,_,_,_,_,_];
    const lG=[71,_,_,69,_,67,_,64,_,_,_,_,_,_,_,_];
    // Ленивый kick (на 1 и «и» 3-й).
    const Klazy=[1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0];

    function sec(name, b, p, l) {
      return { name:name, len:4, pat:{ kick:repT(Klazy,4),
        snare:repT(S24,4), hat:repT(H8,4), bass:rep(b,4),
        pad:rep(p,4), lead:rep(l,4), arp:em(4) }};
    }
    return {
      name: "lofi", bpm: 85, swing: 0.5, form: "ABAC-loop",
      sections: [
        sec("A1", bE, pE, lE),
        sec("B1", bA, pA, lA),
        sec("A2", bE, pE, lE),
        sec("C1", bD, pD, lD),
        sec("A3", bE, pE, lE),
        sec("B2", bA, pA, lA),
        sec("A4", bE, pE, lE),
        sec("G",  bG, pG, lG),
      ],
      synth: {
        kick:{type:"sine",f0:130,f1:40,dur:0.4,click:1800},
        snare:{bp:1300,dur:0.28,tone:150},
        hat:{hp:6000,dur:0.07},
        bass:{type:"triangle",lp0:180,lp1:500,q:5,adsr:{a:0.02,d:0.4,s:0.55,r:0.4}},
        pad:{type:"sawtooth",detune:22,lp:1100,adsr:{a:0.5,d:0.5,s:0.8,r:2.0}},
        lead:{type:"triangle",lp0:2000,lp1:1300,adsr:{a:0.03,d:0.3,s:0.55,r:0.4},vibrato:{f:4.5,d:7}},
        arp:{type:"triangle",hp:400,adsr:{a:0.02,d:0.2,s:0.4,r:0.2}},
      },
    };
  }

  // ============ CLASSICAL (95 BPM) ============
  // C - Am - F - G. Струнные + клавесин-арпеджио, без ударных.
  function classical() {
    // Сонатная форма: экспозиция (2 темы) - разработка - реприза.
    const bC=[36,_,_,43,_,48,_,43, 36,_,_,43,_,48,_,43];
    const bA=[33,_,_,40,_,45,_,40, 33,_,_,40,_,45,_,40];
    const bF=[41,_,_,48,_,53,_,48, 41,_,_,48,_,53,_,48];
    const bG=[43,_,_,50,_,55,_,50, 43,_,_,50,_,55,_,50];
    const bEm=[40,_,_,47,_,52,_,47, 40,_,_,47,_,52,_,47];
    const pC=[60,64,67,72,_,_,_,_,_,_,_,_,_,_,_,_];
    const pA=[57,60,64,69,_,_,_,_,_,_,_,_,_,_,_,_];
    const pF=[53,57,60,65,_,_,_,_,_,_,_,_,_,_,_,_];
    const pG=[55,59,62,67,_,_,_,_,_,_,_,_,_,_,_,_];
    const pEm=[59,62,67,71,_,_,_,_,_,_,_,_,_,_,_,_];
    const lC=[72,_,74,_,76,_,74,_,72,_,_,_,_,_,_,_];
    const lA=[69,_,71,_,72,_,71,_,69,_,_,_,_,_,_,_];
    const lF=[65,_,67,_,69,_,67,_,65,_,_,_,_,_,_,_];
    const lG=[67,_,69,_,71,_,69,_,67,_,_,_,_,_,_,_];
    const lEm=[64,_,67,_,71,_,67,_,64,_,_,_,_,_,_,_];
    const hC=[72,76,79,84,76,79,84,88,79,84,88,91,84,88,91,96];
    const hA=[69,72,76,81,72,76,81,84,76,81,84,88,81,84,88,93];
    const hF=[65,69,72,77,69,72,77,81,72,77,81,84,77,81,84,89];
    const hG=[67,71,74,79,71,74,79,83,74,79,83,86,79,83,86,91];
    const hEm=[64,67,71,76,67,71,76,79,71,76,79,83,76,79,83,88];

    function sec(name, b, p, l, h, len) {
      len = len || 2;
      return { name:name, len:len, pat: {
        kick:repT(K13,len), snare:et(len), hat:et(len),
        bass:rep(b,len), pad:rep(p,len), lead:rep(l,len), arp:rep(h,len) }};
    }
    return {
      name: "classical", bpm: 95, form: "sonata",
      sections: [
        // Экспозиция: тема I (C) - связка (G) - тема II (Am).
        sec("expo_I",    bC, pC, lC, hC, 4),
        sec("expo_link", bG, pG, lG, hG, 2),
        sec("expo_II",   bA, pA, lA, hA, 4),
        // Разработка: Em - F - G - Em.
        sec("dev_1", bEm, pEm, lEm, hEm, 2),
        sec("dev_2", bF,  pF,  lF,  hF,  2),
        sec("dev_3", bG,  pG,  lG,  hG,  2),
        sec("dev_4", bEm, pEm, lEm, hEm, 2),
        // Реприза: тема I (C) - тема II (F, в основной тональности).
        sec("repr_I",  bC, pC, lC, hC, 4),
        sec("repr_II", bF, pF, lF, hF, 4),
      ],
      synth: {
        kick:{type:"sine",f0:120,f1:40,dur:0.4,click:1600},
        snare:{bp:1200,dur:0.3,tone:140},
        hat:{hp:6000,dur:0.08},
        bass:{type:"triangle",lp0:180,lp1:600,q:3,adsr:{a:0.01,d:0.4,s:0.6,r:0.4}},
        pad:{type:"sawtooth",detune:16,lp:1400,adsr:{a:0.8,d:0.5,s:0.8,r:2.5}},
        lead:{type:"triangle",lp0:2400,lp1:1600,adsr:{a:0.05,d:0.3,s:0.6,r:0.6},vibrato:{f:4.8,d:5}},
        arp:{type:"triangle",hp:600,adsr:{a:0.005,d:0.1,s:0.3,r:0.08}},
      },
    };
  }

  const BUILDERS = { retrowave, rock, metal, blues, dnb, ambient, chip, jazz, lofi, classical };
  const NAMES = ["retrowave","rock","metal","blues","dnb","ambient","chip","jazz","lofi","classical"];
  const CACHE = {};
  function get(name) {
    if (CACHE[name]) return CACHE[name];
    const b = BUILDERS[name];
    if (!b) return null;
    CACHE[name] = b();
    return CACHE[name];
  }
  function all() { const o={}; for (const n of NAMES) o[n]=get(n); return o; }
  function totalSteps(style) { let s=0; for (const sec of style.sections) s+=sec.len*SPB; return s; }
  return { NAMES, get, all, totalSteps, SPB, CACHE };
})();
