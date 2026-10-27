// content_alice.js — мост для alice.yandex.ru (JewAI multimodel).
// Алиса: pre содержит code, textContent == innerText, переносы есть,
// gutter нет, NBSP нет. textarea: .AliceInput-Textarea.
const POLL_MS = 2000;
const STABLE_MS = 1200;
const COALESCE_MS = 2500;
const MIN_GAP_MS = 5000;
const VERSION = "1.1.2";

const H = "#".repeat(3);
const MB_RE = H + "\\s*BEGIN\\s*" + H;
const MC_RE = H + "\\s*CONTENT\\s*" + H;
const ME_RE = H + "\\s*END\\s*" + H;

let inflight = false;
let lastPreCount = -1;
let lastChangeAt = Date.now();
let lastSendAt = 0;
let lastInsertedText = "";
const recentlySentIds = new Set();
const RECENT_LIMIT = 200;
const SCAN_LAST_MSGS = 3;  // только последние ответы
// персист recentlySentIds (переживает reload)
const STORE_KEY = "recentlySentIds";
function _persistRecent() {
  try { chrome.storage.local.set({ [STORE_KEY]: Array.from(recentlySentIds).slice(-RECENT_LIMIT) }); } catch (e) {}
}
try { chrome.storage.local.get({ [STORE_KEY]: [] }, (d) => {
  const arr = (d && d[STORE_KEY]) || [];
  for (const x of arr) recentlySentIds.add(x);
  console.log("[ef] restored recentlySentIds:", arr.length);
}); } catch (e) {}

console.log("[alice-bridge] content v" + VERSION + " loaded");

async function sendBg(msg) {
  try { return await chrome.runtime.sendMessage(msg); }
  catch (e) { console.warn("[alice] bg fail", e); return null; }
}
const getState = () => sendBg({ type: "get-state" });
const report = (text, level) => sendBg({ type: "status", text, level });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function addRecent(id) {
  recentlySentIds.add(id);
  if (recentlySentIds.size > RECENT_LIMIT) {
    recentlySentIds.delete(recentlySentIds.values().next().value);
  }
  _persistRecent();
}

function isStable() {
  const root = document.querySelector("main") || document.body;
  const n = root.querySelectorAll("pre, code").length;
  const t = Date.now();
  if (n !== lastPreCount) { lastPreCount = n; lastChangeAt = t; return false; }
  return t - lastChangeAt > STABLE_MS;
}

// Алиса: лёгкая нормализация (NBSP на всякий случай)
function normalizePre(text) {
  return (text || "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n");
}

function parseBlocks(text) {
  const out = [];
  const re = new RegExp(MB_RE + "([\\s\\S]*?)" + ME_RE, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1];
    const mc = new RegExp(MC_RE).exec(inner);
    let headers, content = "";
    if (mc) { headers = inner.slice(0, mc.index); content = inner.slice(mc.index + mc[0].length).replace(/^\n/, "").replace(/\n$/, ""); }
    else { headers = inner; }
    const h = {};
    for (const line of headers.split("\n")) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      h[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    if (!h.id || !h.op || !/^[A-Z]{4}\d{4}$/.test(h.id)) continue;
    const obj = { id: h.id, op: h.op };
    if (h.path) obj.path = h.path;
    if (h.op === "write") obj.content = content;
    else if (h.op === "run") obj.cmd = content.trim() || h.cmd || "";
    out.push(obj);
  }
  return out;
}

function collectActions() {
  const out = [], seen = new Set();
  const add = (a) => { if (a && !seen.has(a.id)) { seen.add(a.id); out.push(a); } };
  // 1) склейка зоны ответа модели (в DOM-порядке) - блок может быть раздроблен
  //    на несколько pre подряд, ни один pre не содержит его целиком.
  const zones = document.querySelectorAll(
    ".FuturisMarkdown, .MarkdownText, [class*=Markdown], [class*=markdown], "
    + "[class*=response-message], [class*=answer]");
  // SCAN_LAST_MSGS: только последние ответы (старые блоки не всплывают)
  const _n = zones.length;
  let glued = "";
  for (let _i = Math.max(0, _n - SCAN_LAST_MSGS); _i < _n; _i++) {
    glued += "\n" + (zones[_i].innerText || "");
  }
  if (glued.includes(H)) {
    for (const a of parseBlocks(normalizePre(glued))) add(a);
  }
  // 2) fallback: по отдельным pre/code (блок целиком в одном pre)
  if (!out.length) {
    for (const c of document.querySelectorAll("pre, code")) {
      const txt = normalizePre(c.innerText || "");
      if (!txt.includes(H)) continue;
      for (const a of parseBlocks(txt)) add(a);
    }
  }
  return out;
}

function freshOnly(all, st) {
  return all.filter(a => !recentlySentIds.has(a.id) &&
    !(st.ledger || []).some(e => e.id === a.id));
}

function aliceTextarea() {
  let ta = document.querySelector("textarea.AliceInput-Textarea");
  if (!ta) ta = document.querySelector("textarea:not([readonly]):not([aria-hidden='true'])");
  return ta;
}

function userHasTyped() {
  const ta = aliceTextarea();
  if (!ta) return false;
  const v = (ta.value || "").trim();
  if (!v || v === lastInsertedText) return false;
  if (v.startsWith("[AGENT REPORT]")) return false;
  return true;
}

async function typeAndSend(text, force) {
  if (!force && userHasTyped()) { await report("Пользователь печатает — отложено", "warn"); return false; }
  const ta = aliceTextarea();
  if (!ta) { await report("Нет textarea Алисы", "err"); return false; }
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, text);
  lastInsertedText = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.focus();
  await sleep(200);
  if (!ta.value || ta.value.length < 10) { await report("Текст не вставился", "err"); return false; }
  for (let round = 0; round < 2; round++) {
    for (const t of ["keydown", "keypress", "keyup"]) {
      ta.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    }
    await sleep(150);
    if (!ta.value || ta.value.length < 5) break;
  }
  await sleep(300);
  if (ta.value && ta.value.length >= 5) { lastInsertedText = ta.value; return false; }
  return true;
}

function fmt(r) {
  const head = "id: " + r.id + " | op: " + r.op + " | " + r.status;
  const res = r.result || {};
  const lines = [head];
  if (res.error) lines.push("error: " + res.error);
  if (res.path) lines.push("path: " + res.path);
  if (res.sha256) lines.push("sha256: " + res.sha256.slice(0, 16));
  if (r.op === "read" && typeof res.content === "string") lines.push("content:\n" + res.content);
  return lines.join("\n");
}
const buildReport = (results, nextId) =>
  "[AGENT REPORT]\n" + results.map(fmt).join("\n---\n") + "\nnext_id: " + nextId;


let lastRetryAt = 0;
const RETRY_COOLDOWN_MS = 15000;

async function checkStuck() {
  if (Date.now() - lastRetryAt < RETRY_COOLDOWN_MS) return;
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

  // Type 2: Leaked tags / system text
  if (regenBtn) {
    const msgs = document.querySelectorAll(".ds-message");
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      const contentNode = lastMsg.querySelector(".ds-assistant-message-main-content");
      if (contentNode) {
        const clone = contentNode.cloneNode(true);
        clone.querySelectorAll("pre, code").forEach(el => el.remove());
        const text = clone.textContent || "";
        
        const hasLeakedTag = /<[a-z_0-9]+>/i.test(text);
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasSystem = text.includes("system_warning") || text.includes("ds_safety") || text.includes("Pausing task");
        
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

async function scan() {
  try { await checkStuck(); } catch(e) {}
  if (inflight) return;
  const st = await getState();
  if (!st || st.paused || !st.token) return;
  if (!isStable()) return;
  const fresh = freshOnly(collectActions(), st);
  if (!fresh.length) return;
  if (Date.now() - lastSendAt < MIN_GAP_MS) return;
  await sleep(COALESCE_MS);
  const st2 = await getState();
  if (!st2 || st2.paused) return;
  const fresh2 = freshOnly(collectActions(), st2);
  if (!fresh2.length) return;
  inflight = true;
  try {
    await report("Алиса: " + fresh2.length + " команд", "info");
    for (const a of fresh2) addRecent(a.id);
    const resp = await sendBg({ type: "batch", actions: fresh2 });
    if (!resp || resp.status === "PAUSED") return;
    const done = (resp.results || []).filter(r => r.status !== "SKIP");
    if (!done.length) return;
    await typeAndSend(buildReport(done, resp.nextId));
    lastSendAt = Date.now();
  } catch (e) {
    console.warn("[alice]", e);
  } finally { inflight = false; }
}

chrome.runtime.onMessage.addListener((msg, _s, respond) => {
  if (msg.type === "selftest") {
    respond({
      version: VERSION, url: location.href,
      textarea: !!aliceTextarea(),
      preCount: document.querySelectorAll("pre").length,
      actionBlocks: collectActions().length
    });
    return true;
  }
});

setInterval(scan, POLL_MS);
window.addEventListener("load", () => setTimeout(scan, 1500));