// hex.js - аксиальные координаты, поле Hexxagon, рендер гексов.
// Аксиальные (q, r), pointy-top. Кубическое расстояние.

const HEX = (() => {
  const SQRT3 = Math.sqrt(3);

  // 6 направлений соседей в аксиальных координатах.
  const DIRS = [
    { q: +1, r:  0 }, { q: +1, r: -1 }, { q:  0, r: -1 },
    { q: -1, r:  0 }, { q: -1, r: +1 }, { q:  0, r: +1 },
  ];

  // Расстояние в гексах (кубическое).
  function dist(aq, ar, bq, br) {
    const as = -aq - ar, bs = -bq - br;
    return Math.max(
      Math.abs(aq - bq),
      Math.abs(ar - br),
      Math.abs(as - bs)
    );
  }

  // Соседи (все 6).
  function neighbors(q, r) {
    return DIRS.map(d => ({ q: q + d.q, r: r + d.r }));
  }

  // Соседи в радиусе N (кольцо).
  function inRange(cq, cr, N) {
    const out = [];
    for (let dq = -N; dq <= N; dq++) {
      for (let dr = Math.max(-N, -dq - N); dr <= Math.min(N, -dq + N); dr++) {
        out.push({ q: cq + dq, r: cr + dr });
      }
    }
    return out;
  }

  // Стандартное поле Hexxagon: 61 гекс (R=4), убраны 3 угла = 58.
  // Форма - ромб с вырезанными дальними углами.
  function buildBoard() {
    const R = 4;
    const cells = [];
    for (let q = -R; q <= R; q++) {
      for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
        cells.push({ q, r });
      }
    }
    // 61 гекс (R=4, полный шестиугольник). Симметричен, 6 углов.
    return cells;
  }
  // --- Геометрия на экране (pointy-top) ---
  // hexToPixel: аксиальные → пиксели относительно центра.
  function hexToPixel(q, r, size) {
    const x = size * SQRT3 * (q + r / 2);
    const y = size * 1.5 * r;
    return { x, y };
  }

  // Углы гекса (pointy-top): 6 вершин.
  function corners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) });
    }
    return pts;
  }

  // Точка внутри многоугольника (ray cast).
  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const hit = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }

  // Вычислить размер гекса и origin так, чтобы поле влезло в canvas.
  function fit(canvasW, canvasH, board, margin) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const c of board) {
      const p = hexToPixel(c.q, c.r, 1);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const wU = (maxX - minX) + SQRT3;  // + ширина одного гекса
    const hU = (maxY - minY) + 2;      // + высота одного гекса
    const size = Math.min(
      (canvasW - margin*2) / wU,
      (canvasH - margin*2) / hU
    );
    const originX = canvasW/2 - ((minX + maxX)/2) * size;
    const originY = canvasH/2 - ((minY + maxY)/2) * size;
    return { size, originX, originY };
  }

  return { DIRS, dist, neighbors, inRange, buildBoard,
           hexToPixel, corners, pointInPoly, fit };
})();