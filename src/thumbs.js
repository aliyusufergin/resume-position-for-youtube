// Isolated-world content script: draws a progress bar / "watched" badge on video thumbnails
// from the positions in storage, following the thumbnail settings. Reads storage directly and follows its changes live.
"use strict";

(function () {
  const L = YTResumeLogic;

  // --- YouTube-specific selectors: keep them all here. ---
  // New layout: <a href="/watch?v=…"> … <yt-thumbnail-view-model>; playlist covers wrap it
  // in yt-collection-thumbnail-view-model and are skipped. Old layout: ytd-thumbnail a#thumbnail.
  const THUMB_SELECTOR = 'a[href*="/watch?v="] yt-thumbnail-view-model, ytd-thumbnail a#thumbnail[href*="/watch?v="]';
  const SKIP_SELECTOR = "yt-collection-thumbnail-view-model";
  // --------------------------------------------------------

  const WATCHED = { tr: "İzlendi", de: "Gesehen", fr: "Vue", es: "Visto", pt: "Assistido", ru: "Просмотрено" }[(navigator.language || "en").slice(0, 2).toLowerCase()] || "Watched";
  const entries = new Map(); // videoId -> stored entry
  let cfg = L.DEFAULTS;

  function applySettings(raw) {
    cfg = L.normalizeSettings(raw);
    document.documentElement.style.setProperty("--ytr-color", cfg.thumbColor);
  }

  function videoIdOf(el) {
    const a = el.tagName === "A" ? el : el.closest("a[href]");
    if (!a) return null;
    try { return new URL(a.getAttribute("href"), location.origin).searchParams.get("v"); } catch (e) { return null; }
  }

  // YouTube recycles thumbnail elements for other videos, so state is keyed on what is
  // currently rendered (data-ytr) and redrawn whenever it differs.
  function render(host) {
    if (host.closest(SKIP_SELECTOR)) return;
    const id = videoIdOf(host);
    const st = id && cfg.thumbs ? L.thumbState(entries.get(id)) : null;
    const sig = st ? (st.done ? "done" : "p" + Math.round(st.pct)) + ":" + id : "";
    if ((host.dataset.ytr || "") === sig) return;
    host.dataset.ytr = sig;
    let box = host.querySelector(":scope > .ytr-thumb");
    if (!st) { if (box) box.remove(); host.classList.remove("ytr-host"); return; }
    if (!box) {
      box = document.createElement("div");
      box.className = "ytr-thumb";
      const bar = document.createElement("div");
      bar.className = "ytr-bar";
      bar.appendChild(document.createElement("div")).className = "ytr-fill";
      const badge = document.createElement("span");
      badge.className = "ytr-badge";
      badge.textContent = "✓ " + WATCHED;
      box.append(bar, badge);
      host.appendChild(box);
    }
    host.classList.add("ytr-host");
    box.classList.toggle("ytr-done", !!st.done);
    box.querySelector(".ytr-fill").style.width = (st.done ? 100 : st.pct) + "%";
  }

  function scan() {
    for (const host of document.querySelectorAll(THUMB_SELECTOR)) render(host);
  }

  let queued = false;
  function queueScan() {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; scan(); }, 250);
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let touched = false;
    if (changes.settings) { applySettings(changes.settings.newValue); touched = true; }
    for (const [k, c] of Object.entries(changes)) {
      if (!k.startsWith("v:")) continue;
      touched = true;
      if (c.newValue) entries.set(k.slice(2), c.newValue); else entries.delete(k.slice(2));
    }
    if (touched) queueScan();
  });

  browser.storage.local.get(null).then((all) => {
    applySettings(all.settings);
    for (const [k, v] of Object.entries(all)) if (k.startsWith("v:")) entries.set(k.slice(2), v);
    const start = () => {
      new MutationObserver(queueScan).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ["href"],
      });
      scan();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }).catch((err) => console.warn("[yt-resume] thumbs", err));
})();
