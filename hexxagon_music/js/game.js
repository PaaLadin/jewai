// game.js - цикл партии, рендер, ввод, связь board <-> audio.
// Сектора: 7 зон (центр + 6 угловых), каждая = дорожка оркестра.

const Game = (() => {
  let canvas, ctx2d, size = 24, originX = 0, originY = 0;
  let board = null;
  let humanTurn = true;
  let hotSeat = false;
  // Стиль каждого игрока (индекс = player-1).
  let playerStyles = ["retrowave", "rock", "metal", "blues"];
  const ALL_STYLES = ["retrowave","rock","metal","blues","dnb","ambient","chip"];
  let selected = null;        // { q, r } выбранной фишки
  let hoverHex = null;        // под курсором
  let effects = [];           // вспышки захвата
  let colorTweens = [];       // плавные переходы цвета клеток
  let startedAt = 0;
  let moveCount = 0;
  let undoStack = [];
  let stars = [];
  let gameSeed = 0;         // для воспроизводимости
  let kbdCursor = null;     // позиция курсора-клавиатуры
  let particles = [];       // частицы захвата
  let sectorFlash = {};     // channel -> t (время вспышки)
  let soloChannel = null;   // null = все дорожки
  let showLegend = false;   // подписи секторов на поле
  let sectorOfHex = new Map();// key(q,r) -> channel
  let lastTime = 0;
  let _ditherPat = null;
  let sectorsSummary = {};    // channel -> { player, count }

  const CHANNELS = ["kick","snare","hat","bass","pad","lead","arp"];

  // --- СЕКТОРА ---
  // Центр (0,0) = kick. 6 угловых секторов по 60° = остальные дорожки.
  // Сектора: 6 угловых зон по 60°, каждая = одна дорожка оркестра.
  // kick - всегда базовый бит (не сектор). Центр - ничей (косметика).
  function computeSectors() {
    sectorOfHex.clear();
    const RING_CH = ["snare","hat","bass","pad","lead","arp"];
    for (const c of board.cells) {
      if (c.q === 0 && c.r === 0) {
        sectorOfHex.set(c.q + "," + c.r, null);
        continue;
      }
      const x = c.q + c.r / 2;
      const y = c.r * Math.sqrt(3) / 2;
      let ang = Math.atan2(y, x);
      if (ang < 0) ang += Math.PI * 2;
      const idx = Math.floor(((ang + Math.PI / 6) % (Math.PI * 2)) / (Math.PI / 3));
      sectorOfHex.set(c.q + "," + c.r, RING_CH[idx]);
    }
  }

  // Кто владеет сектором: тот, у кого > половины гексов сектора.
  function applySolo() {
    for (const ch of AudioEngine.CHANNELS) {
      const sm = sectorsSummary[ch];
      if (!sm) continue;
      const isSolo = !soloChannel || ch === soloChannel;
      const shouldPlay = (ch === "kick") ? true :
        (sm.owner > 0 && (hotSeat || sm.owner === Board.P1));
      const on = isSolo && shouldPlay;
      const density = sm.density != null ? sm.density : 1;
      const style = playerStyles[(sm.owner > 0 ? sm.owner : 1) - 1];
      AudioEngine.setChannel(ch, { on, density, style });
    }
  }

  function recomputeSectors() {
    const tally = {};
    for (const ch of CHANNELS) tally[ch] = { p1: 0, p2: 0, p3: 0, p4: 0, total: 0 };
    for (const c of board.cells) {
      const ch = sectorOfHex.get(c.q + "," + c.r);
      if (!ch) continue;
      tally[ch].total++;
      if (c.owner === 1) tally[ch].p1++;
      else if (c.owner === 2) tally[ch].p2++;
      else if (c.owner === 3) tally[ch].p3++;
      else if (c.owner === 4) tally[ch].p4++;
    }
    sectorsSummary = {};
    for (const ch of CHANNELS) {
      if (ch === "kick") {
        // Базовый бит: звучит всегда, стиль первого игрока.
        sectorsSummary[ch] = { owner: -1, base: true };
        AudioEngine.setChannel(ch, { on: true, density: 1, style: playerStyles[0] });
        continue;
      }
      const t = tally[ch];
      let owner = 0;
      if (t.p1 * 2 > t.total) owner = Board.P1;
      else if (t.p2 * 2 > t.total) owner = Board.P2;
      sectorsSummary[ch] = { owner, p1: t.p1, p2: t.p2, total: t.total };
      // Плотность и стиль: по владельцу сектора.
      let density = 0, style = null;
      if (owner === Board.P1) {
        density = t.total > 0 ? (t.p1 / t.total) : 0;
        style = playerStyles[0];
      } else if (owner > 0) {
        const cnt = owner === Board.P2 ? t.p2 :
                    owner === 3 ? t.p3 :
                    owner === 4 ? t.p4 : 0;
        density = t.total > 0 ? (cnt / t.total) : 0;
        style = playerStyles[owner - 1] || "retrowave";
      }
      // Отслеживание смены владельца для вспышки.
      const prev = sectorsSummary[ch];
      if (prev && prev.owner !== owner && owner > 0) {
        sectorFlash[ch] = 0.8;   // 800 мс
      }
      sectorsSummary[ch].density = density;
      const shouldPlay = (ch === "kick" && owner === -1) ? true :
        (owner > 0 && (hotSeat || owner === Board.P1));
      const isSolo = !soloChannel || ch === soloChannel;
      AudioEngine.setChannel(ch, {
        on: isSolo && shouldPlay,
        density, style,
      });
    }
    // Ачивки: полный оркестр / микс.
    if (Board) {
      let p1sectors = 0;
      for (const ch of AudioEngine.CHANNELS) {
        if (ch === "kick") continue;
        const sm = sectorsSummary[ch];
        if (sm && sm.owner === Board.P1) p1sectors++;
      }
      if (p1sectors === 6) Achv.unlock("orchestra");
    }
    let onCount = 0;
    for (const ch of AudioEngine.CHANNELS) if (AudioEngine.isOn(ch)) onCount++;
    if (onCount === 7) Achv.unlock("full_mix");
  }

  // --- РЕНДЕР ---
  function resize() {
    const stage = document.getElementById("stage");
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 100 || h < 100) return;
    canvas.width = w; canvas.height = h;
    const f = HEX.fit(w, h, board.cells, 20);
    size = f.size; originX = f.originX; originY = f.originY;
    // Звёзды: 60 точек, медленно движутся.
    if (!stars.length) {
      // Дальний слой: 60 мелких.
      for (let i = 0; i < 60; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          layer: 0,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          a: 0.25 + Math.random() * 0.4,
        });
      }
      // Ближний слой: 30 крупных.
      for (let i = 0; i < 30; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          layer: 1,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          a: 0.5 + Math.random() * 0.5,
        });
      }
    }
  }

  function hexCenter(q, r) {
    const p = HEX.hexToPixel(q, r, size);
    return { x: originX + p.x, y: originY + p.y };
  }

  function OWNER_COLORS_get() { return Themes.current().owner; }
  // Совместимость: OWNER_COLORS как getter-функция.
  const OWNER_COLORS = new Proxy({}, {
    get(_, prop) { return Themes.current().owner[prop]; },
  });

  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  function drawBackground(dt, now) {
    // v2: дизеринг-фон (SNES/Genesis-стиль), вместо плоского градиента.
    const t = Themes.current();
    const bg = t.bg;
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    // v3: туманность — 3 цветных радиальных пятна (медленно дышат).
    const tNeb = now * 0.0003;
    const nebulae = [
      { x: 0.25, y: 0.3, r: 0.5, c: "rgba(80,40,160,0.10)" },
      { x: 0.75, y: 0.65, r: 0.55, c: "rgba(20,80,160,0.09)" },
      { x: 0.5, y: 0.5, r: 0.4, c: "rgba(160,40,120,0.07)" },
    ];
    for (let i = 0; i < nebulae.length; i++) {
      const n = nebulae[i];
      const px = canvas.width * n.x + Math.sin(tNeb + i) * 30;
      const py = canvas.height * n.y + Math.cos(tNeb * 1.3 + i) * 20;
      const pr = canvas.width * n.r * (0.9 + 0.1 * Math.sin(tNeb * 2 + i));
      const g = ctx2d.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, n.c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Дизер-паттерн (16-бит стиль) через createPattern — один проход.
    if (!_ditherPat) {
      const tc = document.createElement("canvas");
      tc.width = 4; tc.height = 4;
      const tg = tc.getContext("2d");
      tg.fillStyle = t.glow || "#4a80ff";
      tg.fillRect(0, 0, 2, 2);
      tg.fillRect(2, 2, 2, 2);
      _ditherPat = ctx2d.createPattern(tc, "repeat");
    }
    ctx2d.save();
    const cx = canvas.width / 2, cy = canvas.height * 0.4;
    const maxR = Math.max(canvas.width, canvas.height) * 0.75;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx2d.clip();
    ctx2d.globalAlpha = 0.10;
    ctx2d.fillStyle = _ditherPat;
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.restore();
    // Звёзды: 2 слоя (параллакс), пиксельные квадраты, мерцание.
    // Слой 0 (дальний): мелкие, медленные, тусклые.
    // Слой 1 (ближний): крупные, быстрые, яркие.
    for (const st of stars) {
      const speedMul = st.layer === 1 ? 1.0 : 0.35;
      st.x += st.vx * dt * speedMul;
      st.y += st.vy * dt * speedMul;
      if (st.x < 0) st.x += canvas.width;
      if (st.x > canvas.width) st.x -= canvas.width;
      if (st.y < 0) st.y += canvas.height;
      if (st.y > canvas.height) st.y -= canvas.height;
      const baseA = st.layer === 1 ? st.a : st.a * 0.55;
      ctx2d.globalAlpha = baseA * (0.6 + 0.4 * Math.sin(now * 0.001 + st.x));
      // Цвет: дальний — голубоватый, ближний — белый/жёлтоватый.
      ctx2d.fillStyle = st.layer === 1 ? "#ffffff" : "#8ca8e0";
      // Дальний слой — 1px, ближний — 2px (пиксельно).
      const sz = st.layer === 1 ? 2 : 1;
      ctx2d.fillRect(Math.round(st.x), Math.round(st.y), sz, sz);
    }
    ctx2d.globalAlpha = 1;
  }

  function drawCell(c, now) {
    const { x, y } = hexCenter(c.q, c.r);
    const poly = HEX.corners(x, y, size * 0.94);
    ctx2d.beginPath();
    ctx2d.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < 6; i++) ctx2d.lineTo(poly[i].x, poly[i].y);
    ctx2d.closePath();
    // Цвет с учётом tween.
    let rgb = OWNER_COLORS[c.owner] || OWNER_COLORS[0];
    for (const tw of colorTweens) {
      if (tw.q === c.q && tw.r === c.r) {
        const k = Math.min(1, tw.t / tw.dur);
        const ease = k * k * (3 - 2 * k);
        rgb = lerpColor(OWNER_COLORS[tw.from] || OWNER_COLORS[0],
                        OWNER_COLORS[tw.to] || OWNER_COLORS[0], ease);
        break;
      }
    }
    // v3: мягкое свечение клетки под владельцем.
    if (c.owner !== 0) {
      const pulse2 = 0.5 + 0.5 * Math.sin((now || 0) * 0.002 + c.q + c.r);
      ctx2d.save();
      ctx2d.shadowColor = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      ctx2d.shadowBlur = 8 + 6 * pulse2;
      ctx2d.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      ctx2d.fill();
      ctx2d.restore();
    } else {
      ctx2d.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      ctx2d.fill();
    }
    // Лёгкий оттенок сектора - цвет символический.
    const ch = sectorOfHex.get(c.q + "," + c.r);
    if (ch && sectorFlash[ch] > 0) {
      ctx2d.fillStyle = "rgba(255,255,255," + (sectorFlash[ch] * 0.25) + ")";
      ctx2d.fill();
    }
    if (ch && c.owner === 0) {
      const SEC_COLOR = {
        snare: "rgba(255,120,80,0.10)",
        hat:   "rgba(255,230,109,0.10)",
        bass:  "rgba(125,95,255,0.12)",
        pad:   "rgba(0,229,255,0.10)",
        lead:  "rgba(255,46,151,0.10)",
        arp:   "rgba(46,204,113,0.10)",
      };
      ctx2d.fillStyle = SEC_COLOR[ch] || "rgba(255,255,255,0.05)";
      ctx2d.fill();
    }
    ctx2d.strokeStyle = Themes.current().grid;
    ctx2d.lineWidth = 1;
    ctx2d.stroke();
  }

  function drawHighlight(q, r, color, width) {
    const { x, y } = hexCenter(q, r);
    const poly = HEX.corners(x, y, size * 0.94);
    ctx2d.beginPath();
    ctx2d.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < 6; i++) ctx2d.lineTo(poly[i].x, poly[i].y);
    ctx2d.closePath();
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = width || 2;
    ctx2d.stroke();
  }

  // v2: 6 типов монстров на 7 каналов (kick = slime базовый).
  const SECTOR_TYPE = {
    kick:  "slime",   // центр
    snare: "robot",   // snare-сектор
    hat:   "crystal", // hat-сектор
    bass:  "dragon",  // бас — тяжёлый
    pad:   "ghost",   // пэд — воздушный
    lead:  "plasma",  // лид — энергичный
    arp:   "crystal", // арп — кристальный
  };

  function pickType(q, r) {
    // Тип монстра по сектору - визуально отражает инструмент.
    const ch = sectorOfHex.get(q + "," + r);
    if (ch && SECTOR_TYPE[ch]) return SECTOR_TYPE[ch];
    // Центр (kick) - slime.
    return "slime";
  }

  const OWNER_GLOW = {
    1: "rgba(255,46,151,0.45)",
    2: "rgba(0,229,255,0.45)",
    3: "rgba(255,230,109,0.45)",
    4: "rgba(46,204,113,0.45)",
  };

  function drawMonster(q, r, owner, now, captureK) {
    const { x, y } = hexCenter(q, r);
    // v2: спрайты 16x16, крупнее и детальнее.
    const side = Math.max(16, Math.round(size * 1.0));
    let scale = Math.max(1, Math.floor(side / 16));
    const type = pickType(q, r);
    const img = Sprites.get(owner, type, scale);
    let w = img.width, h = img.height;
    // Анимация захвата: сжатие (1.0 → 0.6 → 1.0) + вспышка.
    const ck = captureK || 0;
    let capScale = 1.0;
    let flashA = 0;
    if (ck > 0 && ck < 1) {
      // Быстрое сжатие до 0.6 в первой половине, возврат во второй.
      const k = ck < 0.5 ? ck * 2 : (1 - ck) * 2;
      capScale = 0.6 + 0.4 * k;
      flashA = (1 - k) * 0.7;
    }
    // Glow-подсветка.
    const pulse = 0.85 + 0.15 * Math.sin(now * 0.003 + q * 0.7 + r * 1.3);
    ctx2d.save();
    ctx2d.globalAlpha = pulse;
    const g = ctx2d.createRadialGradient(x, y, 1, x, y, size * 0.7);
    g.addColorStop(0, OWNER_GLOW[owner] || "rgba(255,255,255,0.3)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx2d.fillStyle = g;
    ctx2d.beginPath();
    ctx2d.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
    // Сам монстр с лёгким "дыханием".
    const bob = Math.round(Math.sin(now * 0.004 + q + r) * 1.2);
    const dw = Math.round(w * capScale), dh = Math.round(h * capScale);
    ctx2d.drawImage(
      img,
      Math.round(x - dw / 2),
      Math.round(y - dh / 2 + bob),
      dw, dh
    );
    // Вспышка при захвате.
    if (flashA > 0) {
      ctx2d.save();
      ctx2d.globalAlpha = flashA;
      ctx2d.fillStyle = "#ffffff";
      ctx2d.beginPath();
      ctx2d.arc(x, y, size * 0.55, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }
  }

  function drawEffects() {
    for (const e of effects) {
      ctx2d.beginPath();
      ctx2d.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx2d.strokeStyle = e.color;
      ctx2d.globalAlpha = 1 - e.t / e.dur;
      ctx2d.lineWidth = 3;
      ctx2d.stroke();
    }
    for (const pt of particles) {
      const a = 1 - pt.life / pt.maxLife;
      ctx2d.globalAlpha = a;
      ctx2d.fillStyle = pt.color;
      ctx2d.fillRect(Math.round(pt.x), Math.round(pt.y), pt.r, pt.r);
    }
    ctx2d.globalAlpha = 1;
  }

  let lastTimerTick = 0;
  function tickTimer(now) {
    if (now - lastTimerTick < 500) return;
    lastTimerTick = now;
    if (startedAt && !board.winner) updateHud();
  }

  function render(now, dt) {
    drawBackground(dt || 0.016, now || 0);
    if (AudioEngine.isReady && AudioEngine.isReady()) {
      Visualizer.draw(ctx2d, canvas.width, canvas.height, now || 0);
    }
    for (const c of board.cells) drawCell(c, now || 0);
    // Подсветка ходов выбранной фишки.
    const curPlayer = board.turn;
    if (selected && humanTurn && (hotSeat || curPlayer === Board.P1)) {
      drawHighlight(selected.q, selected.r, "#ffe66d", 3);
      for (const m of Board.movesFrom(board, selected.q, selected.r)) {
        drawHighlight(m.toQ, m.toR,
          m.kind === "clone" ? "#ffe66d" : "#7d5fff", 2);
      }
    }
    // Подсветка под курсором.
    if (hoverHex) drawHighlight(hoverHex.q, hoverHex.r, "#7d5fff", 1);
    // Курсор-клавиатура.
    if (kbdCursor) drawHighlight(kbdCursor.q, kbdCursor.r, "#ffe66d", 2);
    // Монстры (с анимацией захвата: сжатие при colorTween).
    for (const c of board.cells) {
      if (c.owner !== 0) {
        let captureK = 0;
        for (const tw of colorTweens) {
          if (tw.q === c.q && tw.r === c.r) {
            captureK = Math.max(captureK, Math.min(1, tw.t / tw.dur));
            break;
          }
        }
        drawMonster(c.q, c.r, c.owner, now || 0, captureK);
      }
    }
    if (showLegend) drawLegend();
    drawEffects();
  }

  function drawLegend() {
    // Подписи в центрах секторов.
    const SECTOR_LABEL = {
      snare: "snare", hat: "hat", bass: "bass",
      pad: "pad", lead: "lead", arp: "arp", kick: "kick",
    };
    // Собрать уникальные сектора и нарисовать 1 подпись на сектор.
    const seen = new Set();
    for (const c of board.cells) {
      const ch = sectorOfHex.get(c.q + "," + c.r) || (c.q === 0 && c.r === 0 ? "kick" : null);
      if (!ch || seen.has(ch)) continue;
      seen.add(ch);
      const { x, y } = hexCenter(c.q, c.r);
      ctx2d.fillStyle = "rgba(255,255,255,0.7)";
      ctx2d.font = Math.max(10, Math.round(size * 0.35)) + "px monospace";
      ctx2d.textAlign = "center";
      ctx2d.fillText(SECTOR_LABEL[ch], x, y + 4);
    }
  }
  // --- ВВОД ---
  function pickHex(mx, my) {
    for (const c of board.cells) {
      const { x, y } = hexCenter(c.q, c.r);
      const poly = HEX.corners(x, y, size * 0.94);
      if (HEX.pointInPoly(mx, my, poly)) return c;
    }
    return null;
  }

  function canvasPos(evt) {
    const r = canvas.getBoundingClientRect();
    const mx = (evt.clientX - r.left) * (canvas.width / r.width);
    const my = (evt.clientY - r.top) * (canvas.height / r.height);
    return { mx, my };
  }

  function onClick(evt) {
    if (board.winner) return;
    if (!humanTurn) return;
    const myPlayer = board.turn;
    if (!hotSeat && myPlayer !== Board.P1) return;
    let c;
    if (evt._kbd) {
      c = evt.hex;
    } else {
      const { mx, my } = canvasPos(evt);
      c = pickHex(mx, my);
    }
    if (!c) return;
    if (selected) {
      const move = Board.movesFrom(board, selected.q, selected.r)
        .find(m => m.toQ === c.q && m.toR === c.r);
      if (move) {
        UISound.move();
        doMove(selected.q, selected.r, c.q, c.r);
        selected = null;
        return;
      }
    }
    if (c.owner === myPlayer) {
      UISound.select();
      selected = { q: c.q, r: c.r };
    } else {
      selected = null;
    }
  }

  function onMove(evt) {
    const { mx, my } = canvasPos(evt);
    hoverHex = pickHex(mx, my);
  }

  function doMove(fq, fr, tq, tr) {
    // Снимок до хода (для undo).
    if (board.turn === Board.P1 && !hotSeat || hotSeat) {
      if (undoStack.length > 100) undoStack.shift();
      undoStack.push(Board.clone(board));
    }
    const res = Board.apply(board, fq, fr, tq, tr);
    if (!res.ok) { undoStack.pop(); return; }
    moveCount++;
    // Эффекты захвата.
    const captureTime = performance.now() / 1000;
    for (const f of res.flipped) {
      const { x, y } = hexCenter(f.q, f.r);
      effects.push({ x, y, r: 0, maxR: size*0.8, t: 0, dur: 0.4,
                     color: "#ffe66d" });
      colorTweens.push({
        q: f.q, r: f.r, from: f.was || 0, to: f.owner || 1,
        t: 0, dur: 0.35, startedAt: captureTime,
      });
    }
    if (res.flipped.length > 0) UISound.capture();
    Autosave.save(board, { playerStyles, hotSeat, moveCount });
    // Частицы захвата.
    for (const f of res.flipped) {
      const { x, y } = hexCenter(f.q, f.r);
      const owner = f.owner || 1;
      const col = OWNER_GLOW[owner] || "rgba(255,255,255,0.5)";
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 80;
        particles.push({
          x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
          life: 0, maxLife: 0.5 + Math.random() * 0.4,
          color: col, r: 2 + Math.random() * 2,
        });
      }
    }
    recomputeSectors();
    updateHud();
    if (board.winner) return endGame();
    if (demoMode) return;   // сам шагает stepDemo
    if (hotSeat) { updateHud(); return; }
    if (board.turn !== Board.P1) scheduleAi();
  }

  function undo() {
    if (!undoStack.length) return;
    UISound.undo();
    board = undoStack.pop();
    selected = null;
    moveCount = Math.max(0, moveCount - 1);
    effects = [];
    colorTweens = [];
    document.getElementById("overlay").classList.add("hidden");
    recomputeSectors();
    updateHud();
  }

  function scheduleAi() {
    humanTurn = false;
    updateHud();
    setTimeout(() => {
      const m = AI.pickMove(board, board.turn);
      if (!m) { humanTurn = true; updateHud(); return; }
      doMove(m.fromQ, m.fromR, m.toQ, m.toR);
      if (board.turn === Board.P1) humanTurn = true;
      updateHud();
    }, 400);
  }

  // --- HUD ---
  function updateHud() {
    const c = Board.count(board);
    document.getElementById("score-p1").textContent = c.p1;
    document.getElementById("score-p2").textContent = c.p2;
    // Дополнительные игроки (3,4) - покажем в статусе.
    const extra = [];
    for (let i = 3; i <= board.numPlayers; i++) extra.push("P" + i + ":" + (c.by[i]||0));
    if (extra.length) document.getElementById("status").dataset.extra = extra.join(" ");
    document.getElementById("turn").textContent =
      board.winner ? "—" :
      (board.turn === Board.P1 ? I18n.t("turn.you") : I18n.t("turn.ai"));
    // Полоса оркестра.
    const box = document.getElementById("tracks");
    box.innerHTML = "";
    for (const ch of AudioEngine.CHANNELS) {
      const tag = document.createElement("span");
      const active = soloChannel === ch;
      tag.className = "track-tag " + (AudioEngine.isOn(ch) ? "on" : "off") +
                      (active ? " solo" : "");
      tag.textContent = ch;
      tag.style.cursor = "pointer";
      tag.title = "Клик - solo (только эта дорожка). Повторно - снять.";
      tag.addEventListener("click", () => {
        soloChannel = soloChannel === ch ? null : ch;
        applySolo();
        updateHud();
      });
      box.appendChild(tag);
    }
    // Статус.
    const onCount = AudioEngine.CHANNELS.filter(ch => AudioEngine.isOn(ch)).length;
    document.getElementById("status").textContent =
      onCount + "/" + AudioEngine.CHANNELS.length + " дорожек";
    document.getElementById("move-count").textContent = moveCount;
    if (startedAt) {
      const sec = Math.floor((performance.now() - startedAt) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      document.getElementById("timer").textContent = m + ":" + ss;
    }
  }

  function endGame() {
    const c = Board.count(board);
    const ranked = c.ranked;
    const lines = ranked.map(r => "P" + r.player + ": " + r.score).join("  ");
    const p1win = ranked[0].player === 1;
    const txt = p1win ? I18n.t("win.win") : I18n.t("win.lose");
    const ov = document.getElementById("overlay");
    const ot = document.getElementById("overlay-text");
    ot.textContent = txt + "\n" + lines;
    ot.style.whiteSpace = "pre";
    ot.style.color = p1win ? "#ff2e97" : "#00e5ff";
    ov.classList.remove("hidden");
    if (p1win) UISound.win(); else UISound.lose();
    // Запись в лидерборд.
    const winnerScore = ranked[0].score;
    const secs = startedAt ? Math.floor((performance.now() - startedAt) / 1000) : 0;
    try {
      Leaderboard.add({
        winner: ranked[0].player, score: winnerScore,
        moves: moveCount, secs: secs,
        aiLevel: AI.getLevel(), numPlayers: board.numPlayers,
        preset: document.getElementById("preset-select").value,
        hotSeat: hotSeat, seed: gameSeed,
      });
    } catch (err) {}
    // Ачивки.
    if (p1win) {
      Achv.unlock("first_win");
      const cnt = Board.count(board);
      if ((cnt.by[1] || 0) === 61) Achv.unlock("flawless");
      if (AI.getLevel() === "hard") Achv.unlock("hard_win");
    }
    if (board.numPlayers === 4 && hotSeat) Achv.unlock("hotseat_4");
    // v6 этап 7: записать прогресс планеты (счёт = инструменты x центр).
    if (window.__currentPlanet && typeof Progress !== "undefined") {
      const planet = Progress.PLANETS.find(p => p.id === window.__currentPlanet);
      if (planet && p1win) {
        // Инструменты: kick (базовый) + угловые сектора под P1 (max 7).
        let ring = 0;
        for (const ch of AudioEngine.CHANNELS) {
          if (ch === "kick") continue;
          const sm = sectorsSummary[ch];
          if (sm && sm.owner === Board.P1) ring++;
        }
        const tools = 1 + ring;
        const centerCell = board.map.get("0,0");
        const center = !!(centerCell && centerCell.owner === Board.P1);
        const rec = Progress.markWon(planet.id, tools, center);
        if (typeof Toast !== "undefined") {
          Toast.show("✓ " + planet.name + " освобождена: " +
            tools + " инстр." + (center ? " + центр (x2)" : "") +
            " = " + rec.score + " очк. Всего: " + Progress.totalScore(),
            { color: "#2ecc71", dur: 5000 });
        }
        window.__lastPlanetResult = { id: planet.id, tools, center,
                                      score: rec.score,
                                      total: Progress.totalScore() };
        const prBox = document.getElementById("overlay-planet-result");
        if (prBox) {
          prBox.textContent = "✓ " + planet.name + " освобождена: " +
            tools + " инстр." + (center ? " + центр (×2)" : "") +
            " = " + rec.score + " очк.\nВсего: " + Progress.totalScore();
        }
        const backBtn = document.getElementById("btn-planet-back");
        if (backBtn) backBtn.style.display = "";
      }
    }
    // Финальный микс: все дорожки на максимум - "полная полифония".
    finalMix(ranked[0].player);
  }

  // Финальный микс: поднять все дорожки на максимум.
  function finalMix(winner) {
    // Стиль победителя заполняет все каналы - "его музыка победила".
    const wStyle = playerStyles[winner - 1] || "retrowave";
    for (const ch of AudioEngine.CHANNELS) {
      AudioEngine.setChannel(ch, { on: true, density: 1.0, style: wStyle });
    }
    document.getElementById("style-name").textContent = wStyle + " (P" + winner + ")";
    updateHud();
  }
  // --- ЦИКЛ ---
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    for (const e of effects) {
      e.t += dt;
      e.r = e.maxR * (e.t / e.dur);
    }
    effects = effects.filter(e => e.t < e.dur);
    tickTimer(now);
    for (const tw of colorTweens) tw.t += dt;
    colorTweens = colorTweens.filter(tw => tw.t < tw.dur);
    for (const pt of particles) {
      pt.life += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
    }
    particles = particles.filter(pt => pt.life < pt.maxLife);
    for (const ch in sectorFlash) {
      if (sectorFlash[ch] > 0) sectorFlash[ch] -= dt;
    }
    render(now, dt);
    requestAnimationFrame(loop);
  }

  // --- ИНИЦИАЛИЗАЦИЯ ---
  // Загрузить партию из записи и проиграть все ходы.
  function loadReplay(rec) {
    board = Board.create(rec.numPlayers || 2);
    if (rec.playerStyles && rec.playerStyles.length) {
      playerStyles = rec.playerStyles.slice();
    }
    hotSeat = !!rec.hotSeat;
    selected = null;
    effects = [];
    colorTweens = [];
    particles = [];
    moveCount = 0;
    startedAt = performance.now();
    undoStack = [];
    demoMode = false;
    if (typeof Autosave !== 'undefined') Autosave.clear();
    document.getElementById("overlay").classList.add("hidden");
    computeSectors();
    // Проиграть все ходы с анимацией.
    let idx = 0;
    function step() {
      if (idx >= rec.moves.length) {
        recomputeSectors();
        updateHud();
        if (board.winner) endGame();
        return;
      }
      const m = rec.moves[idx++];
      board.turn = m.player;
      const res = Board.apply(board, m.fromQ, m.fromR, m.toQ, m.toR);
      if (res.ok) {
        for (const f of res.flipped) {
          const { x, y } = hexCenter(f.q, f.r);
          effects.push({ x, y, r: 0, maxR: size*0.8, t: 0, dur: 0.4,
                         color: "#ffe66d" });
        }
      }
      recomputeSectors();
      updateHud();
      setTimeout(step, 120);
    }
    setTimeout(step, 200);
  }

  function applyI18n() {
    const map = {
      "btn-audio": "btn.audio",
      "btn-undo": "btn.undo",
      "btn-new": "btn.new",
      "mode-select": null, // не трогаем option-тексты
    };
    // Кнопки.
    const ba = document.getElementById("btn-audio");
    if (ba && !ba.classList.contains("primary") === false) {
      // Только если не запущен звук.
    }
    // Проще: обновить только заголовки HUD.
    const labels = document.querySelectorAll(".hud-label");
    const keys = ["hud.turn","hud.score","hud.orchestra","hud.move","hud.time","hud.style"];
    labels.forEach((el, i) => {
      if (keys[i]) el.textContent = I18n.t(keys[i]);
    });
    // Кнопки.
    if (ba) ba.textContent = ba.textContent.includes("♪") ? I18n.t("btn.audio.on") : I18n.t("btn.audio");
    const bu = document.getElementById("btn-undo");
    if (bu) bu.textContent = I18n.t("btn.undo");
    const bn = document.getElementById("btn-new");
    if (bn) bn.textContent = I18n.t("btn.new");
    const tu = document.getElementById("turn");
    if (tu && !board.winner) tu.textContent = board.turn === 1 ? I18n.t("turn.you") : I18n.t("turn.ai");
    // Lang-select.
    const ls = document.getElementById("lang-select");
    if (ls) ls.value = I18n.get();
  }

  let demoMode = false;
  function startDemo() {
    demoMode = true;
    const p = Presets.get("cross-4");
    Presets.apply(p);
    document.getElementById("players-select").value = String(p.numPlayers);
    document.getElementById("preset-select").value = "cross-4";
    AI.setLevel("medium");
    newGame();
    renderPlayerStyles();
    humanTurn = true;   // для scheduleAi
    // Автозапуск.
    stepDemo();
    if (typeof Toast !== "undefined") {
      Toast.show("👁 Демо AI vs AI (medium)", { color: "#00e5ff" });
    }
  }

  function stepDemo() {
    if (!demoMode || board.winner) { demoMode = false; return; }
    const m = AI.pickMove(board, board.turn);
    if (!m) { demoMode = false; return; }
    doMove(m.fromQ, m.fromR, m.toQ, m.toR);
    updateHud();
    if (demoMode && !board.winner) {
      setTimeout(stepDemo, 350);
    }
  }

  function startDaily() {
    const c = Daily.challenge();
    // Применить пресет.
    const p = Presets.get(c.preset);
    Presets.apply(p);
    document.getElementById("players-select").value = String(p.numPlayers);
    document.getElementById("preset-select").value = c.preset;
    // Стили.
    playerStyles = [c.p1Style, c.p2Style, c.p1Style, c.p2Style];
    // ИИ.
    AI.setLevel(c.aiLevel);
    document.getElementById("ai-level").value = c.aiLevel;
    // Seed в URL (для воспроизводимости).
    const url = new URL(location.href);
    url.searchParams.set("seed", String(c.seed));
    history.replaceState(null, "", url);
    newGame();
    renderPlayerStyles();
    document.getElementById("status").textContent =
      "Партия дня " + c.date + " (seed " + c.seed + ")";
    if (typeof Toast !== "undefined") {
      Toast.show("📅 Партия дня " + c.date + " — стиль " + c.p1Style,
                 { color: "#00e5ff" });
    }
  }

  function renderLb() {
    const box = document.getElementById("lb-list");
    box.innerHTML = "";
    const list = Leaderboard.top(10);
    if (!list.length) {
      box.innerHTML = '<div style="color:var(--dim);padding:12px;text-align:center;">Пока пусто</div>';
      return;
    }
    list.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "lb-row";
      const secs = e.secs || 0;
      const tm = Math.floor(secs/60) + ":" + String(secs%60).padStart(2,"0");
      row.innerHTML =
        '<div class="rank">' + (i+1) + '</div>' +
        '<div class="name">P' + e.winner + ' · ' + e.name +
        (e.hotSeat ? " · hot" : "") + '</div>' +
        '<div class="score">' + e.score + '</div>' +
        '<div class="time">' + tm + '</div>';
      box.appendChild(row);
    });
  }

  function renderAchv() {
    const box = document.getElementById("achv-list");
    box.innerHTML = "";
    for (const a of Achv.all()) {
      const el = document.createElement("div");
      el.className = "achv-item" + (a.unlocked ? " got" : "");
      el.innerHTML = '<div class="name">' + (a.unlocked ? "🏆 " : "🔒 ") +
                     a.name + '</div><div class="desc">' + a.desc + '</div>';
      box.appendChild(el);
    }
  }

  function renderPlayerStyles() {
    const box = document.getElementById("player-styles");
    if (!box) return;
    const np = parseInt(document.getElementById("players-select").value, 10) || 2;
    box.innerHTML = "";
    for (let p = 1; p <= np; p++) {
      const wrap = document.createElement("div");
      wrap.className = "style-pick";
      const dot = document.createElement("span");
      dot.className = "dot p" + p;
      wrap.appendChild(dot);
      const sel = document.createElement("select");
      for (const st of ALL_STYLES) {
        const o = document.createElement("option");
        o.value = st;
        o.textContent = st;
        if (playerStyles[p-1] === st) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener("change", (e) => {
        playerStyles[p-1] = e.target.value;
        Settings.set("playerStyles", playerStyles.slice());
        recomputeSectors();
      });
      wrap.appendChild(sel);
      box.appendChild(wrap);
    }
  }

  function mulberry32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function screenFlash() {
    const el = document.getElementById("screen-flash");
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;   // reflow — перезапуск анимации
    el.classList.add("flash");
  }
  function fieldPunch() {
    const st = document.getElementById("stage");
    if (!st) return;
    st.classList.remove("punch");
    void st.offsetWidth;
    st.classList.add("punch");
  }

  function newGame() {
    const np = parseInt(document.getElementById("players-select").value, 10) || 2;
    board = Board.create(np);
    computeSectors();
    recomputeSectors();
    selected = null;
    humanTurn = true;
    effects = [];
    colorTweens = [];
    document.getElementById("overlay").classList.add("hidden");
    const prBox0 = document.getElementById("overlay-planet-result");
    if (prBox0) prBox0.textContent = "";
    const backBtn0 = document.getElementById("btn-planet-back");
    if (backBtn0) backBtn0.style.display = "none";
    updateHud();
    screenFlash();
    fieldPunch();
  }

  function bind() {
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("resize", () => { resize(); });
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      // Навигация клавиатурой по гексам.
      const ARROWS = {
        ArrowUp:    [{q:0,r:-1},{q:1,r:-1}],
        ArrowDown:  [{q:0,r:1},{q:-1,r:1}],
        ArrowLeft:  [{q:-1,r:0},{q:-1,r:1}],
        ArrowRight: [{q:1,r:0},{q:1,r:-1}],
      };
      if (ARROWS[e.key]) {
        e.preventDefault();
        if (!kbdCursor) {
          // Начать с первой P1-фишки.
          const c = board.cells.find(c => c.owner === Board.P1);
          if (c) kbdCursor = { q: c.q, r: c.r };
        } else {
          // Найти ближайшего соседа в направлении.
          for (const d of ARROWS[e.key]) {
            const nq = kbdCursor.q + d.q, nr = kbdCursor.r + d.r;
            const c = board.map.get(nq + "," + nr);
            if (c) { kbdCursor = { q: nq, r: nr }; break; }
          }
        }
        selected = (board.ownerAt(board, kbdCursor.q, kbdCursor.r) === Board.P1)
          ? kbdCursor : null;
        updateHud();
        return;
      }
      if (e.key === "Enter" && kbdCursor) {
        e.preventDefault();
        const c = board.map.get(kbdCursor.q + "," + kbdCursor.r);
        if (c) onClick({ clientX: 0, clientY: 0, _kbd: true, hex: c });
        return;
      }
      if (e.key === "u" || e.key === "U" || e.key === "з") {
        e.preventDefault(); undo();
      } else if (e.key === "n" || e.key === "N" || e.key === "т") {
        e.preventDefault(); newGame();
      } else if (e.key === " ") {
        e.preventDefault();
        document.getElementById("btn-audio").click();
      } else if (e.key === "m" || e.key === "M" || e.key === "ь") {
        e.preventDefault();
        const m = AudioEngine.toggleMute();
        document.getElementById("btn-mute").textContent = m ? "🔇" : "🔊";
      }
    });
    document.getElementById("btn-new").addEventListener("click", newGame);
    document.getElementById("btn-undo").addEventListener("click", undo);
    document.getElementById("mode-select").addEventListener("change", (e) => {
      hotSeat = e.target.value === "hotseat";
      newGame();
      renderPlayerStyles();
    });
    document.getElementById("players-select").addEventListener("change", () => {
      newGame();
      renderPlayerStyles();
    });
    document.getElementById("ai-level").addEventListener("change", (e) => {
      AI.setLevel(e.target.value);
      Settings.set("aiLevel", e.target.value);
    });
    document.getElementById("theme-select").addEventListener("change", (e) => {
      Themes.set(e.target.value);
      Settings.set("theme", e.target.value);
    });
    document.getElementById("pack-select").addEventListener("change", (e) => {
      SoundPacks.set(e.target.value);
    });
    document.getElementById("lang-select").addEventListener("change", (e) => {
      I18n.set(e.target.value);
      Settings.set("lang", e.target.value);
      applyI18n();
    });
    document.getElementById("preset-select").addEventListener("change", (e) => {
      const p = Presets.get(e.target.value);
      Presets.apply(p);
      document.getElementById("players-select").value = String(p.numPlayers);
      newGame();
      renderPlayerStyles();
    });
    document.getElementById("btn-achv").addEventListener("click", () => {
      renderAchv();
      document.getElementById("achv-modal").classList.remove("hidden");
    });
    // v4: кнопка «?» → легенда интерфейса.
    document.getElementById("btn-help").addEventListener("click", () => {
      if (typeof Legend !== "undefined") Legend.open();
    });
    document.getElementById("legend-close").addEventListener("click", () => {
      if (typeof Legend !== "undefined") Legend.close();
    });
    document.getElementById("btn-lb").addEventListener("click", () => {
      renderLb();
      document.getElementById("lb-modal").classList.remove("hidden");
    });
    document.getElementById("lb-close").addEventListener("click", () => {
      document.getElementById("lb-modal").classList.add("hidden");
    });
    document.getElementById("lb-clear").addEventListener("click", () => {
      if (confirm("Очистить таблицу лидеров?")) {
        Leaderboard.clear();
        renderLb();
      }
    });
    document.getElementById("btn-achv-close").addEventListener("click", () => {
      document.getElementById("achv-modal").classList.add("hidden");
    });
    document.getElementById("btn-mute").addEventListener("click", (e) => {
      const m = AudioEngine.toggleMute();
      e.target.textContent = m ? "🔇" : "🔊";
    });
    document.getElementById("volume-slider").addEventListener("input", (e) => {
      AudioEngine.setVolume(e.target.value / 100);
    });
    document.getElementById("btn-wav").addEventListener("click", async (e) => {
      const st = document.getElementById("style-name").textContent;
      const styleName = st.split(" ")[0].split("·")[0].trim();
      let styleObj = Styles.get(styleName);
      // В AI-режиме берём сгенерированный трек.
      if (musicSource === "ai" && typeof AIComposer !== "undefined" && aiSeed) {
        const aiTrack = AIComposer.compose(styleName, aiSeed);
        if (aiTrack) styleObj = aiTrack;
      }
      e.target.textContent = "...";
      try {
        const blob = await WavExport.renderTrack(styleObj, 1);
        WavExport.download(blob, "hexxagon_" + styleName);
        e.target.textContent = "🎵";
        Achv.unlock("wav_export");
      } catch (err) {
        e.target.textContent = "x";
        setTimeout(() => e.target.textContent = "🎵", 1500);
      }
    });
    // Replay: экспорт партии.
    document.getElementById("btn-daily").addEventListener("click", () => {
      startDaily();
    });
    document.getElementById("btn-demo").addEventListener("click", () => {
      startDemo();
    });
    document.getElementById("btn-editor").addEventListener("click", () => {
      PatternEditor.open("kick");
    });
    document.getElementById("btn-legend").addEventListener("click", () => {
      showLegend = !showLegend;
      document.getElementById("btn-legend").style.background =
        showLegend ? "var(--ok)" : "";
      document.getElementById("btn-legend").style.color =
        showLegend ? "#000" : "";
    });
    document.getElementById("pe-close").addEventListener("click", () => {
      PatternEditor.close();
    });
    document.getElementById("pe-play").addEventListener("click", () => {
      PatternEditor.start();
    });
    document.getElementById("pe-stop").addEventListener("click", () => {
      PatternEditor.stop();
    });
    document.getElementById("pe-apply").addEventListener("click", () => {
      PatternEditor.applyToGame();
    });
    document.getElementById("pe-export").addEventListener("click", () => {
      PatternEditor.exportSection();
    });
    document.getElementById("pe-import").addEventListener("click", () => {
      document.getElementById("pe-file").click();
    });
    document.getElementById("pe-file").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { PatternEditor.importSection(reader.result); };
      reader.readAsText(f);
      e.target.value = "";
    });
    document.getElementById("pe-channel").addEventListener("change", (e) => {
      if (PatternEditor.switchChannel) PatternEditor.switchChannel(e.target.value);
      else PatternEditor.open(e.target.value);
    });
    document.getElementById("pe-section").addEventListener("change", (e) => {
      if (PatternEditor.switchSection) PatternEditor.switchSection(parseInt(e.target.value,10));
    });
    document.getElementById("btn-share").addEventListener("click", () => {
      const url = new URL(location.href);
      url.searchParams.set("seed", String(gameSeed));
      url.searchParams.set("p", String(board.numPlayers));
      url.searchParams.set("preset", document.getElementById("preset-select").value);
      url.searchParams.set("s1", playerStyles[0]);
      url.searchParams.set("s2", playerStyles[1]);
      navigator.clipboard.writeText(url.toString()).then(() => {
        if (typeof Toast !== "undefined") Toast.show("🔗 Ссылка скопирована",
          { color: "#7d5fff" });
      }).catch(() => {
        if (typeof Toast !== "undefined") Toast.show("Ссылка: " + url.toString(),
          { color: "#7d5fff", dur: 5000 });
      });
    });
    document.getElementById("btn-export").addEventListener("click", () => {
      const rec = Replay.exportGame(board, { playerStyles, hotSeat });
      Replay.download(rec, "hexxagon_" + Date.now());
    });
    // Replay: импорт и воспроизведение.
    // Скриншот поля в PNG.
    document.getElementById("btn-shot").addEventListener("click", () => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "hexxagon_" + Date.now() + ".png";
          document.body.appendChild(a); a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          if (typeof Toast !== "undefined")
            Toast.show("📷 Скриншот сохранён", { color: "#2ecc71" });
        }, "image/png");
      } catch (e) {}
    });

    document.getElementById("btn-import").addEventListener("click", () => {
      document.getElementById("replay-file").click();
    });
    document.getElementById("replay-file").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rec = JSON.parse(reader.result);
          loadReplay(rec);
        } catch (err) {
          alert("Ошибка файла: " + err.message);
        }
      };
      reader.readAsText(f);
      e.target.value = "";
    });
    document.getElementById("btn-restart").addEventListener("click", newGame);
    const btnMenu = document.getElementById("btn-menu");
    if (btnMenu) btnMenu.addEventListener("click", () => {
      if (typeof AudioEngine !== "undefined") AudioEngine.stop();
      const gs = document.getElementById("game-screen");
      if (gs) gs.classList.add("hidden");
      if (typeof Menu !== "undefined") Menu.show();
    });
    const backBtn = document.getElementById("btn-planet-back");
    if (backBtn) backBtn.addEventListener("click", () => {
      document.getElementById("overlay").classList.add("hidden");
      const gs = document.getElementById("game-screen");
      if (gs) gs.classList.add("hidden");
      if (typeof TechView !== "undefined") TechView.show();
    });

    // Титульный экран.
    function hideTitle() {
      const ts = document.getElementById("title-screen");
      if (ts) ts.classList.add("hidden");
    }
    function showTitle() {
      const ts = document.getElementById("title-screen");
      if (ts) ts.classList.remove("hidden");
    }
    // При повторном запуске (флаг в localStorage) — скрыть сразу.
    // При первом заходе — оставить титульник видимым.
    const TITLE_KEY = "hexxagon_v2_title_seen";
    if (localStorage.getItem(TITLE_KEY)) {
      setTimeout(hideTitle, 50);
    }
    // v3: лор-заставка при первом заходе (вместо/перед титульником).
    if (typeof Lore !== "undefined" && Lore.shouldShow()) {
      setTimeout(() => { Lore.open(); }, 200);
    }
    const loreNext = document.getElementById("lore-next");
    if (loreNext) loreNext.addEventListener("click", () => Lore.next());
    const loreSkip = document.getElementById("lore-skip");
    if (loreSkip) loreSkip.addEventListener("click", () => Lore.close());
    window.__showLore = () => { if (typeof Lore !== "undefined") Lore.reset(); Lore.open(); };
    function markTitleSeen() { localStorage.setItem(TITLE_KEY, "1"); }
    const ts = document.getElementById("title-start");
    if (ts) ts.addEventListener("click", () => {
      hideTitle();
      markTitleSeen();
      if (AudioEngine.isReady && !AudioEngine.isRunning()) {
        // Автозапуск звука после клика.
        document.getElementById("btn-audio").click();
      }
    });
    const tc = document.getElementById("title-continue");
    if (tc) tc.addEventListener("click", () => {
      hideTitle();
      markTitleSeen();
      if (typeof Autosave !== "undefined") Autosave.load && Autosave.load();
    });
    const tt = document.getElementById("title-tutorial");
    if (tt) tt.addEventListener("click", () => {
      hideTitle();
      markTitleSeen();
      if (typeof Tutorial !== "undefined") Tutorial.start();
    });
    const td = document.getElementById("title-demo");
    if (td) td.addEventListener("click", () => {
      hideTitle();
      markTitleSeen();
      startDemo();
    });
    window.__showTitle = showTitle;

    // --- Tutorial: обработчики кнопок "Пропустить" / "Далее" ---
    var btnTutSkip = document.getElementById("tut-skip");
    if (btnTutSkip) btnTutSkip.addEventListener("click", function () {
      Tutorial.close();
    });
    var btnTutNext = document.getElementById("tut-next");
    if (btnTutNext) btnTutNext.addEventListener("click", function () {
      Tutorial.next();
    });
    document.getElementById("btn-audio").addEventListener("click", async (e) => {
      await AudioEngine.resume();
      const st = document.getElementById("style-select").value;
      if (window.__applyMusicSource) window.__applyMusicSource();
      else AudioEngine.setStyle(Styles.get(st));
      AudioEngine.start();
      recomputeSectors();
      AudioEngine.syncGains();
      e.target.textContent = "♪ звук идёт";
      e.target.classList.remove("primary");
      document.getElementById("style-name").textContent = st;
      updateHud();
      // Ачивка "все стили" - счётчик в localStorage.
      try {
        const key = "hexxagon_styles_seen";
        const seen = JSON.parse(localStorage.getItem(key) || "[]");
        if (!seen.includes(st)) seen.push(st);
        localStorage.setItem(key, JSON.stringify(seen));
        if (seen.length >= 7) Achv.unlock("all_styles");
      } catch (e) {}
    });

    document.getElementById("style-select").addEventListener("change", (e) => {
      const st = e.target.value;
      document.getElementById("style-name").textContent = st;
      if (AudioEngine.isRunning && AudioEngine.isRunning()) {
        applyMusicSource();
      }
    });

    // --- Источник музыки: авторская / ИИ-импровизация ---
    var musicSource = "author";
    var aiSeed = 0;
    function applyMusicSource() {
      const st = document.getElementById("style-select").value;
      // v5: авторский трек-оммаж, если выбран.
      if (musicSource === "author" && window.__applyAuthorTrack &&
          window.__applyAuthorTrack()) return;
      if (musicSource === "ai" && typeof AIComposer !== "undefined") {
        if (!aiSeed) aiSeed = Math.floor(Math.random() * 1e9);
        const track = AIComposer.compose(st, aiSeed);
        if (track) {
          AudioEngine.setStyle(track);
          document.getElementById("style-name").textContent = st + " · AI#" + aiSeed;
          return;
        }
      }
      AudioEngine.setStyle(Styles.get(st));
      document.getElementById("style-name").textContent = st;
    }
    window.__applyMusicSource = applyMusicSource;

    // v5: авторский трек-оммаж.
    function fillTrackList() {
      const sel = document.getElementById("track-select");
      if (!sel || typeof AuthorTracks === "undefined") return;
      const st = document.getElementById("style-select").value;
      const ids = AuthorTracks.forStyle(st);
      sel.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = ""; opt0.textContent = "— трек стиля —";
      sel.appendChild(opt0);
      for (const id of ids) {
        const tr = AuthorTracks.get(id);
        const o = document.createElement("option");
        o.value = id; o.textContent = tr.about || id;
        sel.appendChild(o);
      }
    }
    function applyAuthorTrack() {
      const sel = document.getElementById("track-select");
      if (!sel || !sel.value) return false;
      const tr = AuthorTracks.get(sel.value);
      if (!tr) return false;
      AudioEngine.setStyle(tr);
      document.getElementById("style-name").textContent = tr.about || tr.name;
      return true;
    }
    window.__applyAuthorTrack = applyAuthorTrack;
    document.getElementById("music-source").addEventListener("change", (e) => {
      musicSource = e.target.value;
      document.getElementById("btn-reseed").style.display =
        musicSource === "ai" ? "" : "none";
      // v5: показать селектор авторских треков.
      const tsel = document.getElementById("track-select");
      if (tsel) {
        tsel.style.display = musicSource === "author" ? "" : "none";
        if (musicSource === "author") fillTrackList();
        else tsel.value = "";
      }
      if (musicSource === "ai") aiSeed = Math.floor(Math.random() * 1e9);
      if (AudioEngine.isRunning && AudioEngine.isRunning()) applyMusicSource();
    });
    // v5: смена трека-оммажа.
    document.getElementById("track-select").addEventListener("change", () => {
      if (AudioEngine.isRunning && AudioEngine.isRunning()) applyAuthorTrack();
    });
    // v5: смена стиля — обновить список треков.
    document.getElementById("style-select").addEventListener("change", () => {
      fillTrackList();
    });
    document.getElementById("btn-reseed").addEventListener("click", () => {
      aiSeed = Math.floor(Math.random() * 1e9);
      if (AudioEngine.isRunning && AudioEngine.isRunning()) applyMusicSource();
    });
  }

  function initSeed() {
    const params = new URLSearchParams(location.search);
    const s = parseInt(params.get("seed") || "0", 10);
    gameSeed = s || Math.floor(Math.random() * 1e9);
    // Настройки из URL (share-ссылка).
    const preset = params.get("preset");
    if (preset) {
      const p = Presets.get(preset);
      Presets.apply(p);
      document.getElementById("preset-select").value = preset;
    }
    const np = parseInt(params.get("p") || "0", 10);
    if (np >= 2 && np <= 4) {
      document.getElementById("players-select").value = String(np);
    }
    const s1 = params.get("s1"), s2 = params.get("s2");
    if (s1) playerStyles[0] = s1;
    if (s2) playerStyles[1] = s2;
    // Показать seed в статусе.
    document.getElementById("status").textContent = "seed: " + gameSeed;
  }

  // Разблокировка AudioContext по первому клику/тапу/клавише.
  function bindAudioUnlock() {
    const unlock = () => {
      if (typeof AudioEngine === "undefined") return;
      AudioEngine.resume();
      // Если меню открыто и звук был разбужен — включить тему меню.
      const menu = document.getElementById("menu-screen");
      if (menu && !menu.classList.contains("hidden") &&
          typeof Menu !== "undefined" && Menu.playTheme) {
        Menu.playTheme();
      }
    };
    ["click","touchstart","keydown"].forEach(ev =>
      window.addEventListener(ev, unlock, { once: false, passive: true }));
  }

  function init() {
    canvas = document.getElementById("board");
    ctx2d = canvas.getContext("2d");
    initSeed();
    // Разблокировка аудио по первому жесту (autoplay-политика Chrome).
    bindAudioUnlock();
    // Восстановить пользовательские стили.
    if (typeof UserStyles !== "undefined") UserStyles.restore();
    // Применить настройки.
    try {
      const cfg = Settings.load();
      // v2: одноразовая миграция на SNES-тему (16-бит редизайн).
      const V2KEY = "hexxagon_v2_theme_migrated";
      if (!localStorage.getItem(V2KEY)) {
        if (!cfg.theme || ["neon","classic","mono","phosphor"].includes(cfg.theme)) {
          cfg.theme = "snes";
          Settings.set("theme", "snes");
        }
        localStorage.setItem(V2KEY, "1");
      }
      if (cfg.theme) { Themes.set(cfg.theme);
        document.getElementById("theme-select").value = cfg.theme; }
      if (cfg.lang) { I18n.set(cfg.lang); }
      if (cfg.aiLevel) { AI.setLevel(cfg.aiLevel);
        document.getElementById("ai-level").value = cfg.aiLevel; }
      if (cfg.preset) {
        const p = Presets.get(cfg.preset);
        Presets.apply(p);
        document.getElementById("players-select").value = String(p.numPlayers);
        document.getElementById("preset-select").value = cfg.preset;
      }
      if (cfg.playerStyles) playerStyles = cfg.playerStyles.slice();
    } catch (e) {}
    newGame();
    resize();
    bind();
    renderPlayerStyles();
    applyI18n();
    // v6: инициализация экранов.
    if (typeof Menu !== "undefined") Menu.init();
    if (typeof TechView !== "undefined") TechView.init();
    if (typeof Tracker !== "undefined") Tracker.init();
    if (typeof SettingsScreen !== "undefined") SettingsScreen.init();

    if (typeof Toast !== "undefined") {
      setTimeout(() => Toast.show("hexxagon_music · серия 6D",
        { color: "#2ecc71", dur: 3500 }), 300);
    }
    if (Tutorial.shouldShow()) { setTimeout(() => Tutorial.start(), 500); }
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  return {
    init, newGame, resize, renderPlayerStyles,
    // v6: сюжетные точки входа.
    startPlanet: function(planet, suit) {
      if (typeof Menu !== "undefined") Menu.hide();
      if (typeof TechView !== "undefined") TechView.hide();
      const gs = document.getElementById("game-screen");
      if (gs) gs.classList.remove("hidden");
      // Скафандр = звуковой пак.
      if (typeof SoundPacks !== "undefined" && suit) {
        SoundPacks.set(suit);
        const pk = document.getElementById("pack-select");
        if (pk) pk.value = suit;
      }
      // Настройки партии от планеты.
      const ps = document.getElementById("players-select");
      if (ps) ps.value = "2";
      const ms = document.getElementById("mode-select");
      if (ms) ms.value = "vs-ai";
      const al = document.getElementById("ai-level");
      if (al) al.value = planet.ai || "medium";
      if (typeof AI !== "undefined") AI.setLevel(planet.ai || "medium");
      const ss = document.getElementById("style-select");
      if (ss) ss.value = planet.style;
      newGame();
      window.__currentPlanet = planet.id;
      // Запуск музыки планеты: случайный авторский трек этого стиля.
      if (typeof AudioEngine !== "undefined") {
        let track = null;
        if (typeof AuthorTracks !== "undefined") {
          // 1. Приоритет: треки, отмеченные "в игре" для этого стиля.
          let ids = [];
          if (typeof TrackerSettings !== "undefined" && TrackerSettings.inGameTracks) {
            const chosen = TrackerSettings.inGameTracks();
            ids = chosen.filter(id => {
              const tr = AuthorTracks.get(id);
              return tr && tr.style === planet.style;
            });
          }
          // 2. Иначе — все авторские этого стиля.
          if (!ids.length) ids = AuthorTracks.forStyle(planet.style);
          if (ids.length) {
            const pick = ids[Math.floor(Math.random() * ids.length)];
            track = AuthorTracks.get(pick);
            window.__currentTrack = pick;
            // Применить сохранённый BPM, если задан.
            if (typeof TrackerSettings !== "undefined" && TrackerSettings.settingsFor) {
              const cfg = TrackerSettings.settingsFor(pick);
              if (cfg && cfg.bpm) track = Object.assign({}, track, { bpm: cfg.bpm });
            }
          }
        }
        if (!track && typeof Styles !== "undefined") {
          track = Styles.get(planet.style);
        }
        if (track) AudioEngine.setStyle(track);
        // НЕ дёргаем btn-audio: его async-обработчик через
        // applyMusicSource() перезаписывает трек на Styles (синтез).
        AudioEngine.resume();
        for (const ch of AudioEngine.CHANNELS) {
          AudioEngine.setChannel(ch, { on: ch !== "pad", density: 1.0 });
        }
        if (AudioEngine.syncGains) AudioEngine.syncGains();
        if (!AudioEngine.isRunning()) AudioEngine.start();
        // Обновить подпись стиля.
        const sn = document.getElementById("style-name");
        if (sn && window.__currentTrack) sn.textContent = window.__currentTrack;
      }
    },
    startQuick: function() {
      if (typeof Menu !== "undefined") Menu.hide();
      if (typeof TechView !== "undefined") TechView.hide();
      const gs = document.getElementById("game-screen");
      if (gs) gs.classList.remove("hidden");
      newGame();
      window.__currentPlanet = null;
    },
    start2P: function() {
      if (typeof Menu !== "undefined") Menu.hide();
      if (typeof TechView !== "undefined") TechView.hide();
      const gs = document.getElementById("game-screen");
      if (gs) gs.classList.remove("hidden");
      const ms = document.getElementById("mode-select");
      if (ms) ms.value = "hotseat";
      newGame();
      window.__currentPlanet = null;
    },
    // Debug-API для sandbox-тестов.
    __debug: {
      board: () => board,
      ui: () => ({ hotSeat, humanTurn, playerStyles: playerStyles.slice(),
                   moveCount, selected, soloChannel, demoMode }),
      click: (q, r) => { const c = board.map.get(q + "," + r);
                         if (c) onClick({ clientX: 0, clientY: 0, _kbd: true, hex: c });
                         return !!c; },
      movesFrom: (q, r) => Board.movesFrom(board, q, r),
      setSolo: (ch) => { soloChannel = ch; applySolo(); updateHud(); },
    },
  };
})();

window.addEventListener("DOMContentLoaded", () => {
  // v6: сначала меню.
  if (typeof Menu !== "undefined") setTimeout(() => Menu.show(), 100);
  Game.init();
  if (typeof Icons !== "undefined") Icons.applyAll();
});
