// galaxy.js (v6) - звёздная система Music Star. Рендер планет на canvas.
// Клик по планете = выбор. Используется в рубке корабля.

const Galaxy = (() => {
  let canvas = null, ctx2d = null;
  let raf = null;
  let selected = null;
  let hover = null;
  let stars = [];
  let t0 = 0;

  // Координаты планеты на canvas (относительные, от центра).
  function planetPos(p, W, H) {
    const cx = W/2, cy = H/2;
    const maxR = Math.min(W, H) * 0.42;
    const r = maxR * (p.orbit / 4.5);
    return { x: cx + Math.cos(p.angle) * r, y: cy + Math.sin(p.angle) * r,
             r: 10 + (10 - p.hot) * 1.5 };
  }

  function resize() {
    if (!canvas) return;
    const st = document.getElementById("tech-canvas");
    if (!st) return;
    canvas.width = st.clientWidth || 640;
    canvas.height = st.clientHeight || 480;
  }

  function drawStar(x, y, r, now) {
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.002);
    // Ядро.
    const g = ctx2d.createRadialGradient(x, y, 0, x, y, r * 2.5);
    g.addColorStop(0, "#fff8d0");
    g.addColorStop(0.3, "#ffcc44");
    g.addColorStop(0.7, "rgba(255,120,40,0.3)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx2d.fillStyle = g;
    ctx2d.beginPath();
    ctx2d.arc(x, y, r * 2.5 * pulse, 0, Math.PI*2);
    ctx2d.fill();
    ctx2d.fillStyle = "#fffbe0";
    ctx2d.beginPath();
    ctx2d.arc(x, y, r, 0, Math.PI*2);
    ctx2d.fill();
  }

  function drawOrbit(cx, cy, r) {
    ctx2d.strokeStyle = "rgba(80,120,200,0.18)";
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, 0, Math.PI*2);
    ctx2d.stroke();
  }

  function drawPlanet(p, pos, now) {
    const isSel = selected === p.id;
    const isHov = hover === p.id;
    const won = (typeof Progress !== "undefined") && Progress.isWon(p.id);
    const unlocked = (typeof Progress !== "undefined") ? Progress.isUnlocked(p.id) : true;
    // Ореол.
    const g = ctx2d.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pos.r*2.2);
    g.addColorStop(0, p.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx2d.globalAlpha = isSel ? 0.85 : (isHov ? 0.6 : 0.4);
    ctx2d.fillStyle = g;
    ctx2d.beginPath();
    ctx2d.arc(pos.x, pos.y, pos.r*2.2, 0, Math.PI*2);
    ctx2d.fill();
    ctx2d.globalAlpha = 1;
    // Тело планеты.
    ctx2d.fillStyle = unlocked ? p.color : "#333";
    ctx2d.beginPath();
    ctx2d.arc(pos.x, pos.y, pos.r, 0, Math.PI*2);
    ctx2d.fill();
    // Контур.
    ctx2d.strokeStyle = isSel ? "#fff" : (won ? "#2ecc71" : "#000");
    ctx2d.lineWidth = isSel ? 3 : 2;
    ctx2d.stroke();
    // Метка «освобождена».
    if (won) {
      ctx2d.fillStyle = "#2ecc71";
      ctx2d.font = "bold 14px monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText("✓", pos.x, pos.y + 5);
    } else if (!unlocked) {
      ctx2d.fillStyle = "#888";
      ctx2d.font = "bold 14px monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText("🔒", pos.x, pos.y + 5);
    }
    // Подпись при наведении/выборе.
    if (isSel || isHov) {
      ctx2d.fillStyle = "#e6f0ff";
      ctx2d.font = "10px monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText(p.name, pos.x, pos.y - pos.r - 6);
    }
  }

  function render(now) {
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    // Фон.
    ctx2d.fillStyle = "#04060f";
    ctx2d.fillRect(0, 0, W, H);
    // Звёзды (2 слоя).
    for (const s of stars) {
      ctx2d.globalAlpha = s.a * (0.6 + 0.4*Math.sin(now*0.001 + s.x));
      ctx2d.fillStyle = s.layer ? "#ffffff" : "#8ca8e0";
      const sz = s.layer ? 2 : 1;
      ctx2d.fillRect(Math.round(s.x), Math.round(s.y), sz, sz);
    }
    ctx2d.globalAlpha = 1;
    const cx = W/2, cy = H/2;
    // Орбиты.
    const maxR = Math.min(W, H) * 0.42;
    for (let i = 0; i < 5; i++) drawOrbit(cx, cy, maxR * ((i+1)/5));
    // Звезда.
    drawStar(cx, cy, 22, now);
    // Планеты.
    if (typeof Progress !== "undefined") {
      for (const p of Progress.PLANETS) {
        const pos = planetPos(p, W, H);
        drawPlanet(p, pos, now);
      }
    }
    raf = requestAnimationFrame(render);
  }

  function findPlanetAt(mx, my) {
    if (typeof Progress === "undefined") return null;
    const W = canvas.width, H = canvas.height;
    for (const p of Progress.PLANETS) {
      const pos = planetPos(p, W, H);
      const dx = mx - pos.x, dy = my - pos.y;
      if (dx*dx + dy*dy <= (pos.r + 8) * (pos.r + 8)) return p;
    }
    return null;
  }

  function onClick(e) {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const p = findPlanetAt(mx, my);
    if (p) {
      if (typeof Progress !== "undefined" && !Progress.isUnlocked(p.id)) return;
      select(p.id);
    }
  }

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const p = findPlanetAt(mx, my);
    hover = p ? p.id : null;
    canvas.style.cursor = p ? "pointer" : "default";
  }

  function select(id) {
    selected = id;
    if (typeof TechView !== "undefined") TechView.onPlanetSelected(id);
  }
  function getSelected() { return selected; }

  function initStars() {
    stars = [];
    const W = canvas.width, H = canvas.height;
    for (let i = 0; i < 60; i++)
      stars.push({ x: Math.random()*W, y: Math.random()*H, layer:0, a: 0.25+Math.random()*0.4 });
    for (let i = 0; i < 30; i++)
      stars.push({ x: Math.random()*W, y: Math.random()*H, layer:1, a: 0.5+Math.random()*0.5 });
  }

  function start() {
    canvas = document.getElementById("tech-canvas");
    if (!canvas) return;
    ctx2d = canvas.getContext("2d");
    resize();
    initStars();
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("resize", () => { resize(); initStars(); });
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  return { start, stop, select, getSelected, planetPos, findPlanetAt };
})();