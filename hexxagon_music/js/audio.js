// audio.js - Web Audio трекер. Look-ahead scheduler, секции, synth-спеки.
// Голоса читают synth-спецификацию активного стиля (channelState[ch].style).

const AudioEngine = (() => {
  let ctx = null;
  let master = null, comp = null;
  let trackGain = {};
  let noiseBuf = null;
  let reverbIR = null;
  let analyser = null;

  const CHANNELS = ["kick","snare","hat","bass","pad","lead","arp"];
  const channelState = {};
  for (const ch of CHANNELS) channelState[ch] = { on:false, gain:0, density:1, style:'retrowave' };

  // Активный стиль (объект из Styles.get) — источник synth-спеков.
  let activeStyle = null;
  // Текущий паттерн канала (per-channel) на текущий шаг.
  let currentSection = null;

  // Плоский список шагов с указанием (sectionIdx, stepInSection).
  // Строится при смене стиля: разворачивает sections в линейный timeline.
  let timeline = [];     // [{ secIdx, step }]
  let totalSteps = 0;

  // BPM.
  let bpm = 100;

  // Позиция транспорта.
  let currentStep = 0;
  let nextNoteTime = 0;
  const lookahead = 0.1;
  const tickMs = 25;
  let timerId = null;
  let running = false;

  function ensureNoise() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1;
    noiseBuf = buf;
    return buf;
  }

  function makeReverbIR(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.7;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.knee.value = 6;
    master.connect(comp).connect(ctx.destination);
    for (const ch of CHANNELS) {
      trackGain[ch] = ctx.createGain();
      trackGain[ch].gain.value = 0;
      trackGain[ch].connect(master);
    }
    noiseBuf = null;
    reverbIR = makeReverbIR(1.8, 2.5);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
    return ctx;
  }

  async function resume() {
    if (!ctx) init();
    if (ctx.state === "suspended") await ctx.resume();
  }

  function setChannel(ch, onOrSpec) {
    if (!(ch in channelState)) return;
    let on, density = 1, style = null;
    if (typeof onOrSpec === "object" && onOrSpec !== null) {
      on = !!onOrSpec.on;
      density = onOrSpec.density != null ? onOrSpec.density : 1;
      style = onOrSpec.style || null;
    } else { on = !!onOrSpec; }
    const wasOn = channelState[ch].on;
    const wasDensity = channelState[ch].density;
    channelState[ch].on = on;
    channelState[ch].density = density;
    if (style && style !== channelState[ch].style) {
      channelState[ch].style = style;
      // Смена стиля — пересобрать timeline по новому стилю.
      rebuildTimeline();
    }
    if (!ctx || !(ch in trackGain)) return;
    if (wasOn === on && Math.abs(wasDensity - density) < 0.01) return;
    const g = trackGain[ch].gain;
    const target = on ? (0.3 + 0.7 * density) : 0.0;
    const stepDur = (60.0 / bpm) / 4;
    const now = ctx.currentTime;
    const nextBeat = Math.ceil(now / stepDur) * stepDur;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(target, nextBeat + stepDur);
  }

  function isOn(ch) { return channelState[ch].on; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // --- Получить synth-спек для канала активного стиля. ---
  function synthFor(ch) {
    const styleName = channelState[ch].style || "retrowave";
    const st = (typeof Styles !== "undefined") ? Styles.get(styleName) : null;
    if (st && st.synth && st.synth[ch]) return st.synth[ch];
    return null;
  }

  // --- ГОЛОСА ---
  function playKick(t, gain, spec) {
    const s = spec || { type:"sine", f0:160, f1:45, dur:0.30, click:3000 };
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = s.type || "sine";
    o.frequency.setValueAtTime(s.f0, t);
    o.frequency.exponentialRampToValueAtTime(s.f1, t + 0.08);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
    o.connect(g).connect(trackGain.kick);
    o.start(t); o.stop(t + s.dur + 0.02);

    const n = ctx.createBufferSource();
    n.buffer = ensureNoise();
    const nf = ctx.createBiquadFilter();
    nf.type = "highpass"; nf.frequency.value = s.click || 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    n.connect(nf).connect(ng).connect(trackGain.kick);
    n.start(t); n.stop(t + 0.02);
  }

  function playSnare(t, gain, spec) {
    const s = spec || { bp:1800, dur:0.20, tone:180 };
    const n = ctx.createBufferSource();
    n.buffer = ensureNoise();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = s.bp; bp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
    n.connect(bp).connect(ng).connect(trackGain.snare);
    n.start(t); n.stop(t + s.dur + 0.02);

    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = "triangle"; o.frequency.value = s.tone || 180;
    og.gain.setValueAtTime(gain * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + s.dur * 0.5);
    o.connect(og).connect(trackGain.snare);
    o.start(t); o.stop(t + s.dur * 0.6);
  }

  function playHat(t, open, gain, spec) {
    const s = spec || { hp:7500, dur:0.045 };
    const n = ctx.createBufferSource();
    n.buffer = ensureNoise();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = s.hp;
    const g = ctx.createGain();
    const dur = open ? s.dur * 4 : s.dur;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp).connect(g).connect(trackGain.hat);
    n.start(t); n.stop(t + dur + 0.02);
  }

  // ADSR helper.
  function adsrEnv(g, t, dur, adsr, peak) {
    const a = adsr.a != null ? adsr.a : 0.005;
    const d = adsr.d != null ? adsr.d : 0.1;
    const sus = adsr.s != null ? adsr.s : 0.7;
    const r = adsr.r != null ? adsr.r : 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(peak * sus, t + a + d);
    const relStart = t + Math.max(a + d, dur - r);
    g.gain.setValueAtTime(peak * sus, relStart);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function playBass(t, midi, dur, gain, spec) {
    const s = spec || { type:"sawtooth", lp0:200, lp1:900, detune:5, adsr:{a:0.005,d:0.2,s:0.7,r:0.2} };
    const f = mtof(midi);
    const g = ctx.createGain();
    adsrEnv(g, t, dur, s.adsr || {a:0.005,d:0.2,s:0.7,r:0.2}, gain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = s.q || 6;
    lp.frequency.setValueAtTime(s.lp0 || 200, t);
    lp.frequency.linearRampToValueAtTime(s.lp1 || 900, t + dur * 0.3);
    lp.frequency.linearRampToValueAtTime(s.lp0 || 200, t + dur);
    const det = s.detune || 0;
    if (det > 0) {
      const o1 = ctx.createOscillator();
      o1.type = s.type; o1.frequency.value = f; o1.detune.value = -det;
      const o2 = ctx.createOscillator();
      o2.type = s.type; o2.frequency.value = f; o2.detune.value = +det;
      o1.connect(lp); o2.connect(lp);
      o1.start(t); o2.start(t); o1.stop(t + dur); o2.stop(t + dur);
    } else {
      const o = ctx.createOscillator();
      o.type = s.type; o.frequency.value = f;
      o.connect(lp);
      o.start(t); o.stop(t + dur);
    }
    lp.connect(g).connect(trackGain.bass);
  }

  function playPad(t, midis, dur, gain, spec) {
    const s = spec || { type:"sawtooth", detune:14, lp:1800, adsr:{a:0.4,d:0.3,s:0.8,r:1.5} };
    const g = ctx.createGain();
    adsrEnv(g, t, dur, s.adsr || {a:0.4,d:0.3,s:0.8,r:1.5}, gain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = s.lp || 1800; lp.Q.value = 0.7;
    lp.connect(g).connect(trackGain.pad);
    for (const m of midis) {
      const o = ctx.createOscillator();
      o.type = s.type || "sawtooth"; o.frequency.value = mtof(m);
      o.detune.value = (Math.random() * (s.detune || 14) * 2 - (s.detune || 14));
      o.connect(lp);
      o.start(t); o.stop(t + dur);
    }
  }

  function playLead(t, midi, dur, gain, spec) {
    const s = spec || { type:"square", lp0:3500, lp1:1200, adsr:{a:0.01,d:0.2,s:0.6,r:0.15} };
    const f = mtof(midi);
    const g = ctx.createGain();
    adsrEnv(g, t, dur, s.adsr || {a:0.01,d:0.2,s:0.6,r:0.15}, gain);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(s.lp0 || 3500, t);
    lp.frequency.exponentialRampToValueAtTime(s.lp1 || 1200, t + dur);
    const o = ctx.createOscillator();
    o.type = s.type || "square";
    o.frequency.value = f;
    // Vibrato.
    if (s.vibrato) {
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = s.vibrato.f || 5;
      lfoG.gain.value = s.vibrato.d || 6;
      lfo.connect(lfoG).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur);
    }
    o.connect(lp).connect(g).connect(trackGain.lead);
    o.start(t); o.stop(t + dur);
  }

  function playArp(t, midi, dur, gain, spec) {
    const s = spec || { type:"square", duty:0.25, hp:400, adsr:{a:0.005,d:0.12,s:0.3,r:0.08} };
    const g = ctx.createGain();
    adsrEnv(g, t, dur, s.adsr || {a:0.005,d:0.12,s:0.3,r:0.08}, gain);
    const o = ctx.createOscillator();
    o.type = s.type || "square"; o.frequency.value = mtof(midi);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = s.hp || 400;
    o.connect(hp).connect(g).connect(trackGain.arp);
    o.start(t); o.stop(t + dur);
  }

  // --- ТАЙМЛАЙН СЕКЦИЙ ---
  // Разворачиваем style.sections в линейный массив шагов.
  function rebuildTimeline() {
    const styleName = channelState[CHANNELS[0]].style || "retrowave";
    const st = (typeof Styles !== "undefined") ? Styles.get(styleName) : null;
    if (!st) return;
    activeStyle = st;
    bpm = st.bpm || 100;
    const spb = st.SPB || 16;
    // Длина одного прохода секций (в тактах).
    let barsPerLoop = 0;
    for (const sec of st.sections) barsPerLoop += sec.len;
    // Целевая длина трека ~110 сек. Считаем, сколько проходов нужно.
    const secPerBar = (60.0 / bpm) * 4;
    const loopSec = barsPerLoop * secPerBar;
    const targetSec = st.targetSec || 140;
    const loops = Math.max(2, Math.round(targetSec / loopSec));
    // Разворачиваем секции loops раз.
    timeline = [];
    for (let loop = 0; loop < loops; loop++) {
      for (let si = 0; si < st.sections.length; si++) {
        const sec = st.sections[si];
        const secSteps = sec.len * spb;
        for (let s = 0; s < secSteps; s++) {
          timeline.push({ secIdx: si, step: s });
        }
      }
    }
    totalSteps = timeline.length;
    if (currentStep >= totalSteps) currentStep = 0;
  }

  // Получить паттерн канала для текущего шага.
  function patForStep(ch, stepInfo) {
    if (!activeStyle) return null;
    const sec = activeStyle.sections[stepInfo.secIdx];
    if (!sec || !sec.pat) return null;
    const arr = sec.pat[ch];
    if (!arr || !arr.length) return null;
    const idx = stepInfo.step % arr.length;   // зацикливание паттерна в секции
    return arr[idx] != null ? arr[idx] : null;
  }

  function scheduleStep(globalStep, time) {
    if (!activeStyle) return;
    const stepInfo = timeline[globalStep];
    if (!stepInfo) return;
    const stepDur = (60.0 / bpm) / 4;

    const density = channelState.kick.density;
    if (isOn("kick")) {
      const v = patForStep("kick", stepInfo);
      if (v) playKick(time, 0.9 * density, synthFor("kick"));
    }
    if (isOn("snare")) {
      const v = patForStep("snare", stepInfo);
      if (v) playSnare(time, 0.85 * channelState.snare.density, synthFor("snare"));
    }
    if (isOn("hat")) {
      const v = patForStep("hat", stepInfo);
      if (v) playHat(time, false, 0.35, synthFor("hat"));
    }
    if (isOn("bass")) {
      const v = patForStep("bass", stepInfo);
      if (v != null && v !== 0) playBass(time, v, stepDur * 1.6, 0.7, synthFor("bass"));
    }
    if (isOn("pad")) {
      const v = patForStep("pad", stepInfo);
      if (v != null && v !== 0) {
        // трезвучие: мажор или минор — эвристика по прогрессии.
        const pc = v % 12;
        const minorPCs = [9, 2, 4, 11];  // A, D, E, B — минорные в простых прогрессиях
        let third = minorPCs.includes(pc) ? 3 : 4;
        const triad = [v, v + third, v + 7];
        playPad(time, triad, stepDur * 14, 0.22, synthFor("pad"));
      }
    }
    if (isOn("lead")) {
      const v = patForStep("lead", stepInfo);
      if (v != null && v !== 0) playLead(time, v, stepDur * 3, 0.35, synthFor("lead"));
    }
    if (isOn("arp")) {
      const v = patForStep("arp", stepInfo);
      if (v != null && v !== 0) playArp(time, v, stepDur * 0.9, 0.22, synthFor("arp"));
    }
  }

  function schedulerTick() {
    if (!running || !ctx) return;
    const stepDur = (60.0 / bpm) / 4;
    while (nextNoteTime < ctx.currentTime + lookahead) {
      scheduleStep(currentStep, nextNoteTime);
      nextNoteTime += stepDur;
      currentStep = (currentStep + 1) % totalSteps;
    }
  }

  function start() {
    if (!ctx) init();
    if (running) return;
    if (!activeStyle) rebuildTimeline();
    running = true;
    currentStep = 0;
    nextNoteTime = ctx.currentTime + 0.1;
    timerId = setInterval(schedulerTick, tickMs);
  }

  function stop() {
    running = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  // Внешний API: принять стиль целиком.
  function setStyle(style) {
    if (!style) return;
    // Записать имя стиля в каналы (чтобы synthFor знал).
    for (const ch of CHANNELS) channelState[ch].style = style.name;
    activeStyle = style;
    bpm = style.bpm || 100;
    rebuildTimeline();
  }

  // Совместимость со старым API.
  function setPattern(p) {
    // Если передали объект стиля (с sections) — используем setStyle.
    if (p && p.sections) return setStyle(p);
    // Иначе — это старый {name,bpm,pattern}. Оборачиваем в один стиль.
    if (p && p.pattern) {
      const st = { name: p.name || "retrowave", bpm: p.bpm || 100,
        sections: [{ name:"main", len: p.bars || 8, pat: p.pattern }],
        synth: null, SPB: p.stepsPerBar || 16 };
      return setStyle(st);
    }
  }

  function isRunning() { return running; }
  function isReady() { return !!ctx && ctx.state === "running"; }
  let muted = false;
  function toggleMute() {
    if (!ctx) return false;
    muted = !muted;
    const target = muted ? 0.0001 : 0.7;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.exponentialRampToValueAtTime(target, now + 0.08);
    return muted;
  }
  function isMuted() { return muted; }
  function setVolume(v) {
    if (!ctx) return;
    const target = Math.max(0.0001, Math.min(1, v));
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : target, now + 0.05);
  }
  function getCtx() { return ctx; }
  function getBus() { return master; }
  function getAnalyser() { return analyser; }

  function syncGains() {
    if (!ctx) return;
    for (const ch of CHANNELS) {
      if (!(ch in trackGain)) continue;
      const st = channelState[ch];
      const target = st.on ? (0.3 + 0.7 * st.density) : 0.0;
      const now = ctx.currentTime;
      const g = trackGain[ch].gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(target, now);
    }
  }
  function getState() { return channelState; }
  function getStep() { return currentStep; }
  function getSectionInfo() {
    if (!activeStyle || !timeline.length) return null;
    const info = timeline[currentStep];
    const sec = activeStyle.sections[info.secIdx];
    return { name: sec.name, idx: info.secIdx, total: activeStyle.sections.length };
  }

  function getRMS() {
    if (!analyser) return -1;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i]*buf[i];
    return Math.sqrt(sum / buf.length);
  }

  return { init, resume, start, stop, setPattern, setStyle, setChannel,
           getRMS, isRunning, isReady, getCtx, getBus, getAnalyser, syncGains,
           toggleMute, isMuted, setVolume,
           isOn, getState, getStep, getSectionInfo, mtof, CHANNELS,
           rebuildTimeline };
})();
