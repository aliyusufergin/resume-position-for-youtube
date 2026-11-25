// MAIN-world content script: watches the YouTube player, saves and restores position.
// Storage goes through bridge.js (isolated world) because the page world has no extension APIs.
"use strict";

(function () {
  const L = YTResumeLogic;

  // --- YouTube-specific selectors and names: keep them all here. ---
  const PLAYER_ID = "movie_player";
  const PREVIEW_SELECTOR = "#inline-preview-player, ytd-video-preview, .ytp-inline-preview";
  const AD_CLASS_RE = /\bad-(showing|interrupting)\b/;
  // -----------------------------------------------------------------

  const SAVE_INTERVAL_MS = 5000;
  const VERIFY_DELAY_MS = 1200;
  const TOAST_MS = 6000;

  // UI text follows the browser language (the page world has no i18n API).
  const STRINGS = {
    en: { resumed: "Resumed at ", restart: "Start over" },
    tr: { resumed: "Kaldığın yerden devam: ", restart: "Baştan başlat" },
    de: { resumed: "Fortgesetzt bei ", restart: "Von vorn" },
    fr: { resumed: "Reprise à ", restart: "Recommencer" },
    es: { resumed: "Reanudado en ", restart: "Empezar de nuevo" },
    pt: { resumed: "Retomado em ", restart: "Começar do início" },
    ru: { resumed: "Продолжено с ", restart: "Сначала" },
  };
  const T = STRINGS[(navigator.language || "en").slice(0, 2).toLowerCase()] || STRINGS.en;
  const NEAR_S = 10;

  // ---------- settings ----------
  // bridge.js pushes them on load and on every change; we also ask once, in case its push
  // went out before this script was listening. Either one unblocks the first resume.
  let cfg = L.DEFAULTS;
  let markReady;
  const settingsReady = new Promise((resolve) => { markReady = resolve; });
  setTimeout(() => markReady(), 1500);
  document.addEventListener("ytresume:settings", (e) => {
    try { cfg = L.normalizeSettings(JSON.parse(e.detail)); } catch (err) { /* keep current */ }
    markReady();
  });

  // ---------- bridge ----------
  let nextRid = 1;
  const pending = new Map();
  document.addEventListener("ytresume:res", (e) => {
    let msg;
    try { msg = JSON.parse(e.detail); } catch (err) { return; }
    const resolve = pending.get(msg.rid);
    if (resolve) { pending.delete(msg.rid); resolve(msg.value); }
  });
  function send(op, id, value) {
    const rid = nextRid++;
    const p = op === "get" || op === "settings"
      ? new Promise((resolve) => {
          pending.set(rid, resolve);
          setTimeout(() => { if (pending.delete(rid)) resolve(null); }, 3000);
        })
      : Promise.resolve();
    document.dispatchEvent(new CustomEvent("ytresume:req", { detail: JSON.stringify({ rid, op, id, value }) }));
    return p;
  }
  send("settings").then((v) => { if (v) cfg = L.normalizeSettings(v); markReady(); });

  // ---------- player helpers ----------
  function mainPlayerFor(video) {
    const p = video.closest(".html5-video-player");
    if (!p || p.id !== PLAYER_ID || video.closest(PREVIEW_SELECTOR)) return null;
    if (typeof p.getVideoData !== "function") return null;
    if (typeof p.isInline === "function" && p.isInline()) return null;
    return p;
  }
  const adShowing = (p) => AD_CLASS_RE.test(p.className);

  // ---------- session state ----------
  // One session per video the main player shows. phase: "loading" -> "active".
  let cur = null;

  function save(force) {
    const s = cur;
    if (!s || s.phase !== "active" || s.skip) return;
    const p = s.player;
    if (!p.isConnected || adShowing(p) || p.getVideoData().video_id !== s.id) return;
    const now = Date.now();
    if (!force && now - s.lastSave < SAVE_INTERVAL_MS) return;
    s.lastSave = now;
    const t = p.getCurrentTime();
    const d = p.getDuration();
    const action = L.saveAction(t, d, s.wasDone, cfg);
    const data = p.getVideoData() || {};
    const label = { title: data.title, author: data.author };
    if (action === "save") { s.wasDone = false; send("set", s.id, { t, d, ...label }); }
    else if (action === "done") { s.wasDone = true; send("set", s.id, { t, d, done: true, ...label }); }
    else if (action === "remove") send("remove", s.id);
  }

  function seek(p, t) { p.seekTo(t, true); }

  function startSession(id, p, data) {
    // Close out the previous video before switching.
    save(true);
    const s = { id, player: p, phase: "loading", lastSave: 0, skip: !!(data.isLive || data.isPremiere) };
    cur = s;
    if (s.skip) return;
    const explicit = L.hasExplicitTime(location.href, id);
    Promise.all([send("get", id), settingsReady]).then(([saved]) => {
      if (cur !== s) return;
      s.wasDone = !!(saved && saved.done);
      const target = L.resumeTarget(saved, p.getDuration(), explicit, cfg);
      // Already there (miniplayer expanded, mid-roll ad ended): don't jump or announce.
      if (target === null || Math.abs(p.getCurrentTime() - target) < NEAR_S) { s.phase = "active"; return; }
      seek(p, target);
      if (cfg.toast) showToast(p, target, s);
      // YouTube's own start-up seek can land after ours; check once and redo.
      setTimeout(() => {
        if (cur !== s) return;
        if (!s.restarted && !adShowing(p) && p.getCurrentTime() < target - 3) seek(p, target);
        s.phase = "active";
      }, VERIFY_DELAY_MS);
    });
  }

  function onTimeUpdate(e) {
    const video = e.target;
    if (!(video instanceof HTMLVideoElement)) return;
    const p = mainPlayerFor(video);
    if (!p || adShowing(p)) return;
    const data = p.getVideoData();
    const id = data && data.video_id;
    if (!id) return;
    if (!cur || cur.id !== id || cur.player !== p) startSession(id, p, data);
    else save(false);
  }

  document.addEventListener("timeupdate", onTimeUpdate, true);
  document.addEventListener("pause", (e) => {
    if (cur && e.target instanceof HTMLVideoElement && mainPlayerFor(e.target) === cur.player) save(true);
  }, true);
  // A seek states where the user wants to be, even if the video then stalls buffering
  // (no timeupdate follows), so save it right away. getCurrentTime() already returns the target.
  for (const type of ["ended", "seeking"]) {
    document.addEventListener(type, (e) => {
      if (cur && e.target instanceof HTMLVideoElement && mainPlayerFor(e.target) === cur.player) save(true);
    }, true);
  }
  // Fires while the player still shows the old video: last chance to save it.
  // Then end the session, so returning to the same video (back button, playlist)
  // is treated as a fresh open even if no other video played in between.
  document.addEventListener("yt-navigate-start", () => { save(true); cur = null; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); });
  window.addEventListener("pagehide", () => save(true));

  // ---------- toast ----------
  // Built with DOM APIs only: YouTube enforces Trusted Types, so no innerHTML.
  function showToast(p, target, s) {
    const old = p.querySelector(".ytresume-toast");
    if (old) old.remove();
    const box = document.createElement("div");
    box.className = "ytresume-toast";
    Object.assign(box.style, {
      position: "absolute", left: "12px", bottom: "64px", zIndex: "70",
      display: "flex", alignItems: "center", gap: "12px",
      padding: "8px 12px", borderRadius: "8px",
      background: "rgba(0,0,0,.8)", color: "#fff",
      font: "500 14px/1.3 Roboto, Arial, sans-serif",
      transition: "opacity .3s", opacity: "1",
    });
    const label = document.createElement("span");
    label.textContent = T.resumed + L.formatTime(target);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = T.restart;
    Object.assign(btn.style, {
      background: "none", border: "1px solid rgba(255,255,255,.6)", borderRadius: "4px",
      color: "#fff", font: "inherit", padding: "4px 8px", cursor: "pointer",
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      s.restarted = true;
      seek(p, 0);
      send("remove", s.id);
      box.remove();
    });
    // Keep clicks on the toast from toggling play/pause.
    box.addEventListener("click", (e) => e.stopPropagation());
    box.append(label, btn);
    p.appendChild(box);
    setTimeout(() => { box.style.opacity = "0"; }, TOAST_MS);
    setTimeout(() => box.remove(), TOAST_MS + 400);
  }
})();
