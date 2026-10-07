const POLL_MS = 2000;
const STABLE_MS = 1200;
const COALESCE_MS = 2500;
const MIN_GAP_MS = 5000;
const SILENCE_MS = 180000;         // порог тишины бриджа (DCCA0022)
const ALIVE_CHECK_MS = 30000;      // как часто проверять
const ALIVE_TEXT = "Жив? Проверь TODO, если всё сделал и работы завершены и приняты - выключи watchdog!";
const VERSION = "4.0.0";

const H = "#".repeat(3);
const MB = H + "BEGIN" + H;
const MC = H + "CONTENT" + H;
const ME = H + "END" + H;
const MB_RE = H + "\\s*BEGIN\\s*" + H;
const MC_RE = H + "\\s*CONTENT\\s*" + H;
const ME_RE = H + "\\s*END\\s*" + H;

let inflight = false;
let lastPreCount = -1;
let lastChangeAt = Date.now();
let lastSendAt = 0;
let waitingForReply = false;
let silencePinged = false;

console.log("[bridge] content v" + VERSION + " loaded");

async function sendBg(msg) {
  try { return await chrome.runtime.sendMessage(msg); }
  catch (e) { console.warn("[bridge] bg fail", e); return null; }
}
const getState = () => sendBg({ type: "get-state" });
const report = (text, level, extra) => sendBg({ type: "status", text, level, extra });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function isStable() {
  const root = document.querySelector("main") || document.body;
  const n = root.querySelectorAll("pre, code").length;
  const t = Date.now();
  if (n !== lastPreCount) { lastPreCount = n; lastChangeAt = t; return false; }
  return t - lastChangeAt > STABLE_MS;
}

function inThinking(node) {
  let p = node;
  for (let i = 0; i < 20 && p && p !== document.body; i++, p = p.parentElement) {
    const c = (p.className || "").toString().toLowerCase();
    if (/reasoning|thinking|thought|think-/.test(c)) return true;
    const al = (p.getAttribute && p.getAttribute("aria-label") || "").toLowerCase();
    if (/think|reason/.test(al)) return true;
  }
  return false;
}

function parseBlocks(text) {
  const out = [];
  const re = new RegExp(MB_RE + "([\\s\\S]*?)" + ME_RE, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1];
    let sep = inner.indexOf(MC);
    if (sep < 0) {
      const mcRe = new RegExp(MC_RE);
      const mm = mcRe.exec(inner);
      if (mm) sep = mm.index;
    }
    let headers, content = "";
    if (sep >= 0) {
      headers = inner.slice(0, sep);
      const after = inner.slice(sep);
      const mcMatch = new RegExp(MC_RE).exec(after);
      const skip = mcMatch ? mcMatch[0].length : MC.length;
      content = after.slice(skip).replace(/^\r?\n/, "").replace(/\r?\n$/, "");
    } else {
      headers = inner;
    }
    const h = {};
    for (const line of headers.split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    if (!h.id || !h.op || !/^[A-Z]{4}\d{4}$/.test(h.id)) continue;
    const obj = { id: h.id, op: h.op };
    if (h.path) obj.path = h.path;
    if (h.op === "write") obj.content = content;
    else if (h.op === "run") obj.cmd = content.trim() || h.cmd || "";
    else if (h.op === "sandbox") { try { obj.spec = JSON.parse(content); } catch { continue; } }
    out.push(obj);
  }
  return out;
}

function collectActions() {
  const out = [], seen = new Set();
  const add = (a) => { if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); } };
  for (const c of document.querySelectorAll("pre, code")) {
    if (inThinking(c)) continue;
    const txt = c.textContent || "";
    if (!txt.includes(H)) continue;
    for (const a of parseBlocks(txt)) add(a);
  }
  return out;
}

function freshOnly(all, st) {
  return all.filter(a =>
    !recentlySentIds.has(a.id) &&
    !(st.ledger || []).some(e => e.id === a.id)
  );
}

// v3: hoist fix
// hard reload guard v1
let lastInsertedText = "";
const recentlySentIds = new Set();   // dedupe fix: ids we just sent
const RECENT_LIMIT = 200;
let lastInflightAt = 0;
let lastPanelCheckAt = Date.now();
let panelStuckPinged = false;
let panelStuckSince = 0;
let hardReloadFired = false;
const notifiedPhrases = new Set();
let voiceStopSent = false;
const notifyWatcher = { lastScan: 0, pattern: /\?!\$([\s\S]+?)\$!\?/g };

function addRecent(id) {
  recentlySentIds.add(id);
  if (recentlySentIds.size > RECENT_LIMIT) {
    const first = recentlySentIds.values().next().value;
    recentlySentIds.delete(first);
  }
}

function userHasTyped() {
  const ta = document.querySelector("textarea");
  if (!ta) return false;
  const v = (ta.value || "").trim();
  if (!v) return false;
  if (v === lastInsertedText) return false;
  // если текст начинается с нашего отчёта — это наш висящий кусок
  if (v.startsWith("[AGENT REPORT]")) return false;
  return true;
}

async function checkUserBack() {
  const ta = document.querySelector("textarea");
  if (!ta) { voiceStopSent = false; return; }
  const v = (ta.value || "").trim();
  const typed = v && v !== lastInsertedText && !v.startsWith("[AGENT REPORT]");
  if (!typed) { voiceStopSent = false; return; }
  if (voiceStopSent) return;
  voiceStopSent = true;
  console.warn("[bridge] user typed, sending voice-stop");
  try { await sendBg({ type: "notify-stop" }); } catch (e) {}
}

async function typeAndSend(text, force) {
  if (!force && userHasTyped()) {
    await report("Пользователь печатает — откладываю отправку", "warn");
    return false;
  }
  const ta = document.querySelector("textarea");
  if (!ta) { await report("Нет textarea", "err"); return false; }
  await report("Вставляю отчёт", "info");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, text);
  lastInsertedText = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.focus();
  await sleep(200);
  if (!ta.value || ta.value.length < 10) { await report("Текст не вставился", "err"); return false; }
  await report("Жму Enter", "info");
  // tripleEnterFix: 2 прохода — некоторые версии UI требуют
  for (let round = 0; round < 2; round++) {
    for (const t of ["keydown", "keypress", "keyup"]) {
      ta.dispatchEvent(new KeyboardEvent(t, {
        key: "Enter", code: "Enter", keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
    }
    await sleep(150);
    if (!ta.value || ta.value.length < 5) break;
  }
  await sleep(300);
  // если текст всё ещё висит — запомним, чтобы при следующем scan не принять за «пользователь печатает»
  if (ta.value && ta.value.length >= 5) {
    lastInsertedText = ta.value;
    console.warn("[bridge] textarea still has our text after Enter, forcing resend next cycle");
    return false;
  }
  // v4: счётчик отправок (инкремент при успешной отправке формы)
  try { await sendBg({ type: "send-inc" }); } catch (e) {}
  return true;
}

function fmt(r) {
  const head = "id: " + r.id + " | op: " + r.op + " | " + r.status;
  if (r.status === "SKIP") return head + " (skip)";
  if (r.status === "CONFIRM_REQUIRED") return head + " (ждёт подтв.)";
  const res = r.result || {};
  const lines = [head];
  if (typeof res.code === "number") lines.push("exit: " + res.code);
  if (res.elapsed !== undefined) lines.push("elapsed: " + res.elapsed + "s");
  if (res.unchanged) lines.push("unchanged: true");
  if (res.stdout) lines.push("stdout:\n" + res.stdout.trimEnd());
  if (res.stderr) lines.push("stderr:\n" + res.stderr.trimEnd());
  if (res.error) lines.push("error: " + res.error);
  if (res.path) lines.push("path: " + res.path);
  if (res.sha256) lines.push("sha256: " + res.sha256.slice(0, 16));
  if (r.op === "read" && typeof res.content === "string") {
    lines.push("bytes: " + new TextEncoder().encode(res.content).length);
    lines.push("content:\n" + res.content);
  }
  return lines.join("\n");
}

const buildReport = (results, nextId) =>
  "[AGENT REPORT]\n" + results.map(fmt).join("\n---\n") + "\nnext_id: " + nextId;

function estimateTokens() {
  try {
    const root = document.querySelector("main") || document.body;
    if (!root) return 0;
    const txt = root.innerText || "";
    let cyr = 0, lat = 0, other = 0;
    for (let i = 0; i < txt.length; i++) {
      const c = txt.charCodeAt(i);
      if (c >= 0x0400 && c <= 0x04FF) cyr++;
      else if (c > 32 && c < 127) lat++;
      else other++;
    }
    return Math.round(lat / 4 + cyr / 2.5 + other / 4);
  } catch (e) { return 0; }
}
async function pushTokenEstimate() {
  const n = estimateTokens();
  if (n > 0) { try { await sendBg({ type: "token-estimate", value: n }); } catch (e) {} }
}
setInterval(pushTokenEstimate, 30000);
setTimeout(pushTokenEstimate, 5000);

async function scan() {
  try { await checkUserBack(); } catch (e) {}
  // inflight auto-reset: если висим >45s без ответа от фона — сброс
  if (inflight && Date.now() - lastInflightAt > 45000) {
    console.warn("[bridge] inflight auto-reset after 45s");
    inflight = false;
    await report("inflight сброшен принудительно (>45s)", "warn");
  }
  if (inflight) return;
  const st = await getState();
  if (!st || st.paused || !st.token) return;
  if (!isStable()) return;

  // notify marker scan (throttled to every 3s)
  if (Date.now() - notifyWatcher.lastScan > 3000) {
    notifyWatcher.lastScan = Date.now();
    try {
      const bodyText = document.body ? document.body.innerText : "";
      if (bodyText && bodyText.indexOf("?!$") >= 0) {
        let nm;
        const re = new RegExp(notifyWatcher.pattern.source, "g");
        while ((nm = re.exec(bodyText)) !== null) {
          const phrase = (nm[1] || "").trim();
          if (!phrase || phrase.length < 5) continue;
          if (notifiedPhrases.has(phrase)) continue;
          notifiedPhrases.add(phrase);
          // parse "level: reason" — levels: alarm, stuck, done, watchdog, helper, say
          let level = "say", reason = phrase;
          const lm = phrase.match(/^(alarm|stuck|done|watchdog|helper|say)\s*:\s*([\s\S]+)$/i);
          if (lm) { level = lm[1].toLowerCase(); reason = lm[2].trim(); }
          console.warn("[bridge] voice:", level, "|", reason.slice(0, 80));
          await report("Voice [" + level + "]: " + reason.slice(0, 60), "warn");
          await sendBg({ type: "notify", level: level, reason: reason });
        }
      }
    } catch (e) { console.warn("[bridge] notify scan err:", e); }
  }

  const allEarly = collectActions();
  const freshEarly = freshOnly(allEarly, st);
  if (freshEarly.length > 0) {
    if (!panelStuckSince) panelStuckSince = Date.now();
    const stuckMs = Date.now() - panelStuckSince;

    if (!panelStuckPinged && Date.now() - lastPanelCheckAt > 90000) {
      panelStuckPinged = true;
      await report("Panel-stuck: " + freshEarly.length + " команд висят >90s", "err");
      await typeAndSend("[PANEL-STUCK] " + freshEarly.length + " команд в DOM, но не обрабатываются. Проверь панель.", true);
      lastSendAt = Date.now();
    }

    // HARD RESET: если висит >4 минут — перезагрузить расширение изнутри
    if (!hardReloadFired && stuckMs > 240000) {
      hardReloadFired = true;
      console.warn("[bridge] HARD RESET: panel stuck " + Math.round(stuckMs/1000) + "s, asking background to reload extension");
      try { chrome.runtime.sendMessage({type: "hard-reload"}); }
      catch (e) { console.warn("[bridge] hard-reload msg err: " + e); }
    }
  } else {
    lastPanelCheckAt = Date.now();
    panelStuckPinged = false;
    panelStuckSince = 0;
    hardReloadFired = false;
  }

  const all = collectActions();
  const fresh = freshOnly(all, st);

  if (waitingForReply && fresh.length > 0) {
    waitingForReply = false;
    silencePinged = false;
  }

  if (!fresh.length) {
    // ALIVE теперь через отдельный setInterval(checkAlive) — триггер по трафику бриджа
    return;
  }

  const sinceSend = Date.now() - lastSendAt;
  if (sinceSend < MIN_GAP_MS) return;

  await sleep(COALESCE_MS);

  const st2 = await getState();
  if (!st2 || st2.paused) return;
  const all2 = collectActions();
  const fresh2 = freshOnly(all2, st2);
  if (!fresh2.length) return;

  inflight = true;
  lastInflightAt = Date.now();
  try {
    await report("Нашёл " + fresh2.length + " команд", "info", { ids: fresh2.map(a => a.id) });
    // dedupe fix: mark as sent BEFORE awaiting batch, so any parallel scan skips them
    for (const a of fresh2) addRecent(a.id);
    const resp = await sendBg({ type: "batch", actions: fresh2 });
    if (!resp || resp.status === "PAUSED") return;
    const done = resp.results.filter(r => r.status !== "SKIP");
    if (!done.length) { await report("Все уже были", "warn"); return; }
    await typeAndSend(buildReport(done, resp.nextId));
    lastSendAt = Date.now();
    waitingForReply = true;
    silencePinged = false;
  } catch (e) {
    console.warn("[bridge]", e);
    await report("Ошибка: " + e.message, "err");
  } finally { inflight = false; }
}

chrome.runtime.onMessage.addListener((msg, _s, respond) => {
  if (msg.type === "pending-result") {
    typeAndSend(buildReport([{ id: msg.id, op: msg.op, status: msg.status, result: msg.result }], msg.nextId))
      .then(() => { lastSendAt = Date.now(); waitingForReply = true; });
  }
  if (msg.type === "selftest") {
    const acts = collectActions();
    respond({
      version: VERSION,
      url: location.href,
      textarea: !!document.querySelector("textarea"),
      codeCount: document.querySelectorAll("code").length,
      actionBlocks: acts.length,
      ids: acts.map(a => a.id),
      since_last_send_ms: Date.now() - lastSendAt,
      stable: isStable(),
      tokenEstimate: estimateTokens()
    });
    return true;
  }
});

// ALIVE по трафику бриджа: если у агента ago > SILENCE_MS — шлём ALIVE.
// Если трафик есть (команды/отчёты идут) — молчим, не жжём токены.
async function checkAlive() {
  if (silencePinged) return;
  const st = await getState();
  if (!st || !st.token || st.paused) return;
  const url = st.agentUrl;
  if (!url) return;
  // ALIVE только когда watchdog ON. Источник истины — файл logs/svc/watchdog_<CH>.json,
  // читаем напрямую (storage синкается раз в 20с и может врать). DCCA0022.
  const _m = String(url).match(/:(\d+)/);
  const _ch = _m ? ({ "6": "A", "7": "B", "8": "C", "9": "D" }[(parseInt(_m[1], 10) % 10)]) : null;
  if (!_ch) return;
  try {
    const rf = await fetch(url + "/read", { method: "POST",
      headers: { "Content-Type": "application/json", "X-Token": st.token },
      body: JSON.stringify({ path: "logs/svc/watchdog_" + _ch + ".json" }) });
    const jf = await rf.json();
    if (!jf || !jf.ok || typeof jf.content !== "string") return;
    let wd = null;
    try { wd = JSON.parse(jf.content); } catch (e) { return; }
    if (!wd || wd.state !== "on") { silencePinged = false; return; }
  } catch (e) { return; }
  const _sil = (st.aliveSilence || 180);
  try {
    const r = await fetch(url + "/ping", { method: "GET", headers: { "X-Token": st.token } });
    const j = await r.json();
    // ago-фикс: агент без ago -> не тишина, молчим.
    if (!j || !j.ok || typeof j.ago !== "number") return;
    if (j.ago < _sil) {
      silencePinged = false;
      return;
    }
  } catch (e) {
    return;
  }
  silencePinged = true;
  await report("Тишина бриджа > " + _sil + "с — ALIVE", "warn");
  await typeAndSend(ALIVE_TEXT);
  lastSendAt = Date.now();
}
setInterval(checkAlive, ALIVE_CHECK_MS);  // gate = st.watchdog.state (synced from file)

setInterval(scan, POLL_MS);

// heartbeat: mark DOM every 3s for external watchdog
setInterval(() => {
  try {
    document.documentElement.dataset.dsbHeartbeat = Date.now().toString();
  } catch (e) {}
}, 3000);
window.addEventListener("load", () => setTimeout(scan, 800));