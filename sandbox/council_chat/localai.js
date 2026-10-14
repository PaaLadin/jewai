/* localai.js - вкладка Локальный AI в панели оператора.
   Чат с local_ai + индикаторы + параметры.
   Все запросы идут через сервер 8770 (прокси), без CORS.
*/
(function(){
  "use strict";
  const $ = (id) => document.getElementById(id);
  const feed = $("laFeed");
  const input = $("laInput");
  const sendBtn = $("laSend");
  if (!feed || !input) return;

  const state = { temp: 0.3, max: 512, tools: {} };

  const LS_KEY = "localai_history_v1";
  function loadHistory(){
    try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; }
    catch(e){ return []; }
  }
  function saveHistory(arr){
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-200))); } catch(e){}
  }
  function pushHistory(role, text){
    const h = loadHistory();
    h.push({role: role, text: text, ts: Date.now()});
    saveHistory(h);
  }

  function renderRole(role, text, persist){
    if (persist !== false) pushHistory(role, text);
    const d = document.createElement("div");
    d.className = "la-msg la-" + role;
    const who = document.createElement("div");
    who.className = "la-who";
    who.textContent = role === "user" ? "\u041e\u041f\u0415\u0420\u0410\u0422\u041e\u0420" : "LOCAL_AI";
    const body = document.createElement("div");
    body.className = "la-body";
    body.textContent = text;
    d.appendChild(who); d.appendChild(body);
    feed.appendChild(d);
    feed.scrollTop = feed.scrollHeight;
  }

  function renderSystem(text, persist){
    if (persist !== false) pushHistory("sys", text);
    const d = document.createElement("div");
    d.className = "la-msg la-sys";
    d.textContent = text;
    feed.appendChild(d);
    feed.scrollTop = feed.scrollHeight;
  }

  async function send(){
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    renderRole("user", text);
    const wait = document.createElement("div");
    wait.className = "la-msg la-sys";
    wait.textContent = "...\u0434\u0443\u043c\u0430\u044e";
    feed.appendChild(wait);
    feed.scrollTop = feed.scrollHeight;
    try {
      const r = await fetch("/api/localai/query", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text: text, temperature: state.temp, max_tokens: state.max, tools: state.tools})
      });
      const j = await r.json();
      wait.remove();
      if (j.ok) renderRole("ai", j.answer);
      else renderSystem("\u041e\u0428\u0418\u0411\u041a\u0410: " + (j.error || "unknown"));
    } catch (e) {
      wait.remove();
      renderSystem("\u041e\u0428\u0418\u0411\u041a\u0410 \u0421\u0412\u042f\u0417\u0418: " + e);
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  /* ===== Параметры ===== */
  const tempEl = $("laTemp"), tempVal = $("laTempVal");
  if (tempEl) tempEl.addEventListener("input", () => {
    state.temp = parseFloat(tempEl.value);
    if (tempVal) tempVal.textContent = state.temp.toFixed(1);
  });
  const maxEl = $("laMax"), maxVal = $("laMaxVal");
  if (maxEl) maxEl.addEventListener("input", () => {
    state.max = parseInt(maxEl.value, 10);
    if (maxVal) maxVal.textContent = state.max;
  });

  /* ===== Tools ===== */
  document.querySelectorAll(".laTool").forEach((cb) => {
    state.tools[cb.dataset.tool] = cb.checked;
    cb.addEventListener("change", () => { state.tools[cb.dataset.tool] = cb.checked; });
  });

  /* ===== Индикаторы ===== */
  function lamp(id, on){
    const el = $(id);
    if (!el) return;
    el.classList.toggle("on", !!on);
    el.classList.toggle("off", !on);
  }

  async function refreshStatus(){
    try {
      const r = await fetch("/api/localai/status", {cache: "no-store"});
      const j = await r.json();
      lamp("laLampLlama", j.llama);
      lamp("laLampSrv", j.server);
      lamp("laLampModel", j.model);
      lamp("laLampRag", j.rag);
    } catch (e) {
      lamp("laLampLlama", false);
      lamp("laLampSrv", false);
      lamp("laLampModel", false);
      lamp("laLampRag", false);
    }
  }
  setInterval(refreshStatus, 5000);

  /* ===== Управление ===== */
  const rl = $("laRestartLlama");
  if (rl) rl.addEventListener("click", async () => {
    renderSystem("\u041f\u0415\u0420\u0415\u0417\u0410\u041f\u0423\u0421\u041a LLAMA...");
    try { const r = await fetch("/api/localai/restart_llama", {method:"POST"}); const j = await r.json();
      renderSystem(j.ok ? "LLAMA \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0449\u0435\u043d" : ("\u043e\u0448\u0438\u0431\u043a\u0430: " + (j.error||"?")));
    } catch(e){ renderSystem("\u043e\u0448\u0438\u0431\u043a\u0430: " + e); }
  });
  const rs = $("laRestartSrv");
  if (rs) rs.addEventListener("click", async () => {
    renderSystem("\u041f\u0415\u0420\u0415\u0417\u0410\u041f\u0423\u0421\u041a \u041e\u0420\u041a\u0415\u0421\u0422\u0420\u0410\u0422\u041e\u0420\u0410...");
    try { const r = await fetch("/api/localai/restart_server", {method:"POST"}); const j = await r.json();
      renderSystem(j.ok ? "\u041e\u0440\u043a\u0435\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043f\u0435\u0440\u0435\u0437\u0430\u043f\u0443\u0449\u0435\u043d" : ("\u043e\u0448\u0438\u0431\u043a\u0430: " + (j.error||"?")));
    } catch(e){ renderSystem("\u043e\u0448\u0438\u0431\u043a\u0430: " + e); }
  });
  const cl = $("laClear");
  if (cl) cl.addEventListener("click", () => {
    feed.innerHTML = "";
    try { localStorage.removeItem(LS_KEY); } catch(e){}
  });

  /* ===== Восстановление истории ===== */
  function restoreHistory(){
    const h = loadHistory();
    if (h.length === 0){
      renderSystem("\u041b\u041e\u041a\u0410\u041b\u042c\u041d\u042b\u0419 AI \u0433\u043e\u0442\u043e\u0432. \u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441.", false);
      return;
    }
    h.forEach(m => {
      if (m.role === "user") renderRole("user", m.text, false);
      else if (m.role === "ai") renderRole("ai", m.text, false);
      else renderSystem(m.text, false);
    });
  }

  /* ===== Автозапуск статуса ===== */
  refreshStatus();
  restoreHistory();
})();
