// ui_sound.js - короткие UI-звуки через Web Audio (отдельный контекст
// не нужен, переиспользуем контекст AudioEngine).
// Вставляется после audio.js.

const UISound = (() => {
  function ctx() {
    if (!AudioEngine.isReady()) return null;
    return AudioEngine.getCtx();
  }

  function bus() {
    const b = AudioEngine.getBus();
    return b || ctx().destination;
  }

  // Короткий однонотный "блип" через Web Audio.
  // freq - Гц, dur - сек, type - осциллятор, gain - пиковая громкость.
  function blip(freq, dur, type, gain) {
    const c = ctx();
    if (!c) return;                 // аудио ещё не активировано (нет user gesture)
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.1, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus());
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Клик по клетке.
  function click() { blip(880, 0.05, "square", 0.08); }
  // Выбор фишки.
  function select() { blip(660, 0.06, "square", 0.10); }
  // Ход.
  function move() { blip(440, 0.08, "triangle", 0.10); }
  // Захват.
  function capture() {
    blip(523, 0.07, "square", 0.10);
    setTimeout(() => blip(659, 0.07, "square", 0.10), 50);
    setTimeout(() => blip(784, 0.09, "square", 0.10), 100);
  }
  // Отмена.
  function undo() { blip(330, 0.10, "triangle", 0.10); }
  // Победа.
  function win() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => blip(f, 0.14, "square", 0.12), i*90));
  }
  // Поражение.
  function lose() {
    const notes = [392, 349, 294, 262];
    notes.forEach((f, i) => setTimeout(() => blip(f, 0.18, "triangle", 0.10), i*120));
  }

  return { click, select, move, capture, undo, win, lose };
})();