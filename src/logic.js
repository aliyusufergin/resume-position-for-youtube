// Pure decision logic. Runs in the page (MAIN world) and under Node for tests.
"use strict";

var YTResumeLogic = (function () {
  const MIN_POSITION = 10;   // seconds; earlier than this is "not started"
  const DAY_MS = 24 * 60 * 60 * 1000;

  // User settings (stored under "settings"). Every function below takes an optional cfg;
  // a missing or invalid value falls back to its default.
  const DEFAULTS = Object.freeze({
    retentionDays: 90,   // 0 = keep forever
    minDuration: 90,     // seconds; shorter videos are not tracked
    endMargin: 0,        // seconds before the end that count as finished; 0 = automatic
    toast: true,
    thumbs: true,
    thumbColor: "#f59e0b",
  });
  const CHOICES = Object.freeze({
    retentionDays: [30, 90, 180, 365, 0],
    minDuration: [60, 90, 180, 300, 600],
    endMargin: [0, 10, 30, 60, 120],
    thumbColor: ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f9fafb"],
  });

  function normalizeSettings(raw) {
    const out = Object.assign({}, DEFAULTS);
    if (!raw || typeof raw !== "object") return out;
    for (const k of Object.keys(CHOICES)) if (CHOICES[k].includes(raw[k])) out[k] = raw[k];
    for (const k of ["toast", "thumbs"]) if (typeof raw[k] === "boolean") out[k] = raw[k];
    return out;
  }

  const cfgOf = (cfg) => cfg || DEFAULTS;

  // Finished = within the last N seconds. Automatic: 5% of the video, clamped to 10–30 s.
  // A fixed margin never takes more than a fifth of the video.
  function endMargin(duration, cfg) {
    const m = cfgOf(cfg).endMargin;
    if (m > 0) return Math.min(m, duration * 0.2);
    return Math.min(30, Math.max(10, duration * 0.05));
  }

  function isFinished(t, duration, cfg) {
    return duration > 0 && duration - t <= endMargin(duration, cfg);
  }

  function validDuration(d, cfg) {
    return Number.isFinite(d) && d >= cfgOf(cfg).minDuration;
  }

  // What to do with the current position: "save", "done", "remove" or "skip".
  // wasDone: the stored entry already says "watched"; reopening it (which starts at 0)
  // must not wipe that mark just because the position is near the start.
  function saveAction(t, duration, wasDone, cfg) {
    if (!validDuration(duration, cfg) || !Number.isFinite(t)) return "skip";
    if (isFinished(t, duration, cfg)) return "done";
    if (t < MIN_POSITION) return wasDone ? "skip" : "remove";
    return "save";
  }

  // How a thumbnail should look for a stored entry: null, {done: true} or {pct}.
  function thumbState(entry) {
    if (!entry || !Number.isFinite(entry.d) || entry.d <= 0) return null;
    if (entry.done) return { done: true };
    if (!Number.isFinite(entry.t)) return null;
    return { pct: Math.max(2, Math.min(100, (entry.t / entry.d) * 100)) };
  }

  // Position to seek to on opening a video, or null.
  function resumeTarget(saved, duration, explicitTime, cfg) {
    if (explicitTime || !saved || saved.done || !Number.isFinite(saved.t)) return null;
    const d = validDuration(duration, cfg) ? duration : saved.d;
    if (!validDuration(d, cfg)) return null;
    if (saved.t < MIN_POSITION || isFinished(saved.t, d, cfg)) return null;
    return saved.t;
  }

  // True when the URL is this video's watch page with an explicit start time.
  function hasExplicitTime(href, videoId) {
    let url;
    try { url = new URL(href); } catch (e) { return false; }
    if (url.pathname !== "/watch" || url.searchParams.get("v") !== videoId) return false;
    if (url.searchParams.has("t") || url.searchParams.has("start")) return true;
    return /(^#|&)t=/.test(url.hash);
  }

  // Keys of broken entries, and of entries untouched for longer than the retention period.
  function expiredKeys(entries, now, cfg) {
    const days = cfgOf(cfg).retentionDays;
    return Object.keys(entries).filter((k) => {
      const e = entries[k];
      if (!k.startsWith("v:")) return false;
      if (!isEntry(e)) return true;
      return days > 0 && now - e.ts > days * DAY_MS;
    });
  }

  function isEntry(e) {
    return !!e && Number.isFinite(e.t) && Number.isFinite(e.d) && Number.isFinite(e.ts);
  }

  const VIDEO_ID_RE = /^[\w-]{6,20}$/;

  // Backup file: { format, version, exported, settings, videos: { id: {t, d, ts, done?} } }.
  function exportData(all, now) {
    const videos = {};
    for (const [k, e] of Object.entries(all)) {
      if (k.startsWith("v:") && isEntry(e)) videos[k.slice(2)] = e;
    }
    return { format: "yt-resume-backup", version: 1, exported: new Date(now).toISOString(),
      settings: normalizeSettings(all.settings), videos };
  }

  // Merge a backup into what is stored: for each video the more recent entry wins.
  // Returns { set: {key: value}, added, updated, skipped, settings } or throws on a foreign file.
  function importData(backup, existing) {
    if (!backup || backup.format !== "yt-resume-backup" || typeof backup.videos !== "object" || !backup.videos) {
      throw new Error("not a backup");
    }
    const set = {};
    let added = 0, updated = 0, skipped = 0;
    for (const [id, e] of Object.entries(backup.videos)) {
      if (!VIDEO_ID_RE.test(id) || !isEntry(e)) { skipped++; continue; }
      const entry = { t: e.t, d: e.d, ts: e.ts };
      if (e.done === true) entry.done = true;
      const old = existing["v:" + id];
      if (isEntry(old) && old.ts >= e.ts) { skipped++; continue; }
      if (old) updated++; else added++;
      set["v:" + id] = entry;
    }
    return { set, added, updated, skipped, settings: backup.settings ? normalizeSettings(backup.settings) : null };
  }

  function stats(all) {
    let total = 0, done = 0;
    for (const [k, e] of Object.entries(all)) {
      if (!k.startsWith("v:") || !isEntry(e)) continue;
      total++;
      if (e.done) done++;
    }
    return { total, done, partial: total - done };
  }

  function formatTime(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  return {
    DEFAULTS, CHOICES, VIDEO_ID_RE, normalizeSettings, endMargin, isFinished, saveAction, thumbState,
    resumeTarget, hasExplicitTime, expiredKeys, exportData, importData, stats, formatTime,
  };
})();

if (typeof module !== "undefined") module.exports = YTResumeLogic;
