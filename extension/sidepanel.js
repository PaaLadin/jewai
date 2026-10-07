const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const send = (m) => chrome.runtime.sendMessage(m);

function chipClass(state) {
  if (state === "ok") return "chip ok";
  if (state === "bad") return "chip bad";
  if (state === "warn") return "chip warn";
  return "chip";
}

async function healthCheck() {
  const s = await send({ type: "get-state" });
  if (!s) return;

  // agent — новый background отвечает health-объектом
  let agentState = "bad", agentLabel = "agent down";
  if (s.token && s.agentUrl) {
    const h = await send({ type: "ping-agent" });
    if (h && h.agent === "ok") {
      agentState = "ok";
      agentLabel = "agent v" + (h.version || "?") + " · " + (s.agentUrl.split(":").pop() || "?");
    } else if (h && h.lastError) {
      agentLabel = "agent bad (" + String(h.lastError).slice(0, 20) + ")";
    } else {
      agentLabel = "agent no-ping";
    }
  } else {
    agentLabel = "no token";
  }

  // content
  let contentState = "bad", contentLabel = "content —";
  let tab = null;
  try {
    const tabs = await chrome.tabs.query({ url: "https://chat.deepseek.com/*" });
    tab = tabs && tabs[0];
  } catch (e) { /* ignore */ }
  if (tab && tab.id) {
    try {
      const r = await chrome.tabs.sendMessage(tab.id, { type: "selftest" });
      if (r && r.version) {
        contentState = "ok";
        contentLabel = "content v" + r.version + " · " + (r.actionBlocks || 0) + " cmd";
      } else {
        contentLabel = "content no-data";
      }
    } catch (e) {
      contentLabel = "content no-answer";
    }
  } else {
    contentLabel = "content no-tab";
  }

  $("h-agent").className = chipClass(agentState);
  $("h-agent").textContent = agentLabel;
  $("h-content").className = chipClass(contentState);
  $("h-content").textContent = contentLabel;
  $("h-last").className = chipClass(s.lastId ? "ok" : "warn");
  $("h-last").textContent = "lastId " + (s.lastId || "(пусто)");
}

function render(state) {
  $("token").value = state.token || "";
  $("url").value = state.agentUrl || "";
  $("lastId").value = state.lastId || "";
  $("ac").checked = !!state.autoConfirm;
  $("pause").textContent = state.paused ? "Продолжить" : "Пауза";
  $("pause").classList.toggle("warn", state.paused);

  const dot = $("dot"); dot.className = "";
  if (state.paused) { dot.classList.add("paused"); $("state").textContent = "paused"; }
  else if (state.token) { dot.classList.add("on"); $("state").textContent = "armed"; }
  else { dot.classList.add("err"); $("state").textContent = "no token"; }

  const st = state.status || { text: "idle", level: "info", ts: Date.now() };
  $("stage").innerHTML = '<span class="big lvl-' + esc(st.level) + '">' + esc(st.text) + '</span>'
    + '<div class="small">' + new Date(st.ts).toLocaleTimeString()
    + (st.ids ? " · " + esc(st.ids.join(",")) : "") + '</div>';

  const tk = state.tokenEstimate || 0;
  const lim = state.tokenLimit || 3600;
  const tkPct = Math.min(100, tk / lim * 100);
  $("tok-text").textContent = "tokens ~" + tk.toLocaleString() + " / " + lim.toLocaleString() + " (" + tkPct.toFixed(1) + "%)";
  const tb = $("tok-bar");
  tb.style.width = tkPct + "%";
  tb.style.background = tkPct >= 95 ? "#e05252" : tkPct >= 90 ? "#e05252" : tkPct >= 80 ? "#e6b02b" : "#3fbf6f";
  const lamp = $("tok-lamp");
  if (lamp) {
    lamp.className = "tok-lamp " + (state.tokenLevel || "ok");
  }
  // v4: два счётчика — объём (по формуле) и число отправок.
  const vol = state.tokenEstimate || 0;
  const sends = state.sendCount || 0;
  const snow = vol * sends;  // накопленная нагрузка: каждый запрос перечитывает всю историю
  $("cnt-chars").textContent = vol.toLocaleString();
  $("cnt-sends").textContent = sends;
  $("cnt-snow").textContent = snow > 100000 ? Math.round(snow/1000) + "k" : snow.toLocaleString();

  const sm = state.sessionStartTs ? Math.round((Date.now()-state.sessionStartTs)/60000) : 0;
  $("metrics").textContent = "session " + sm + "m / FAIL " + (state.failCount||0);

  renderSvc(state.svc || {}, state.agentUrl, state);

  const p = state.pending;
  $("pending").innerHTML = p
    ? '<div style="background:#2a2416;border:1px solid #6b5a2e;padding:8px;border-radius:4px;margin:6px 0">'
      + '<b>Требует подтверждения</b><br>' + esc(p.id) + ' · ' + esc(p.action.op)
      + '<div class="row"><button id="ok">Выполнить</button>'
      + '<button id="no" class="danger">Отмена</button></div></div>'
    : "";
  if (p) {
    $("ok").onclick = () => send({ type: "confirm-pending" }).then(refresh);
    $("no").onclick = () => send({ type: "cancel-pending" }).then(refresh);
  }

  const log = $("log"); log.innerHTML = "";
  const filt = ($("ledgerFilter") && $("ledgerFilter").value) || "";
  let lv = state.ledger || [];
  if (filt && state.ledgerByPrefix && state.ledgerByPrefix[filt]) lv = state.ledgerByPrefix[filt];
  [...lv].reverse().forEach(e => {
    const cls = e.status === "OK" ? "ok" : e.status === "FAIL" ? "fail" : "skip";
    log.insertAdjacentHTML("beforeend",
      '<div class="entry"><span class="' + cls + '">[' + esc(e.status) + ']</span> '
      + esc(e.id) + ' ' + esc(e.op) + ' <span class="small">'
      + new Date(e.ts).toLocaleTimeString() + '</span></div>');
  });

  const sl = $("statuslog"); sl.innerHTML = "";
  [...(state.statusLog || [])].slice(-40).reverse().forEach(e => {
    sl.insertAdjacentHTML("beforeend",
      '<div class="entry lvl-' + esc(e.level) + '">'
      + new Date(e.ts).toLocaleTimeString() + ' · ' + esc(e.text) + '</div>');
  });
}

let svcPending = {};

function renderSvc(svc, agentUrl, state) {
  const rows = document.getElementById("svc-rows");
  if (!rows) return;
  state = state || {};
  // не терять ввод оператора при 3-сек refresh (таймлимит, порог, cooldown)
  const _ae = document.activeElement;
  const _fid = (_ae && _ae.id && /^(rc_|as_)/.test(_ae.id)) ? _ae.id : null;
  const _fval = _fid ? _ae.value : null;
  const m = String(agentUrl || "").match(/:(\d+)/);
  const pd = m ? (parseInt(m[1], 10) % 10) : 6;
  const cmap = { 6: "A", 7: "B", 8: "C", 9: "D" };
  const own = cmap[pd] || "A";
  const chans = [own];
  const kinds = ["watchdog", "recovery"];
  let html = "";
  for (const ch of chans) {
    html += '<div class="svcgrid">';
    html += '<div class="t">' + ch + '</div>';
    for (const k of kinds) {
      const st = (svc[ch] && svc[ch][k]) || {};
      const on = !!st.on;
      const pend = !!svcPending[ch + "_" + k];
      const cls = "svcbtn" + (on ? " on" : "");
      const pix = pend ? "pix pend" : (on ? "pix ok" : "pix");
      html += '<div class="' + cls + '" data-ch="' + ch + '" data-k="' + k + '">'
        + '<span class="' + pix + '"></span>' + (on ? "ON" : "OFF") + '</div>';
    }
    html += '</div>';
    // параметры
    const wd = (svc[ch] && svc[ch].watchdog) || {};
    const rc = (svc[ch] && svc[ch].recovery) || {};
    const wdOn = !!wd.on;
    const rcOn = !!rc.on;
    const _al = (state.aliveSilence != null ? state.aliveSilence : 180);
    html += '<div class="svcparams">WD: 300с (фикс) | REC cooldown (сек) <input type="number" id="rc_' + ch + '" value="' + ((rc.params && rc.params.cooldown) || 300) + '"' + (rcOn ? ' disabled' : '') + '></div>'
      + '<div class="svcparams">ALIVE порог (сек) <input type="number" id="as_' + ch + '" value="' + _al + '" title="тишина бриджа до ALIVE-пинга">'
      + ' <button class="ghost" id="asSave_' + ch + '" data-ch="' + ch + '" style="font-size:10px;padding:2px 6px">OK</button></div>';
  }
  rows.innerHTML = html;
  if (_fid) {
    const _el = document.getElementById(_fid);
    if (_el) { _el.value = _fval; _el.focus(); }
  }
  rows.querySelectorAll(".svcbtn").forEach(btn => {
    btn.onclick = () => toggleSvc(btn.dataset.ch, btn.dataset.k);
  });
  rows.querySelectorAll("[id^=asSave_]").forEach(b => {
    b.onclick = () => saveAliveSilence(b.dataset.ch);
  });
}

async function saveAliveSilence(ch){
  const el = document.getElementById("as_" + ch);
  if (!el) return;
  const v = parseInt(el.value);
  if (!v || v < 10) { alert("минимум 10 секунд"); return; }
  await send({ type: "set", patch: { aliveSilence: v } });
  await send({ type: "status", text: "ALIVE порог = " + v + "с", level: "warn" });
  refresh();
}
async function toggleSvc(ch, kind) {
  const key = ch + "_" + kind;
  const cur = svcPending[key];
  if (cur) return;
  svcPending[key] = true;
  try {
    const s = await send({ type: "get-state" });
    const st = (s.svc && s.svc[ch] && s.svc[ch][kind]) || {};
    const on = !!st.on;
    if (on) {
      await send({ type: "svc-stop", channel: ch, kind: kind });
    } else {
      const params = {};
      if (kind === "watchdog") {
        params.interval = 300;
        params.threshold = 3;
      } else {
        params.cooldown = parseInt(document.getElementById("rc_" + ch).value) || 300;
      }
      await send({ type: "svc-start", channel: ch, kind: kind, params: params });
    }
  } finally {
    svcPending[key] = false;
    refresh();
  }
}

let lastState = null;
async function refresh() { lastState = await send({ type: "get-state" }); render(lastState); }

$("token").addEventListener("change", e => send({ type: "set", patch: { token: e.target.value.trim() } }).then(refresh));
$("url").addEventListener("change", e => send({ type: "set", patch: { agentUrl: e.target.value.trim() } }).then(refresh));
$("ac").addEventListener("change", e => send({ type: "set", patch: { autoConfirm: e.target.checked } }).then(refresh));
$("setLast").addEventListener("click", () => {
  const v = $("lastId").value.trim();
  if (!/^[A-Z]{4}\d{4}$/.test(v)) { alert("формат: AAAA0001"); return; }
  send({ type: "set", patch: { lastId: v } }).then(() => {
    send({ type: "status", text: "lastId = " + v, level: "warn" });
    refresh();
  });
});
$("pause").addEventListener("click", async () => {
  const s = await send({ type: "get-state" });
  await send({ type: "set", patch: { paused: !s.paused } });
  send({ type: "status", text: !s.paused ? "PAUSED вручную" : "Продолжаю",
         level: !s.paused ? "warn" : "ok" });
  refresh();
});
$("reset").addEventListener("click", () => {
  if (confirm("Сбросить ledger и last_id?")) send({ type: "reset-ledger" }).then(refresh);
});
$("selftest").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ url: "https://chat.deepseek.com/*" });
  const tab = tabs && tabs[0];
  if (!tab) { $("selftest-box").innerHTML = "<div class='lvl-err'>нет вкладки LLM</div>"; return; }
  try {
    const r = await chrome.tabs.sendMessage(tab.id, { type: "selftest" });
    $("selftest-box").innerHTML = "<pre class='selftest'>" + esc(JSON.stringify(r, null, 2)) + "</pre>";
  } catch (e) {
    $("selftest-box").innerHTML = "<div class='lvl-err'>content не отвечает: " + esc(e.message) + "</div>";
  }
});

$("tok-reset").addEventListener("click", async () => {
  if (!confirm("Сбросить счётчик токенов? Делать после перерождения (новый чат).")) return;
  await send({ type: "set", patch: { tokenEstimate: 0, tokenPercent: 0, tokenWarned: {}, tokenLevel: "ok", sendCount: 0, sessionStartTs: Date.now() } });
  await send({ type: "status", text: "Счётчики токенов сброшены вручную (объём + отправки)", level: "warn" });
  refresh();
});

$("ledgerFilter").addEventListener("change", refresh);
$("handover").addEventListener("click", () => { send({type:"status",text:"handover 2A: checklist session_handover",level:"warn"}); });

chrome.runtime.onMessage.addListener(m => { if (m.type === "state-changed") refresh(); });

refresh();
healthCheck();
setInterval(refresh, 3000);
setInterval(healthCheck, 5000);
if (typeof renderWatchdog === "function") renderWatchdog();

