// Pure decision logic. Runs in the page (MAIN world) and under Node for tests.
"use strict";

var YTResumeLogic = (function () {
  const MIN_POSITION = 10;   // seconds; earlier than this is "not started"
  const MIN_DURATION = 90;   // seconds; shorter videos are not tracked
  const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

  // Finished = within the last 5% of the video, clamped to 10–30 seconds.
  function endMargin(duration) {
    return Math.min(30, Math.max(10, duration * 0.05));
  }

  function isFinished(t, duration) {
    return duration > 0 && duration - t <= endMargin(duration);
  }

  function validDuration(d) {
    return Number.isFinite(d) && d >= MIN_DURATION;
  }

  // What to do with the current position: "save", "remove" or "skip".
  function saveAction(t, duration) {
    if (!validDuration(duration) || !Number.isFinite(t)) return "skip";
    if (t < MIN_POSITION || isFinished(t, duration)) return "remove";
    return "save";
  }

  // Position to seek to on opening a video, or null.
  function resumeTarget(saved, duration, explicitTime) {
    if (explicitTime || !saved || !Number.isFinite(saved.t)) return null;
    const d = validDuration(duration) ? duration : saved.d;
    if (!validDuration(d)) return null;
    if (saved.t < MIN_POSITION || isFinished(saved.t, d)) return null;
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

  function expiredKeys(entries, now) {
    return Object.keys(entries).filter((k) => {
      const e = entries[k];
      return k.startsWith("v:") && (!e || !Number.isFinite(e.ts) || now - e.ts > MAX_AGE_MS);
    });
  }

  function formatTime(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }

  return { endMargin, isFinished, saveAction, resumeTarget, hasExplicitTime, expiredKeys, formatTime, MAX_AGE_MS };
})();

if (typeof module !== "undefined") module.exports = YTResumeLogic;
