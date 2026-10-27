const POLL_MS = 2000;
const STABLE_MS = 1200;
const COALESCE_MS = 2500;
const MIN_GAP_MS = 5000;
const SILENCE_MS = 180000;         // порог тишины бриджа (DCCA0022)
const ALIVE_CHECK_MS = 30000;      // как часто проверять
const ALIVE_TEXT = "[ALIVE?] Жив? Проверь TODO, если всё сделал и работы завершены и приняты - выключи watchdog!";
const VERSION = "4.0.3";

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

// v4 (22.10): сканируем ТОЛЬКО последние ассистентские сообщения.
// Раньше сканировалась вся история чата -> старые блоки (stop all)
// после выпадения из леджера исполнялись заново и гасили систему.
const SCAN_LAST_MSGS = 3;

function collectActions() {
  const out = [], seen = new Set();
  const add = (a) => { if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); } };
  // 1) DeepSeek: последние N ответов ассистента
  let nodes = [];
  const msgs = document.querySelectorAll(".ds-message");
  for (let i = msgs.length - 1; i >= 0 && nodes.length < SCAN_LAST_MSGS; i--) {
    const m = msgs[i];
    if (m.querySelector(".ds-assistant-message-main-content")) {
      nodes.push(m);
    }
  }
  // 2) fallback для других SPA/разметок: если структуры нет - последний pre-контейнер
  let scopes;
  if (nodes.length) {
    scopes = nodes;
  } else {
    const all = document.querySelectorAll("pre, code");
    scopes = all.length ? [all[all.length - 1]] : [];
  }
  for (const scope of scopes) {
    const pres = scope.matches && scope.matches("pre, code")
      ? [scope] : scope.querySelectorAll("pre, code");
    for (const c of pres) {
      if (inThinking(c)) continue;
      const txt = c.textContent || "";
      if (!txt.includes(H)) continue;
      for (const a of parseBlocks(txt)) add(a);
    }
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
const RECENT_LIMIT = 500;
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
  // persist (22.10): пережить перезагрузку расширения/страницы
  try {
    const arr = Array.from(recentlySentIds).slice(-RECENT_LIMIT);
    chrome.storage.local.set({ recentlySentIds: arr });
  } catch (e) { /* ignore */ }
}

// restore при загрузке: страхует от повторного исполнения старых блоков
try {
  chrome.storage.local.get({ recentlySentIds: [] }, (d) => {
    const arr = (d && d.recentlySentIds) || [];
    for (const x of arr) recentlySentIds.add(x);
    console.log("[bridge] restored recentlySentIds:", arr.length);
  });
} catch (e) { /* ignore */ }

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


let lastRetryAt = 0;
const RETRY_COOLDOWN_MS = 15000;

async function checkStuck() {
  if (Date.now() - lastRetryAt < RETRY_COOLDOWN_MS) return;
  // Fix 13A: don't touch the reply we just triggered (may still be generating).
  if (Date.now() - lastSendAt < 30000) return;
  if (typeof userHasTyped === 'function' && userHasTyped()) return;

  const btns = Array.from(document.querySelectorAll('button'));

  // If generation is active (Stop button present), do nothing
  const stopBtn = btns.find(b => {
    const t = (b.textContent || "").toLowerCase();
    const al = (b.getAttribute("aria-label") || "").toLowerCase();
    return t.includes("stop") || t.includes("остановить") || al.includes("stop");
  });
  if (stopBtn) return;

  const getVis = (txts) => {
    const els = Array.from(document.querySelectorAll('button, a, [role="button"], .ds-button'));
    return els.find(b => {
      const txt = (b.textContent || "").trim().toLowerCase();
      const al = (b.getAttribute('aria-label') || "").toLowerCase();
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && txts.some(t => txt === t || txt.includes(t) || al.includes(t));
    });
  };

  const continueBtn = getVis(["continue", "retry", "try again"]);
  const regenBtn = getVis(["regenerate", "перегенерировать", "заново", "retry"]);

  // Type 1: Server unavailable
  if (continueBtn) {
    console.warn("[bridge] stuck Type 1 (Server unavailable), clicking Continue");
    continueBtn.click();
    lastRetryAt = Date.now();
    if (typeof report === 'function') await report("Fix: Type 1 (Server unavailable) -> Continue", "warn");
    return;
  }

  // Type 2: Leaked tags / system text.
  // Fix 13A: do NOT regenerate if the message contains valid command blocks,
  // otherwise we kill the reply together with its commands -> deadlock.
  // Also: require leaked tag AT START of line (real system dump) or Chinese ratio > 30%.
  if (regenBtn) {
    const msgs = document.querySelectorAll(".ds-message");
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      const contentNode = lastMsg.querySelector(".ds-assistant-message-main-content");
      if (contentNode) {
        // guard: if any valid block is inside this reply - skip regen entirely
        let hasValidBlocks = false;
        try {
          const pres = contentNode.querySelectorAll("pre, code");
          for (const c of pres) {
            const t = c.textContent || "";
            if (t.includes(H) && t.includes("BEGIN") && t.includes("END")) { hasValidBlocks = true; break; }
          }
        } catch (e) {}
        if (hasValidBlocks) return;

        const clone = contentNode.cloneNode(true);
        clone.querySelectorAll("pre, code").forEach(el => el.remove());
        const text = clone.textContent || "";

        // stricter: leaked tag must be at line start (like "<div>" dump), not inline HTML mention
        const hasLeakedTag = /(?:^|\n)\s*<[a-z_0-9]{2,}>\s*$/im.test(text);
        // Chinese: > 30% of non-space chars
        const nonSpace = (text.match(/\S/g) || []).length || 1;
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const hasChinese = (chineseChars / nonSpace) > 0.30;
        // system text: require it to be the FIRST line (real leak dump), not a quote
        const firstLine = (text.split(/\r?\n/).find(l => l.trim()) || "").trim();
        const hasSystem = firstLine.startsWith("system_warning") ||
                          firstLine.startsWith("ds_safety") ||
                          firstLine.startsWith("Pausing task");

        if (hasLeakedTag || hasChinese || hasSystem) {
            console.warn("[bridge] stuck Type 2 (Leaked tag/system), clicking Regenerate");
            regenBtn.click();
            lastRetryAt = Date.now();
            if (typeof report === 'function') await report("Fix: Type 2 (Leaked tag) -> Regenerate", "warn");
            return;
        }
      }
    }
  }
}

async function detectTalkWithoutBlock(st) {
  // Type 3 (27.10): после compact модель иногда "рассуждает вслух" без блока:
  // "сейчас проверю", "выведу текст", "нужно выполнить" — но не шлёт ### BEGIN ###.
  // Мост не получает команду, агент висит.
  // Триггер: последнее ассистентское сообщение не содержит блок, содержит глагол-обещание,
  // и с последнего send прошло >30с, и нет свежих команд.
  try {
    const msgs = document.querySelectorAll(".ds-message");
    if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    const node = last.querySelector(".ds-assistant-message-main-content");
    if (!node) return;
    // если в этом сообщении уже есть валидный блок - пропустить
    const pres = node.querySelectorAll("pre, code");
    for (const c of pres) {
      if ((c.textContent || "").includes(H + "BEGIN" + H)) return;
    }
    // проверить, что сообщение - наше последнее (после него нет user-сообщений)
    const allMsgs = document.querySelectorAll(".ds-message");
    let lastUserIdx = -1;
    for (let i = 0; i < allMsgs.length; i++) {
      if (allMsgs[i].querySelector(".ds-user-message")) lastUserIdx = i;
    }
    if (lastUserIdx >= allMsgs.length - 1) return; // после юзера ещё не ответили
    // текст без блоков
    const clone = node.cloneNode(true);
    clone.querySelectorAll("pre, code").forEach(el => el.remove());
    const text = (clone.textContent || "").trim();
    if (text.length < 20) return;
    // триггеры: обещание действия
    const talkPattern = /(сейчас\s+(проверю|сделаю|выведу|запущу|посмотрю|исправлю|добавлю|напишу|перепишу)|давай\s+(проверю|сделаю|выведу)|нужно\s+(проверить|сделать|вывести|запустить|исправить)|выведу\s+текст|выполню|запускаю|проверяю\s+через)/i;
    if (!talkPattern.test(text)) return;
    // если уже напоминали недавно - не спамить
    if (Date.now() - lastRetryAt < 120000) return;
    // с последнего send прошло >30с
    if (Date.now() - lastSendAt < 30000) return;
    // убедиться, что нет свежих команд (иначе мост сам подхватит)
    const st2 = await getState();
    if (!st2 || st2.paused || !st2.token) return;
    const all = collectActions();
    const fresh = freshOnly(all, st2);
    if (fresh.length > 0) return;
    // найти textarea и отправить напоминание
    const ta = document.querySelector("textarea");
    if (!ta) return;
    if (typeof userHasTyped === "function" && userHasTyped()) return;
    const reminder = "[SYS] Format reminder: your last message has NO command block. Talk alone does nothing. Send the next action as a code fence: " + H + "BEGIN" + H + " / id: <NEXT> / op: run|read|write / path or cmd / " + H + "END" + H;
    console.warn("[bridge] Type 3: talk without block, sending format reminder");
    await typeAndSend(reminder, true);
    lastRetryAt = Date.now();
    lastSendAt = Date.now();
    if (typeof report === "function") await report("Fix: Type 3 (talk w/o block) -> format reminder", "warn");
  } catch (e) { console.warn("[bridge] talk detect err:", e); }
}

async function scan() {
  try { await checkStuck(); } catch (e) {}
  try { await checkUserBack(); } catch (e) {}
  try { await detectTalkWithoutBlock(await getState()); } catch (e) {}
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
    if (false && !hardReloadFired && stuckMs > 240000) {
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
    // 13A fix: do NOT reset silencePinged here. It caused an ALIVE spam loop:
    // every fresh command reset it -> checkAlive fired again -> [ALIVE?] every 30s.
    // silencePinged resets only in checkAlive when ping.ago < _sil (agent alive again).
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
    if (!done.length) {
      await report("Все уже были", "warn");
      // watermark-fix (15.10): даже при всех SKIP вернуть next_id,
      // чтобы агент сдвинул счётчик (иначе вечный цикл).
      if (resp.nextId) { await typeAndSend(buildReport([], resp.nextId)); lastSendAt = Date.now(); }
      return;
    }
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
  await report("Тишина бриджа > " + _sil + "с — ALIVE", "warn");
  const aliveOk = await typeAndSend(ALIVE_TEXT);
  if (aliveOk) {
    silencePinged = true;
    lastSendAt = Date.now();
  } else {
    console.warn("[bridge] ALIVE send failed, will retry next tick");
  }
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