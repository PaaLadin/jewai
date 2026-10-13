// export_wav.js - рендер полного трека (секции + synth-спеки) в WAV.
// OfflineAudioContext проходит быстрее реального времени.
// Заменяет прежнюю версию (рендер одного паттерна).

const WavExport = (() => {

  function encodeWav(buffers, sampleRate) {
    const numCh = buffers.length;
    const numFrames = buffers[0].length;
    const bytesPerSample = 2;
    const blockAlign = numCh * bytesPerSample;
    const dataSize = numFrames * blockAlign;
    const bufSize = 44 + dataSize;
    const ab = new ArrayBuffer(bufSize);
    const dv = new DataView(ab);
    let off = 0;
    function writeStr(s) {
      for (let i = 0; i < s.length; i++) dv.setUint8(off++, s.charCodeAt(i));
    }
    function u32(v) { dv.setUint32(off, v, true); off += 4; }
    function u16(v) { dv.setUint16(off, v, true); off += 2; }
    writeStr("RIFF"); u32(36 + dataSize); writeStr("WAVE");
    writeStr("fmt "); u32(16); u16(1); u16(numCh);
    u32(sampleRate); u32(sampleRate * blockAlign);
    u16(blockAlign); u16(16);
    writeStr("data"); u32(dataSize);
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        let s = Math.max(-1, Math.min(1, buffers[ch][i]));
        dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        off += 2;
      }
    }
    return new Blob([ab], { type: "audio/wav" });
  }

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Рендер трека.
  //   track: объект стиля {sections, synth, bpm, SPB, name}
  //   loops: сколько раз прогнать весь трек (по умолчанию 1)
  async function renderTrack(track, loops, sampleRate) {
    const sr = sampleRate || 44100;
    const spb = track.SPB || 16;
    const bpm = track.bpm || 100;
    const stepDur = (60.0 / bpm) / 4;

    // Считаем общее число шагов.
    let barsPerLoop = 0;
    for (const sec of track.sections) barsPerLoop += sec.len;
    const stepsPerLoop = barsPerLoop * spb;
    const L = loops || 1;
    const totalSteps = stepsPerLoop * L;
    const totalSec = totalSteps * stepDur + 2.0;   // +2 сек хвоста

    const len = Math.ceil(sr * totalSec);
    const octx = new OfflineAudioContext(2, len, sr);

    const master = octx.createGain();
    master.gain.value = 0.7;
    const comp = octx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    comp.knee.value = 6;
    master.connect(comp).connect(octx.destination);

    // Ревёрб (лёгкий).
    const irLen = Math.floor(sr * 1.8);
    const irBuf = octx.createBuffer(2, irLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = irBuf.getChannelData(ch);
      for (let i = 0; i < irLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/irLen, 2.5);
    }
    const convolver = octx.createConvolver();
    convolver.buffer = irBuf;
    const reverbSend = octx.createGain();
    reverbSend.gain.value = 0.18;
    reverbSend.connect(convolver).connect(master);

    // Шум.
    const noise = octx.createBuffer(1, sr, sr);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < sr; i++) nd[i] = Math.random()*2 - 1;

    // Дорожки.
    const trackGain = {};
    for (const ch of ["kick","snare","hat","bass","pad","lead","arp"]) {
      trackGain[ch] = octx.createGain();
      trackGain[ch].gain.value = 0.85;
      trackGain[ch].connect(master);
    }

    const SYN = track.synth || {};
    function spec(ch, def) { return (SYN[ch] && Object.assign({}, def, SYN[ch])) || def; }

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

    function playKick(t, gain) {
      const s = spec("kick", { type:"sine", f0:160, f1:45, dur:0.30, click:3000 });
      const o = octx.createOscillator(), g = octx.createGain();
      o.type = s.type || "sine";
      o.frequency.setValueAtTime(s.f0, t);
      o.frequency.exponentialRampToValueAtTime(s.f1, t + 0.08);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
      o.connect(g).connect(trackGain.kick);
      o.start(t); o.stop(t + s.dur + 0.02);
      const n = octx.createBufferSource(); n.buffer = noise;
      const nf = octx.createBiquadFilter();
      nf.type = "highpass"; nf.frequency.value = s.click || 3000;
      const ng = octx.createGain();
      ng.gain.setValueAtTime(gain * 0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
      n.connect(nf).connect(ng).connect(trackGain.kick);
      n.start(t); n.stop(t + 0.02);
    }
    function playSnare(t, gain) {
      const s = spec("snare", { bp:1800, dur:0.20, tone:180 });
      const n = octx.createBufferSource(); n.buffer = noise;
      const bp = octx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = s.bp; bp.Q.value = 0.7;
      const ng = octx.createGain();
      ng.gain.setValueAtTime(gain, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
      n.connect(bp).connect(ng).connect(trackGain.snare);
      n.start(t); n.stop(t + s.dur + 0.02);
      const o = octx.createOscillator(), og = octx.createGain();
      o.type = "triangle"; o.frequency.value = s.tone || 180;
      og.gain.setValueAtTime(gain * 0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + s.dur * 0.5);
      o.connect(og).connect(trackGain.snare);
      o.start(t); o.stop(t + s.dur * 0.6);
    }
    function playHat(t, gain) {
      const s = spec("hat", { hp:7500, dur:0.045 });
      const n = octx.createBufferSource(); n.buffer = noise;
      const hp = octx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = s.hp;
      const g = octx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + s.dur);
      n.connect(hp).connect(g).connect(trackGain.hat);
      n.start(t); n.stop(t + s.dur + 0.02);
    }
    function playBass(t, midi, dur, gain) {
      const s = spec("bass", { type:"sawtooth", lp0:200, lp1:900, detune:5, adsr:{a:0.005,d:0.2,s:0.7,r:0.2} });
      const f = mtof(midi);
      const g = octx.createGain();
      adsrEnv(g, t, dur, s.adsr, gain);
      const lp = octx.createBiquadFilter();
      lp.type = "lowpass"; lp.Q.value = s.q || 6;
      lp.frequency.setValueAtTime(s.lp0 || 200, t);
      lp.frequency.linearRampToValueAtTime(s.lp1 || 900, t + dur * 0.3);
      lp.frequency.linearRampToValueAtTime(s.lp0 || 200, t + dur);
      const det = s.detune || 0;
      if (det > 0) {
        const o1 = octx.createOscillator(), o2 = octx.createOscillator();
        o1.type = s.type; o1.frequency.value = f; o1.detune.value = -det;
        o2.type = s.type; o2.frequency.value = f; o2.detune.value = +det;
        o1.connect(lp); o2.connect(lp);
        o1.start(t); o2.start(t); o1.stop(t + dur); o2.stop(t + dur);
      } else {
        const o = octx.createOscillator();
        o.type = s.type; o.frequency.value = f;
        o.connect(lp);
        o.start(t); o.stop(t + dur);
      }
      lp.connect(g).connect(trackGain.bass);
    }
    function playPad(t, midis, dur, gain) {
      const s = spec("pad", { type:"sawtooth", detune:14, lp:1800, adsr:{a:0.4,d:0.3,s:0.8,r:1.5} });
      const g = octx.createGain();
      adsrEnv(g, t, dur, s.adsr, gain);
      const lp = octx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = s.lp || 1800; lp.Q.value = 0.7;
      lp.connect(g).connect(trackGain.pad);
      for (const m of midis) {
        const o = octx.createOscillator();
        o.type = s.type || "sawtooth"; o.frequency.value = mtof(m);
        o.detune.value = (Math.random() * (s.detune || 14) * 2 - (s.detune || 14));
        o.connect(lp);
        o.start(t); o.stop(t + dur);
      }
    }
    function playLead(t, midi, dur, gain) {
      const s = spec("lead", { type:"square", lp0:3500, lp1:1200, adsr:{a:0.01,d:0.2,s:0.6,r:0.15} });
      const f = mtof(midi);
      const g = octx.createGain();
      adsrEnv(g, t, dur, s.adsr, gain);
      const lp = octx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(s.lp0 || 3500, t);
      lp.frequency.exponentialRampToValueAtTime(s.lp1 || 1200, t + dur);
      const o = octx.createOscillator();
      o.type = s.type || "square"; o.frequency.value = f;
      if (s.vibrato) {
        const lfo = octx.createOscillator();
        const lfoG = octx.createGain();
        lfo.frequency.value = s.vibrato.f || 5;
        lfoG.gain.value = s.vibrato.d || 6;
        lfo.connect(lfoG).connect(o.frequency);
        lfo.start(t); lfo.stop(t + dur);
      }
      o.connect(lp).connect(g).connect(trackGain.lead);
      o.start(t); o.stop(t + dur);
    }
    function playArp(t, midi, dur, gain) {
      const s = spec("arp", { type:"square", duty:0.25, hp:400, adsr:{a:0.005,d:0.12,s:0.3,r:0.08} });
      const g = octx.createGain();
      adsrEnv(g, t, dur, s.adsr, gain);
      const o = octx.createOscillator();
      o.type = s.type || "square"; o.frequency.value = mtof(midi);
      const hp = octx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = s.hp || 400;
      o.connect(hp).connect(g).connect(trackGain.arp);
      o.start(t); o.stop(t + dur);
    }

    // Разложить секции в линейный timeline (loops раз).
    function patAt(ch, globalStep) {
      const stepInLoop = globalStep % stepsPerLoop;
      let acc = 0;
      for (const sec of track.sections) {
        const secSteps = sec.len * spb;
        if (stepInLoop < acc + secSteps) {
          const rel = stepInLoop - acc;
          const arr = sec.pat[ch];
          if (!arr || !arr.length) return null;
          return arr[rel % arr.length];
        }
        acc += secSteps;
      }
      return null;
    }

    for (let gs = 0; gs < totalSteps; gs++) {
      const t = gs * stepDur + 0.1;
      const vK = patAt("kick", gs);
      if (vK) playKick(t, 0.9);
      const vS = patAt("snare", gs);
      if (vS) playSnare(t, 0.85);
      const vH = patAt("hat", gs);
      if (vH) playHat(t, 0.35);
      const vB = patAt("bass", gs);
      if (vB != null && vB !== 0) playBass(t, vB, stepDur * 1.6, 0.7);
      const vP = patAt("pad", gs);
      if (vP != null && vP !== 0) {
        const pc = vP % 12;
        const minorPCs = [9, 2, 4, 11];
        const third = minorPCs.includes(pc) ? 3 : 4;
        playPad(t, [vP, vP + third, vP + 7], stepDur * 14, 0.22);
      }
      const vL = patAt("lead", gs);
      if (vL != null && vL !== 0) playLead(t, vL, stepDur * 3, 0.35);
      const vA = patAt("arp", gs);
      if (vA != null && vA !== 0) playArp(t, vA, stepDur * 0.9, 0.22);
    }

    const rendered = await octx.startRendering();
    const ch0 = rendered.getChannelData(0);
    const ch1 = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : ch0;
    return encodeWav([ch0, ch1], sr);
  }

  // Совместимость: старый вызов render(pattern, bpm, seconds).
  async function render(pattern, bpm, seconds, sampleRate) {
    // Оборачиваем старый паттерн в одну секцию.
    const track = {
      name: "legacy", bpm: bpm, SPB: 16,
      sections: [{ name:"main", len: pattern.kick.length / 16, pat: pattern }],
      synth: null,
    };
    return renderTrack(track, 1, sampleRate);
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = (name || "hexxagon") + ".wav";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { render, renderTrack, download, encodeWav };
})();
