/* launchpad_live.js - LAUNCHPAD (живой 8770). v3: компакт. */
(function () {
  "use strict";
  var API_BASE = "";
  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var EXTRA = ["doh", "mailbot", "rebirth"];
  var INFO = ["lada"];
  var SELF = "server";

  var busyRun = false, busyStop = false;
  var lastAnyOn = false;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return String(n).padStart(2, "0"); }

  var logEl;
  function lpLog(msg) {
    if (!logEl) return;
    var t = new Date().toTimeString().slice(0, 8);
    logEl.innerHTML += "[" + t + "] " + msg + "<br>";
    logEl.scrollTop = logEl.scrollHeight;
  }

  function api(method, path, body) {
    var opt = { method: method, cache: "no-store" };
    if (body) { opt.headers = { "Content-Type": "application/json" }; opt.body = JSON.stringify(body); }
    return fetch(API_BASE + path, opt)
      .then(function (r) { return r.json(); })
      .then(function (j) { lpLog(path + " -> " + (j.ok ? "OK" : "FAIL")); return j; })
      .catch(function (e) { lpLog("api err " + path + ": " + e.message); throw e; });
  }

  function build() {
    var svg = $("lpMnemo");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    function el(tag, attrs) { var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

    var run = el("g", { class: "lp-run", id: "lp-g-run" });
    run.appendChild(el("circle", { cx: 72, cy: 66, r: 34, class: "lp-runc", id: "lp-runc" }));
    var rt = el("text", { x: 72, y: 73, "text-anchor": "middle", class: "lp-runt" });
    rt.textContent = "RUN"; run.appendChild(rt);
    run.addEventListener("click", function () {
      busyRun = true; updateRunLamp();
      var act = lastAnyOn ? "stop" : "boot";
      api("POST", "/api/" + act, { target: "all" }).then(function () {
        setTimeout(function () { busyRun = false; poll(); }, 1500);
      }).catch(function () { busyRun = false; updateRunLamp(); });
    });
    svg.appendChild(run);

    var stopG = el("g", { class: "lp-stopg", id: "lp-g-stop" });
    stopG.appendChild(el("rect", { x: 28, y: 118, width: 92, height: 34, rx: 4,
      class: "lp-stopbox", id: "lp-stopbox" }));
    var st = el("text", { x: 74, y: 140, "text-anchor": "middle", class: "lp-stopt", id: "lp-stopt" });
    st.textContent = "СТОП ВСЁ"; stopG.appendChild(st);
    stopG.addEventListener("click", function () {
      if (!lastAnyOn || busyStop) return;
      busyStop = true; updateStopLamp();
      api("POST", "/api/stop", { target: "all" }).then(function () {
        setTimeout(function () { busyStop = false; poll(); }, 1500);
      }).catch(function () { busyStop = false; updateStopLamp(); });
    });
    svg.appendChild(stopG);

    svg.appendChild(block(400, 12, 270, 54, SELF, "СЕРВЕР (пилот)", "8770", true));

    for (var i = 0; i < LETTERS.length; i++) {
      var L = LETTERS[i], y = 78 + i * 50;
      svg.appendChild(block(150, y, 250, 44, "agent:" + L, "AGENT " + L, "", false));
      svg.appendChild(block(740, y, 250, 44, "chrome:" + L, "CHROME " + L, "", false));
      svg.appendChild(el("line", { x1: 275, y1: 66, x2: 275, y2: y + 22, stroke: "#1b4a1b", "stroke-width": 1 }));
      svg.appendChild(el("line", { x1: 400, y1: y + 22, x2: 740, y2: y + 22, stroke: "#1b4a1b", "stroke-width": 1 }));
    }

    var extras = EXTRA.concat(INFO);
    for (var j = 0; j < extras.length; j++) {
      var key = extras[j];
      var col = j % 2, row = Math.floor(j / 2);
      var ex = 270 + col * 270;
      var ey = 384 + row * 52;
      var infoOnly = INFO.indexOf(key) >= 0;
      svg.appendChild(block(ex, ey, 240, 44, key, key.toUpperCase(), "", false, infoOnly));
    }

    svg.appendChild(el("line", { x1: 106, y1: 66, x2: 400, y2: 40, stroke: "#3a1a1a", "stroke-width": 2 }));
  }

  function block(x, y, w, h, key, title, port, isSelf, infoOnly) {
    var NS = "http://www.w3.org/2000/svg";
    function el(tag, attrs) { var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    var safe = key.replace(":", "-");
    var g = el("g", { class: "lp-blk off", id: "lp-g-" + safe });
    g.appendChild(el("rect", { x: x, y: y, width: w, height: h, rx: 5, class: "lp-box" }));
    g.appendChild(el("circle", { cx: x + 16, cy: y + 16, r: 6, class: "lp-lamp off", id: "lp-lamp-" + safe }));
    var nm = el("text", { x: x + 30, y: y + 21, class: "lp-nm" }); nm.textContent = title; g.appendChild(nm);
    if (port) {
      var pt = el("text", { x: x + w - 8, y: y + 21, "text-anchor": "end", class: "lp-pt" });
      pt.textContent = port; g.appendChild(pt);
    }
    if (infoOnly) {
      var it = el("text", { x: x + 30, y: y + 38, class: "lp-pt" }); it.textContent = "(инфо)"; g.appendChild(it);
      return g;
    }
    var bw = 72, gap = 3, by = y + h - 18, bx = x + 6;
    var btns = [["СТАРТ", "boot"], ["СТОП", "stop"], ["РЕБУТ", "restart"]];
    for (var i = 0; i < btns.length; i++) {
      var bg = el("g", {});
      var dis = isSelf && (btns[i][1] === "boot" || btns[i][1] === "restart");
      bg.appendChild(el("rect", { x: bx + i * (bw + gap), y: by, width: bw, height: 15, rx: 3,
        class: "lp-btn" + (dis ? " dis" : "") }));
      var bt = el("text", { x: bx + i * (bw + gap) + bw / 2, y: by + 11, class: "lp-btnt" });
      bt.textContent = btns[i][0]; bg.appendChild(bt);
      (function (act, disabled) {
        if (disabled) return;
        bg.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (isSelf && act === "stop") {
            if (!confirm("ОСТАНОВИТЬ СЕРВЕР 8770? Панель умрёт. Точно?")) return;
          }
          api("POST", "/api/" + act, { target: key });
        });
      })(btns[i][1], dis);
      g.appendChild(bg);
    }
    return g;
  }

  function updateRunLamp() {
    var c = $("lp-runc"); if (!c) return;
    c.classList.remove("run-ok", "run-busy", "run-off");
    if (busyRun) c.classList.add("run-busy");
    else if (lastAnyOn) c.classList.add("run-ok");
    else c.classList.add("run-off");
  }
  function updateStopLamp() {
    var b = $("lp-stopbox"), t = $("lp-stopt"); if (!b) return;
    b.classList.remove("stop-on", "stop-busy", "stop-idle");
    if (t) t.classList.remove("stop-busy-t");
    if (busyStop) { b.classList.add("stop-busy"); if (t) t.classList.add("stop-busy-t"); }
    else if (lastAnyOn) b.classList.add("stop-on");
    else b.classList.add("stop-idle");
  }

  function render(st) {
    var blocks = (st && st.blocks) || {};
    var el = $("lpState"); if (el) el.textContent = "блоков: " + Object.keys(blocks).length;
    var anyOn = false;
    for (var k in blocks) {
      var b = blocks[k], safe = k.replace(":", "-");
      var g = $("lp-g-" + safe), lamp = $("lp-lamp-" + safe);
      if (k !== "server" && b.on) anyOn = true;
      if (!g) continue;
      g.classList.toggle("on", !!b.on);
      g.classList.toggle("off", !b.on);
      lamp.classList.toggle("on", !!b.on);
      lamp.classList.toggle("off", !b.on);
      lamp.classList.toggle("ping", !!b.ping || !!b.tcp || !!b.cdp_ok);
    }
    lastAnyOn = anyOn;
    updateRunLamp();
    updateStopLamp();
  }

  function poll() {
    fetch(API_BASE + "/api/launchpad/status", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) { var n = $("lpNet"); if (n) n.textContent = "OK"; render(j); })
      .catch(function () { var n = $("lpNet"); if (n) n.textContent = "НЕТ"; });
  }

  function clock() {
    var c = $("lpClk"); if (!c) return;
    var d = new Date();
    c.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function init() {
    logEl = $("lpLog");
    if (!$("lpMnemo")) return;
    build();
    poll();
    setInterval(poll, 2000);
    clock();
    setInterval(clock, 1000);
  }
  window.addEventListener("DOMContentLoaded", init);
})();
