const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../src/logic.js");

test("saveAction", () => {
  assert.equal(L.saveAction(120, 600), "save");
  assert.equal(L.saveAction(5, 600), "remove");          // barely started
  assert.equal(L.saveAction(575, 600), "remove");        // last 30s (5% of 600 = 30)
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

test("hasExplicitTime", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&t=42s`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&start=42`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}#t=1m2s`, id), true);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=${id}&list=PL1`, id), false);
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/watch?v=other&t=42`, id), false); // stale URL
  assert.equal(L.hasExplicitTime(`https://www.youtube.com/feed/subscriptions`, id), false); // miniplayer
});

test("expiredKeys", () => {
  const now = Date.now();
  const entries = {
    "v:new": { t: 1, d: 2, ts: now - 1000 },
    "v:old": { t: 1, d: 2, ts: now - L.MAX_AGE_MS - 1 },
    "v:bad": { t: 1 },
    "meta:lastPrune": 0,
  };
  assert.deepEqual(L.expiredKeys(entries, now).sort(), ["v:bad", "v:old"]);
});

test("formatTime", () => {
  assert.equal(L.formatTime(65), "1:05");
  assert.equal(L.formatTime(3725.9), "1:02:05");
});
