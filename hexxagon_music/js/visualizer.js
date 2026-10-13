// visualizer.js - спектр-визуализатор на canvas (реагирует на музыку).
// Рисует полосу частот снизу экрана.

const Visualizer = (() => {
  let data = null;

  function ensure() {
    const a = AudioEngine.getAnalyser ? AudioEngine.getAnalyser() : null;
    if (!a) return null;
    if (!data || data.length !== a.frequencyBinCount) {
      data = new Uint8Array(a.frequencyBinCount);
    }
    a.getByteFrequencyData(data);
    return data;
  }

  // Рисовать снизу canvas: 32 полосы.
  function draw(ctx2d, w, h, now) {
    const d = ensure();
    if (!d) return;
    const bars = 32;
    const step = Math.floor(d.length * 0.6 / bars);
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      // Среднее по группе бинов.
      let sum = 0;
      for (let j = 0; j < step; j++) sum += d[i * step + j] || 0;
      const v = sum / step / 255;
      const bh = v * h * 0.25;
      ctx2d.fillStyle = "rgba(125,95,255," + (0.12 + v * 0.35) + ")";
      ctx2d.fillRect(i * barW, h - bh, barW - 1, bh);
    }
  }

  return { draw };
})();