const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

test("saveAction", () => {
  assert.equal(L.saveAction(120, 600), "save");
  assert.equal(L.saveAction(5, 600), "remove");          // barely started
  assert.equal(L.saveAction(5, 600, true), "skip");      // reopened a watched video: keep the mark
  assert.equal(L.saveAction(120, 600, true), "save");    // rewatching past 10s: partial again
  assert.equal(L.saveAction(575, 600), "done");          // last 30s (5% of 600 = 30)
  assert.equal(L.saveAction(569, 600), "save");
  assert.equal(L.saveAction(30, 60), "skip");            // too short to track
  assert.equal(L.saveAction(30, Infinity), "skip");      // live / unknown
  assert.equal(L.saveAction(NaN, 600), "skip");
});

test("end margin is 5% clamped to 10–30s", () => {
  assert.equal(L.endMargin(100), 10);
  assert.equal(L.endMargin(400), 20);
  assert.equal(L.endMargin(7200), 30);
  assert.equal(L.isFinished(7171, 7200), true);
  assert.equal(L.isFinished(7000, 7200), false);
});

test("resumeTarget", () => {
  assert.equal(L.resumeTarget({ t: 300, d: 600 }, 600, false), 300);
  assert.equal(L.resumeTarget({ t: 300, d: 600 }, 600, true), null);   // t= wins
  assert.equal(L.resumeTarget(null, 600, false), null);
  assert.equal(L.resumeTarget({ t: 590, d: 600 }, 600, false), null);  // finished
  assert.equal(L.resumeTarget({ t: 300, d: 600 }, NaN, false), 300);   // falls back to saved d
  assert.equal(L.resumeTarget({ t: 3, d: 600 }, 600, false), null);
});

test("watched entries never resume", () => {
  assert.equal(L.resumeTarget({ t: 300, d: 600, done: true }, 600, false), null);
});

test("thumbState", () => {
  assert.equal(L.thumbState(null), null);
  assert.deepEqual(L.thumbState({ t: 590, d: 600, done: true }), { done: true });
  assert.deepEqual(L.thumbState({ t: 150, d: 600 }), { pct: 25 });
  assert.deepEqual(L.thumbState({ t: 1, d: 600 }), { pct: 2 });   // always visible
  assert.equal(L.thumbState({ t: 1, d: 0 }), null);
});

test("hasExplicitTime", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&t=42s`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&start=42`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}#t=1m2s`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&list=PL1`, id), false);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=other&t=42`, id), false); // stale URL
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/feed/subscriptions`, id), false); // miniplayer
});

test("expiredKeys follows the retention setting", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const entries = {
    "v:new": { t: 1, d: 2, ts: now - 1000 },
    "v:d60": { t: 1, d: 2, ts: now - 60 * DAY },
    "v:old": { t: 1, d: 2, ts: now - 91 * DAY },
    "v:bad": { t: 1 },
    "meta:lastPrune": 0,
    settings: { retentionDays: 30 },
  };
  assert.deepEqual(L.expiredKeys(entries, now).sort(), ["v:bad", "v:old"]);          // default 90
  assert.deepEqual(L.expiredKeys(entries, now, { retentionDays: 30 }).sort(), ["v:bad", "v:d60", "v:old"]);
  assert.deepEqual(L.expiredKeys(entries, now, { retentionDays: 0 }), ["v:bad"]);    // forever
});

test("normalizeSettings keeps only known values", () => {
  assert.deepEqual(L.normalizeSettings(undefined), L.DEFAULTS);
  const s = L.normalizeSettings({ retentionDays: 0, minDuration: 7, toast: false, thumbs: "no", thumbColor: "#3b82f6", x: 1 });
  assert.equal(s.retentionDays, 0);
  assert.equal(s.minDuration, 90);
  assert.equal(s.toast, false);
  assert.equal(s.thumbs, true);
  assert.equal(s.thumbColor, "#3b82f6");
  assert.equal("x" in s, false);
});

test("behaviour settings", () => {
  const cfg = L.normalizeSettings({ minDuration: 300, endMargin: 120 });
  assert.equal(L.saveAction(100, 200, false, cfg), "skip");      // shorter than 5 min
  assert.equal(L.saveAction(100, 200), "save");
  assert.equal(L.saveAction(1100, 1200, false, cfg), "done");    // last 2 minutes
  assert.equal(L.saveAction(1100, 1200), "save");
  assert.equal(L.endMargin(400, cfg), 80);                       // capped at a fifth of the video
  assert.equal(L.resumeTarget({ t: 1100, d: 1200 }, 1200, false, cfg), null);
});

test("export / import round trip, newer entry wins", () => {
  const now = Date.now();
  const all = {
    "v:aaaaaaaaaaa": { t: 50, d: 600, ts: 100 },
    "v:bbbbbbbbbbb": { t: 590, d: 600, ts: 200, done: true },
    "v:junk": { t: 1 },
    "meta:lastPrune": 5,
    settings: { retentionDays: 365 },
  };
  const backup = JSON.parse(JSON.stringify(L.exportData(all, now)));
  assert.deepEqual(Object.keys(backup.videos).sort(), ["aaaaaaaaaaa", "bbbbbbbbbbb"]);
  assert.equal(backup.settings.retentionDays, 365);
  const existing = { "v:aaaaaaaaaaa": { t: 70, d: 600, ts: 150 } };
  backup.videos["bad id!"] = { t: 1, d: 600, ts: 1 };
  const r = L.importData(backup, existing);
  assert.deepEqual(Object.keys(r.set), ["v:bbbbbbbbbbb"]);     // local "a" is newer
  assert.equal(r.set["v:bbbbbbbbbbb"].done, true);
  assert.deepEqual([r.added, r.updated, r.skipped], [1, 0, 2]);
  assert.throws(() => L.importData({ hello: 1 }, {}));
  assert.deepEqual(L.stats(all), { total: 2, done: 1, partial: 1 });
});

test("formatTime", () => {
  assert.equal(L.formatTime(65), "1:05");
  assert.equal(L.formatTime(3725.9), "1:02:05");
});

test("entries keep a cleaned title and channel", () => {
  const e = L.makeEntry({ t: 5, d: 600, done: true, title: "  A   title\n", author: 42, extra: 1 }, 7);
  assert.deepEqual(e, { t: 5, d: 600, ts: 7, done: true, title: "A title" });
  assert.equal(L.makeEntry({ t: 1, d: 2, title: "x".repeat(500) }, 1).title.length, 200);
  const r = L.importData({ format: "yt-resume-backup", videos: { aaaaaaaaaaa: { t: 1, d: 600, ts: 5, title: "T", author: "C" } } }, {});
  assert.deepEqual(r.set["v:aaaaaaaaaaa"], { t: 1, d: 600, ts: 5, title: "T", author: "C" });
});
