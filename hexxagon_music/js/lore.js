// lore.js (v3) - лор и анимированная заставка.
// Показывает историю мира Hexxagon Music перед игрой.
// 5 слайдов с пиксельными сценами (рисуются на canvas), текст, скип.

const Lore = (() => {
  const SLIDES = [
    {
      title: "ДАВНЫМ-ДАВНО...",
      text: "В глубине созвездия Лиры, там, где звёздная пыль поёт " +
            "на разных частотах, светила молодая звезда. Люди назвали " +
            "её Music Star — потому что вокруг неё рождалась музыка.",
      scene: "orchestra",
    },
    {
      title: "ДЕСЯТЬ ПЛАНЕТ",
      text: "У Music Star было десять планет. На каждой — свой народ, " +
            "свой характер и своя музыка. Дальние пели медленный блюз " +
            "под дождём, ближние — жгли ретровейв у самой короны звезды.",
      scene: "duel",
    },
    {
      title: "ВЕЛИКИЙ ОРКЕСТР",
      text: "Все десять планет соединялись в один Великий Оркестр. " +
            "Семь голосов — kick, snare, hat, bass, pad, lead и arp — " +
            "звучали в идеальном согласии. Это была эпоха Полной Полифонии.",
      scene: "orchestra",
    },
    {
      title: "ПРИШЁЛ SILENCE",
      text: "Но из мрака между галактиками приполз Silence Monster — " +
            "пожиратель звука. Он не убивал. Он делал хуже: он забирал " +
            "музыку, оставляя после себя звенящую, мёртвую тишину.",
      scene: "silent",
    },
    {
      title: "ТИШИНА",
      text: "Одна за другой планеты замолкали. Инструменты были " +
            "вырваны из рук, разбиты на семь секторов и рассеяны " +
            "по гексагональным полям. Оркестр распался на осколки.",
      scene: "silent",
    },
    {
      title: "ЗОВ ОБ ОРКЕСТРЕ",
      text: "Говорят, где-то в дальней гавани ещё жив старый пилот. " +
            "Тот, кто помнит, как звучала Полная Полифония. Тот, кто " +
            "верит, что музыку можно собрать обратно — сектор за сектором.",
      scene: "capture",
    },
    {
      title: "ТВОЙ КОРАБЛЬ",
      text: "Это ты. Твой корабль — последняя надежда Music Star. " +
            "На борту — рубка, карта десяти планет и упрямая вера: " +
            "каждый захваченный сектор вернёт один голос оркестру.",
      scene: "orchestra",
    },
    {
      title: "ПРАВИЛА БОЯ",
      text: "Правила просты. Шаг — и твоя фишка клонируется рядом. " +
            "Прыжок — и она летит дальше. Всё, что окружает точку " +
            "приземления, переходит под твой стиль. Сектор звучит " +
            "голосом того, кто им владеет.",
      scene: "capture",
    },
    {
      title: "ДОРОГА К ЗВЕЗДЕ",
      text: "Иди от дальних, тихих планет — к горячей Плазме у самой " +
            "звезды. Чем ближе к Music Star, тем быстрее бит и тем " +
            "сильнее Silence. Но и награда — ярче. Освободи все десять.",
      scene: "duel",
    },
    {
      title: "ПОЛНАЯ ПОЛИФОНИЯ",
      text: "Когда падёт последняя тишина, все семь дорожек сольются " +
            "в единый финальный микс. Music Star вспыхнет звуком. " +
            "История ждёт своего пилота. Лети. Играй. Освобождай.",
      scene: "fullmix",
    },
  ];

  let idx = 0;
  let active = false;
  let canvas = null, ctx2d = null;
  let rafId = null;
  let startTime = 0;
  let particles = [];
  let viewSlides = null;    // текущий набор слайдов (по умолчанию все)
  let onCloseCb = null;     // вызвать после закрытия
  let onSlideCb = null;     // вызвать при показе слайда (idx, total)

  const KEY = "hexxagon_v3_lore_seen";

  function shouldShow() { return !localStorage.getItem(KEY); }
  function markSeen() { localStorage.setItem(KEY, "1"); }

  // --- Сцены (пиксельные) ---
  function drawScene(scene, now, t) {
    const w = canvas.width, h = canvas.height;
    ctx2d.fillStyle = "#04060f";
    ctx2d.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const pulse = 0.6 + 0.4 * Math.sin(now * 0.002);
    if (scene === "silent") {
      // Одинокий гекс, потухший.
      drawHex(cx, cy, 120, "rgba(40,50,80," + pulse + ")", null);
      ctx2d.globalAlpha = 0.3;
      for (let i = 0; i < 20; i++) {
        const a = i * 0.314 + now * 0.0003;
        const r = 180 + Math.sin(i) * 30;
        drawPixel(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, "#2a3a5f");
      }
      ctx2d.globalAlpha = 1;
    } else if (scene === "orchestra") {
      // 7 гексов по кругу, каждый свой цвет.
      const colors = ["#2ecc71","#ff7840","#ffe66d","#7d5fff","#00e5ff","#ff2e97","#46cc71"];
      for (let i = 0; i < 7; i++) {
        const a = i * (Math.PI * 2 / 7) - Math.PI / 2 + now * 0.0004;
        const r = 150;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const on = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.003 + i));
        drawHex(x, y, 34, colors[i], on);
      }
    } else if (scene === "duel") {
      // 4 угла — 4 цвета.
      const corners = [
        { x: cx - 180, y: cy - 130, c: "#ff2e97" },
        { x: cx + 180, y: cy - 130, c: "#00e5ff" },
        { x: cx - 180, y: cy + 130, c: "#f4c22b" },
        { x: cx + 180, y: cy + 130, c: "#2ecc71" },
      ];
      for (const k of corners) drawHex(k.x, k.y, 40, k.c, 0.7 + 0.3 * Math.sin(now * 0.004));
      // Центральный гекс.
      drawHex(cx, cy, 50, "#5a7ac0", 0.5);
    } else if (scene === "capture") {
      // Гекс в центре + волна захвата.
      drawHex(cx, cy, 60, "#ff2e97", 1);
      for (let ring = 0; ring < 3; ring++) {
        const rr = ((now * 0.15 + ring * 60) % 240);
        ctx2d.globalAlpha = 0.4 * (1 - rr / 240);
        ctx2d.strokeStyle = "#ffe66d";
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx2d.stroke();
      }
      ctx2d.globalAlpha = 1;
    } else if (scene === "fullmix") {
      // Много гексов, все светятся.
      const colors = ["#ff2e97","#00e5ff","#f4c22b","#2ecc71","#7d5fff","#ff7840"];
      for (let i = 0; i < 30; i++) {
        const a = i * 2.4 + now * 0.0005;
        const r = 60 + (i % 5) * 40;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.8;
        const c = colors[i % colors.length];
        const on = 0.5 + 0.5 * Math.sin(now * 0.004 + i);
        drawHex(x, y, 22, c, on);
      }
      // Центр — белый.
      drawHex(cx, cy, 40, "#ffffff", 1);
    }
  }

  function drawHex(x, y, r, color, alpha) {
    const a = alpha != null ? alpha : 1;
    ctx2d.globalAlpha = a;
    ctx2d.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI / 6 + i * Math.PI / 3;
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r;
      if (i === 0) ctx2d.moveTo(px, py);
      else ctx2d.lineTo(px, py);
    }
    ctx2d.closePath();
    ctx2d.fillStyle = color;
    ctx2d.globalAlpha = a * 0.35;
    ctx2d.fill();
    ctx2d.globalAlpha = a;
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = 3;
    ctx2d.stroke();
    ctx2d.globalAlpha = 1;
  }

  function drawPixel(x, y, s, color) {
    ctx2d.fillStyle = color;
    ctx2d.fillRect(Math.round(x), Math.round(y), s, s);
  }

  function render(now) {
    if (!active) return;
    const t = (now - startTime) / 1000;
    drawScene(curSlides()[idx].scene, now, t);
    rafId = requestAnimationFrame(render);
  }

  function curSlides() { return viewSlides || SLIDES; }

  function showSlide() {
    const list = curSlides();
    const s = list[idx];
    document.getElementById("lore-title").textContent = s.title;
    document.getElementById("lore-text").textContent = s.text;
    const indicator = document.getElementById("lore-dots");
    indicator.innerHTML = "";
    for (let i = 0; i < list.length; i++) {
      const d = document.createElement("span");
      d.className = "lore-dot" + (i === idx ? " on" : "");
      indicator.appendChild(d);
    }
    document.getElementById("lore-next").textContent =
      idx === list.length - 1 ? "ИГРАТЬ →" : "ДАЛЕЕ →";
    if (typeof onSlideCb === "function") onSlideCb(idx, list.length);
  }

  function next() {
    if (idx < curSlides().length - 1) { idx++; showSlide(); }
    else { close(); }
  }

  function open(opts) {
    opts = opts || {};
    viewSlides = opts.slides || null;
    onCloseCb = opts.onClose || null;
    onSlideCb = opts.onSlide || null;
    const el = document.getElementById("lore-screen");
    if (!el) return;
    canvas = document.getElementById("lore-canvas");
    if (canvas) {
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 320;
      ctx2d = canvas.getContext("2d");
    }
    idx = 0;
    active = true;
    startTime = performance.now();
    showSlide();
    el.classList.remove("hidden");
    rafId = requestAnimationFrame(render);
  }

  function close() {
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const el = document.getElementById("lore-screen");
    if (el) el.classList.add("hidden");
    markSeen();
    // Разбудить звук.
    const btn = document.getElementById("btn-audio");
    if (btn && !AudioEngine.isRunning()) btn.click();
    const cb = onCloseCb;
    onCloseCb = null;
    onSlideCb = null;
    viewSlides = null;
    if (typeof cb === "function") cb();
  }

  // Слайды-вводная (для сюжетного режима).
  function introSlides() {
    // Полная вводная история (до "Правил боя").
    return SLIDES.slice(0, 9);
  }

  function reset() { localStorage.removeItem(KEY); }

  return { SLIDES, open, close, next, shouldShow, reset, markSeen,
           introSlides };
})();