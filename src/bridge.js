// Isolated-world content script: owns storage, answers requests from page.js.
// Messages travel as JSON strings in CustomEvent.detail so nothing crosses worlds as an object.
"use strict";

(function () {
  const REQ = "ytresume:req";
  const RES = "ytresume:res";
  const PUSH = "ytresume:settings";
  const PRUNE_KEY = "meta:lastPrune";
  const L = YTResumeLogic;
  const DAY = 24 * 60 * 60 * 1000;
  const key = (id) => "v:" + id;

  function reply(rid, value) {
    document.dispatchEvent(new CustomEvent(RES, { detail: JSON.stringify({ rid, value }) }));
  }

  document.addEventListener(REQ, async (e) => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch (err) { return; }
    if (!msg) return;
    if (msg.op === "settings") {
      reply(msg.rid, await loadSettings().catch(() => L.DEFAULTS));
      return;
    }
    if (typeof msg.id !== "string" || !L.VIDEO_ID_RE.test(msg.id)) return;
    try {
      if (msg.op === "get") {
        const r = await browser.storage.local.get(key(msg.id));
        reply(msg.rid, r[key(msg.id)] || null);
      } else if (msg.op === "set" && msg.value) {
        const { t, d } = msg.value;
        if (Number.isFinite(t) && Number.isFinite(d)) {
          await browser.storage.local.set({ [key(msg.id)]: L.makeEntry(msg.value, Date.now()) });
        }
      } else if (msg.op === "remove") {
        await browser.storage.local.remove(key(msg.id));
      }
    } catch (err) {
      console.warn("[yt-resume]", err);
      if (msg.op === "get") reply(msg.rid, null);
    }
  });

  async function loadSettings() {
    const r = await browser.storage.local.get("settings");
    return L.normalizeSettings(r.settings);
  }

  // page.js asks once at start; later changes from the options page are pushed.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.settings) return;
    const cfg = L.normalizeSettings(changes.settings.newValue);
    document.dispatchEvent(new CustomEvent(PUSH, { detail: JSON.stringify(cfg) }));
  });

  loadSettings()
    .then((cfg) => document.dispatchEvent(new CustomEvent(PUSH, { detail: JSON.stringify(cfg) })))
    .catch((err) => console.warn("[yt-resume] settings", err));

  // Drop entries older than the retention setting, at most once a day.
  // (The options page prunes right away when the setting changes.)
  async function prune() {
    const now = Date.now();
    const meta = await browser.storage.local.get(PRUNE_KEY);
    if (now - (meta[PRUNE_KEY] || 0) < DAY) return;
    const all = await browser.storage.local.get(null);
    const expired = L.expiredKeys(all, now, L.normalizeSettings(all.settings));
    if (expired.length) await browser.storage.local.remove(expired);
    await browser.storage.local.set({ [PRUNE_KEY]: now });
  }
  prune().catch((err) => console.warn("[yt-resume] prune", err));
})();
