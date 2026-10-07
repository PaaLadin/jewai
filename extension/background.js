const DEFAULTS = {
  token: "", agentUrl: "http://127.0.0.1:8766",
  paused: false, autoConfirm: false,
  ledger: [], lastId: "", lastIds: {}, pending: null,
  status: { text: "idle", level: "info", ts: Date.now() },
  statusLog: [],
  tokenEstimate: 0, tokenPercent: 0, tokenLimit: 3600, tokenWarned: {}, tokenLevel: "ok", sendCount: 0,
  aliveSilence: 180,
  ledgerByPrefix: {}, failCount: 0, lastCmdTs: 0, sessionStartTs: 0,
  health: { agent: "unknown", ts: 0, fails: 0, lastError: "" },
  svc: {},
  // ALIVE+watchdog (DCCA0022): состояние стора + кто включил
  watchdog: {
    state: "off", on_by: null, on_at: null, off_by: null, off_at: null
  }
};

const get = async () => ({ ...DEFAULTS, ...(await chrome.storage.local.get(DEFAULTS)) });
const set = async (p) => chrome.storage.local.set(p);

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  startHeartbeat();
});
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  startHeartbeat();
});

function parseId(id) {
  if (!id || !/^[A-Z]{4}\d{4}$/.test(id)) return -1;
  let b = 0;
  for (const c of id.slice(0, 4)) b = b * 26 + (c.charCodeAt(0) - 65);
  return b * 10000 + parseInt(id.slice(4), 10);
}
const cmpId = (a, b) => parseId(a) - parseId(b);

function suggestNext(id) {
  const m = /^([A-Z]{4})(\d{4})$/.exec(id || "");
  if (!m) return id;
  let [, L, N] = m;
  N = parseInt(N, 10);
  if (N < 9999) return L + String(N + 1).padStart(4, "0");
  const a = L.split("");
  for (let i = 3; i >= 0; i--) {
    if (a[i] < "Z") { a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1); return a.join("") + "0001"; }
    a[i] = "A";
  }
  return id;
}

function isDangerous(a) {
  if (a.op === "delete") return true;
  if (a.op === "run") {
    const c = (a.cmd || "").toLowerCase();
    return /(^|\s)(rm|del|rmdir|format|shutdown|reg)(\s|$)|pip install|npm install|git push|curl |wget /.test(c);
  }
  if (a.op === "sandbox") {
    const c = ((a.spec && a.spec.cmd) || "").toLowerCase();
    return /(^|\s)(rm|del|rmdir|format|shutdown|reg)(\s|$)|pip install|npm install|git push|curl |wget /.test(c);
  }
  return false;
}

async function status(text, level = "info", extra = {}) {
  const entry = { text, level, ts: Date.now(), ...extra };
  const s = await get();
  const log = [...(s.statusLog || []), entry].slice(-60);
  await set({ status: entry, statusLog: log });
  chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
}

async function fetchAgent(path, body, method = "POST") {
  const s = await get();
  const url = s.agentUrl + path;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const opts = {
        method,
        headers: { "X-Token": s.token, "Content-Type": "application/json" }
      };
      if (method === "POST") opts.body = JSON.stringify(body || {});
      const r = await fetch(url, opts);
      return await r.json();
    } catch (e) {
      if (attempt === 0) { await new Promise(x => setTimeout(x, 500)); continue; }
      return { ok: false, error: String(e) };
    }
  }
  return { ok: false, error: "unreachable" };
}

async function exec(action) {
  const body = { ...action };
  delete body.dsx; delete body.id;
  return fetchAgent("/" + action.op, body);
}

async function pushLedger(entry) {
  const s = await get();
  const ledger = [...s.ledger, entry].slice(-20);
  const pref = (entry.id || "").slice(0, 4);
  // v3: per-prefix ledger (для фильтра в панели)
  const byPref = { ...(s.ledgerByPrefix || {}) };
  byPref[pref] = [...(byPref[pref] || []), entry].slice(-20);
  const lastIds = { ...(s.lastIds || {}) };
  const cur = lastIds[pref] || "";
  if (!cur || cmpId(entry.id, cur) > 0) lastIds[pref] = entry.id;
  const lastId = entry.id || s.lastId;
  const failCount = entry.status === "FAIL" ? (s.failCount || 0) + 1 : (s.failCount || 0);
  await set({ ledger, ledgerByPrefix: byPref, lastId, lastIds,
              failCount, lastCmdTs: entry.ts || Date.now(),
              sessionStartTs: s.sessionStartTs || Date.now() });
}

async function heartbeat() {
  const s = await get();
  if (!s.token) return;
  const r = await fetchAgent("/ping", null, "GET");
  const ok = r && r.ok;
  const prevFails = (s.health && s.health.fails) || 0;
  const fails = ok ? 0 : prevFails + 1;
  const health = {
    agent: ok ? "ok" : "bad",
    ts: Date.now(),
    fails,
    lastError: ok ? "" : (r && r.error) || "no response",
    version: ok ? r.version || "?" : null,
  };
  await set({ health });

  if (fails === 3 && !s.paused) {
    await set({ paused: true });
    await status("Авто-пауза: агент не отвечает 3 раза подряд", "err");
  }
  chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
}

let hbTimer = null;
function startHeartbeat() {
  if (hbTimer) clearInterval(hbTimer);
  hbTimer = setInterval(heartbeat, 10000);
  heartbeat();
}

// WATCHDOG STATE SYNC (DCCA0022/DBAA0001):
// единый источник = logs/svc/watchdog_<CH>.json. Storage = кэш.
async function syncWatchdogState() {
  try {
    const s = await get();
    if (!s.agentUrl) return;
    const m = String(s.agentUrl).match(/:(\d+)/);
    if (!m) return;
    const map = { "6": "A", "7": "B", "8": "C", "9": "D" };
    const ch = map[(parseInt(m[1], 10) % 10)];
    if (!ch) return;
    const path = "logs/svc/watchdog_" + ch + ".json";
    const r = await fetchAgent("/read", { path });
    if (!r || !r.ok || typeof r.content !== "string") return;
    let wd;
    try { wd = JSON.parse(r.content); } catch (e) { return; }
    const cur = (await get()).watchdog || {};
    const next = {
      state: wd.state || "off",
      on_by: wd.on_by || null,
      on_at: wd.on_at || null,
      off_by: wd.off_by || null,
      off_at: wd.off_at || null,
    };
    // Пишем ВСЕГДА оба места (дёшево, раз в 20с).
    const s2 = await get();
    const svc = { ...(s2.svc || {}) };
    svc[ch] = svc[ch] || {};
    svc[ch].watchdog = {
      on: next.state === "on",
      on_by: next.on_by,
      off_by: next.off_by,
      params: (svc[ch].watchdog && svc[ch].watchdog.params) || { interval: 10, threshold: 3 }
    };
    const curSvc = (s2.svc || {})[ch] && (s2.svc || {})[ch].watchdog;
    if (cur.state !== next.state || cur.on_by !== next.on_by
        || cur.off_by !== next.off_by
        || !curSvc || curSvc.on !== (next.state === "on")) {
      await set({ watchdog: next, svc });
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
    }
  } catch (e) { /* тихо */ }
}
setInterval(syncWatchdogState, 20000);
setTimeout(syncWatchdogState, 3000);

startHeartbeat();

let recentTs = [];

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === "hard-reload") {
    console.warn("[bridge bg] hard-reload requested");
    setTimeout(function() { try { chrome.runtime.reload(); } catch (e) { console.warn(e); } }, 300);
    if (respond) respond({ ok: true });
    return true;
  }
  (async () => {
    if (msg.type === "get-state") return respond(await get());
    if (msg.type === "token-estimate") {
      const s = await get();
      const val = msg.value || 0;
      const limit = s.tokenLimit || 1000000;
      const pct = val / limit;
      await set({ tokenEstimate: val, tokenPercent: Math.round(pct * 1000) / 10 });
      const warned = { ...(s.tokenWarned || {}) };
      // Пороги 80/90/95 (оператор, 06.10). tokenLevel = для мигания в панели.
      const lvl = pct >= 0.95 ? "red95" : pct >= 0.90 ? "red90" : pct >= 0.80 ? "red80" : null;
      const level = pct >= 0.95 ? "red95" : pct >= 0.90 ? "red90" : pct >= 0.80 ? "red80"
                    : pct >= 0.60 ? "yellow" : "ok";
      // ЗАГЛУШЕНО (оператор 2026-10-07): мигание + голос раздражали,
      // pct уходил в 140%. Цифры оставляем, реакцию выключаем.
      await set({ tokenLevel: "ok" });
      if (pct < 0.75 && Object.keys(warned).length) { await set({ tokenWarned: {} }); }
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: true, pct: pct });
    }
    if (msg.type === "set") {
      await set(msg.patch);
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: true });
    }
    if (msg.type === "status") return respond(await status(msg.text, msg.level, msg.extra || {}));

    if (msg.type === "notify-stop") {
      const s = await get();
      try {
        const r = await fetch(s.agentUrl + "/notify-stop", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Token": s.token },
          body: JSON.stringify({}),
        });
        const j = await r.json();
        await status("Voice stop signal sent", "warn");
        return respond(j);
      } catch (e) {
        return respond({ ok: false, error: String(e) });
      }
    }

    if (msg.type === "notify") {
      const s = await get();
      try {
        const r = await fetch(s.agentUrl + "/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Token": s.token },
          body: JSON.stringify({
            text: msg.text || "Help needed.",
            repeat: msg.repeat || 5,
            interval: msg.interval || 300,
          }),
        });
        const j = await r.json();
        await status("Notify sent: pid=" + (j.pid || "?"), "warn");
        return respond(j);
      } catch (e) {
        await status("Notify failed: " + String(e).slice(0, 60), "err");
        return respond({ ok: false, error: String(e) });
      }
    }

    if (msg.type === "ping-agent") {
      await heartbeat();
      const s = await get();
      return respond(s.health);
    }

    if (msg.type === "batch") {
      const s0 = await get();
      if (s0.paused) { await status("PAUSED — батч пропущен", "warn"); return respond({ status: "PAUSED" }); }

      const now = Date.now();
      recentTs = recentTs.filter(t => now - t < 2000);
      recentTs.push(now);
      if (recentTs.length > 30) {
        await set({ paused: true });
        await status("Шторм: >30 команд за 2 сек — авто-пауза", "err");
        chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
        return respond({ status: "PAUSED" });
      }

      await status("Принял " + msg.actions.length + " команд", "info", { ids: msg.actions.map(a => a.id) });
      const results = [];
      let lastActionId = null;
      for (const a of msg.actions) {
        const s = await get();
        const pref = (a.id || "").slice(0, 4);
        const lastForPref = (s.lastIds && s.lastIds[pref]) || "";
        if (lastForPref && cmpId(a.id, lastForPref) <= 0) {
          results.push({ id: a.id, status: "SKIP" }); continue;
        }
        if (isDangerous(a) && !s.autoConfirm) {
          await set({ pending: { id: a.id, action: a, tabId: sender.tab && sender.tab.id } });
          await status(a.id + " ждёт подтверждения (" + a.op + ")", "warn");
          results.push({ id: a.id, status: "CONFIRM_REQUIRED" });
          continue;
        }
        await status("Питону: " + a.id + " · " + a.op, "info");
        const res = await exec(a);
        const st = res.ok ? "OK" : "FAIL";
        await pushLedger({ id: a.id, op: a.op, status: st, ts: Date.now() });
        results.push({ id: a.id, op: a.op, status: st, result: res });
        await status("Питон: " + a.id + " · " + st, res.ok ? "ok" : "err");
        lastActionId = a.id;
      }
      if (!lastActionId) lastActionId = msg.actions[msg.actions.length - 1].id;
      await status("Отдаю отчёт в content", "info");
      return respond({ results, nextId: suggestNext(lastActionId) });
    }

    if (msg.type === "confirm-pending") {
      const s = await get();
      const p = s.pending;
      if (!p) return respond({ ok: false });
      await set({ pending: null });
      await status("Подтверждено: " + p.action.id, "info");
      const res = await exec(p.action);
      const st = res.ok ? "OK" : "FAIL";
      await pushLedger({ id: p.action.id, op: p.action.op, status: st, ts: Date.now() });
      if (p.tabId) chrome.tabs.sendMessage(p.tabId, {
        type: "pending-result", id: p.action.id, op: p.action.op, status: st,
        result: res, nextId: suggestNext(p.action.id)
      }).catch(() => {});
      return respond({ ok: true });
    }

    if (msg.type === "svc-start") {
      const ch = msg.channel, kind = msg.kind, params = msg.params || {};
      const cmd = "python sandbox/svc.py start --channel " + ch + " --kind " + kind
        + (kind === "watchdog" ? (" --interval " + (params.interval || 10) + " --threshold " + (params.threshold || 3))
                               : (" --cooldown " + (params.cooldown || 300)));
      const res = await exec({ op: "run", cmd: cmd, cwd: "." });
      const s = await get();
      const svc = { ...(s.svc || {}) };
      svc[ch] = svc[ch] || {};
      // сохраняем ПАРАМЕТРЫ, иначе панель сбрасывает лимит на дефолт (баг)
      const _prm = {};
      if (kind === "watchdog") {
        _prm.interval = params.interval || 10;
        _prm.threshold = params.threshold || 3;
      } else {
        _prm.cooldown = params.cooldown || 300;
      }
      svc[ch][kind] = { on: !!(res && res.ok), params: _prm };
      await set({ svc });
      await status("svc " + kind + " " + ch + ": " + (res && res.ok ? "on" : "fail"), res && res.ok ? "ok" : "err");
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: !!(res && res.ok), result: res });
    }
    if (msg.type === "svc-stop") {
      const ch = msg.channel, kind = msg.kind;
      const res = await exec({ op: "run", cmd: "python sandbox/svc.py stop --channel " + ch + " --kind " + kind, cwd: "." });
      const s = await get();
      const svc = { ...(s.svc || {}) };
      svc[ch] = svc[ch] || {};
      // сохраняем ПАРАМЕТРЫ при stop — иначе теряется введённый лимит
      const _old = svc[ch][kind] || {};
      svc[ch][kind] = { on: false, params: _old.params || {} };
      await set({ svc });
      await status("svc " + kind + " " + ch + ": off", "warn");
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: true });
    }
    if (msg.type === "svc-status") {
      const res = await exec({ op: "run", cmd: "python sandbox/svc.py status --channel " + msg.channel, cwd: "." });
      return respond({ ok: true, result: res });
    }
    if (msg.type === "watchdog-set") {
      const s = await get();
      const wd = { ...(s.watchdog || {}) };
      const now = Date.now();
      if (msg.state === "on") {
        wd.state = "on";
        wd.on_by = msg.by || "unknown";
        wd.on_at = now;
      } else {
        wd.state = "off";
        wd.off_by = msg.by || "unknown";
        wd.off_at = now;
      }
      await set({ watchdog: wd });
      await status("watchdog " + wd.state + " (by " + (msg.by || "?") + ")", wd.state === "on" ? "ok" : "warn");
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: true, watchdog: wd });
    }
    if (msg.type === "watchdog-get") {
      const s = await get();
      return respond({ ok: true, watchdog: s.watchdog || { state: "off" } });
    }
    if (msg.type === "send-inc") {
      const s = await get();
      const sendCount = (s.sendCount || 0) + 1;
      await set({ sendCount });
      chrome.runtime.sendMessage({ type: "state-changed" }).catch(() => {});
      return respond({ ok: true, sendCount });
    }
    if (msg.type === "cancel-pending") { await set({ pending: null }); await status("Отменено", "warn"); return respond({ ok: true }); }
    if (msg.type === "reset-ledger") { await set({ ledger: [], ledgerByPrefix: {}, lastId: "", lastIds: {}, pending: null, statusLog: [], failCount: 0, sessionStartTs: Date.now() }); await status("Ledger сброшен", "warn"); return respond({ ok: true }); }
  })();
  return true;
});