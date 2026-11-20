// Isolated-world content script: owns storage, answers requests from page.js.
// Messages travel as JSON strings in CustomEvent.detail so nothing crosses worlds as an object.
"use strict";

(function () {
  const REQ = "ytresume:req";
  const RES = "ytresume:res";
  const PRUNE_KEY = "meta:lastPrune";
  const DAY = 24 * 60 * 60 * 1000;
  const key = (id) => "v:" + id;

  function reply(rid, value) {
    document.dispatchEvent(new CustomEvent(RES, { detail: JSON.stringify({ rid, value }) }));
  }

  document.addEventListener(REQ, async (e) => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch (err) { return; }
    if (!msg || typeof msg.id !== "string" || !/^[\w-]{6,20}$/.test(msg.id)) return;
    try {
      if (msg.op === "get") {
        const r = await browser.storage.local.get(key(msg.id));
        reply(msg.rid, r[key(msg.id)] || null);
      } else if (msg.op === "set" && msg.value) {
        const { t, d, done } = msg.value;
        if (Number.isFinite(t) && Number.isFinite(d)) {
          const entry = { t, d, ts: Date.now() };
          if (done === true) entry.done = true;
          await browser.storage.local.set({ [key(msg.id)]: entry });
        }
      } else if (msg.op === "remove") {
        await browser.storage.local.remove(key(msg.id));
      }
    } catch (err) {
      console.warn("[yt-resume]", err);
      if (msg.op === "get") reply(msg.rid, null);
    }
  });

  // Drop entries untouched for 90 days, at most once a day.
  async function prune() {
    const now = Date.now();
    const meta = await browser.storage.local.get(PRUNE_KEY);
    if (now - (meta[PRUNE_KEY] || 0) < DAY) return;
    const all = await browser.storage.local.get(null);
    const expired = YTResumeLogic.expiredKeys(all, now);
    if (expired.length) await browser.storage.local.remove(expired);
    await browser.storage.local.set({ [PRUNE_KEY]: now });
  }
  prune().catch((err) => console.warn("[yt-resume] prune", err));
})();
