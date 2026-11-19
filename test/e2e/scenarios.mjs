import { launch, state, sleep, VIDEO } from "./common.mjs";
const W = (id, extra = "") => `https://www.youtube.com/watch?v=${id}${extra}`;
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name} ${JSON.stringify(info)}`); };
const { browser, page } = await launch();
await page.evaluateOnNewDocument(() => {
  window.__toasts = [];
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains("ytresume-toast")) window.__toasts.push(n.textContent); })
    .observe(document, { childList: true, subtree: true });
});
const toasts = () => page.evaluate(() => window.__toasts.slice());
const getSaved = (id) => page.evaluate((id) => new Promise((res) => {
  const rid = 999000 + Math.floor(Math.random() * 1000);
  const h = (e) => { const m = JSON.parse(e.detail); if (m.rid === rid) { document.removeEventListener("ytresume:res", h); res(m.value); } };
  document.addEventListener("ytresume:res", h);
  document.dispatchEvent(new CustomEvent("ytresume:req", { detail: JSON.stringify({ rid, op: "get", id }) }));
}), id);
const seekTo = (t) => page.evaluate((t) => document.getElementById("movie_player").seekTo(t, true), t);
const waitPlaying = async (id) => { for (let i = 0; i < 30; i++) { const s = await state(page); if (s.id === id && s.st === 1 && !s.ad) return s; await sleep(1000); } return state(page); };
const open = async (url, id) => { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }); return waitPlaying(id); };
try {
  // 1. save + resume after reload
  await open(W(VIDEO), VIDEO);
  await seekTo(200); await sleep(7000);
  const saved = await getSaved(VIDEO);
  check("saves position", saved && saved.t > 195 && saved.t < 215, saved);
  await page.reload({ waitUntil: "domcontentloaded" }); await waitPlaying(VIDEO); await sleep(2500);
  let s = await state(page);
  check("resumes after reload", s.t >= 200 && s.t < 225, s);
  check("toast shown", (await toasts()).length === 1, await toasts());

  // 2. SPA: go to another video by clicking a recommendation, then history.back()
  const other = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/watch?v="]')].find((a) => !a.href.includes("aqz-KE-bpKQ") && a.offsetParent);
    if (!a) return null; const id = new URL(a.href).searchParams.get("v"); a.click(); return id;
  });
  s = await waitPlaying(other);
  check("SPA nav to other video", s.id === other && s.url.includes(other), { other, s });
  await page.evaluate(() => history.back());
  await waitPlaying(VIDEO); await sleep(2500);
  s = await state(page);
  check("resumes after SPA back", s.id === VIDEO && s.t >= 200 && s.t < 240, s);

  // 3. explicit t= wins
  await open(W(VIDEO, "&t=50"), VIDEO); await sleep(2500);
  s = await state(page);
  check("t= wins over saved", s.t >= 50 && s.t < 70 && !s.toast, s);

  // 4. restart button
  await open(W(VIDEO), VIDEO); await sleep(1500);
  const clicked = await page.evaluate(() => { const b = document.querySelector(".ytresume-toast button"); if (b) b.click(); return !!b; });
  await sleep(2000); s = await state(page);
  check("restart button seeks to 0", clicked && s.t < 10, { clicked, s });
  check("restart button removes entry", (await getSaved(VIDEO)) === null, null);

  // 5. finished video starts from 0
  await seekTo(300); await sleep(6500);
  const d = (await state(page)).d;
  await seekTo(d - 12); await sleep(8000);
  check("finished video entry removed", (await getSaved(VIDEO)) === null, await getSaved(VIDEO));
  await open(W(VIDEO), VIDEO); await sleep(2500);
  s = await state(page);
  check("finished video starts from 0", s.t < 10, s);

  // 6. miniplayer: keep playing while browsing, no re-seek on expand
  await seekTo(150); await sleep(6000);
  await page.evaluate(() => { window.__toasts.length = 0; });
  await page.keyboard.press("i"); await sleep(1500);
  await page.evaluate(() => document.querySelector('a[href="/"], #logo a')?.click()); await sleep(8000);
  s = await state(page);
  const savedMini = await getSaved(VIDEO);
  check("miniplayer keeps saving", !s.url.includes("watch") && s.id === VIDEO && savedMini && Math.abs(savedMini.t - s.t) < 7 && savedMini.t >= 150, { url: s.url, t: s.t, savedMini });
  await page.keyboard.press("i"); await sleep(3000);
  const s2 = await state(page);
  check("miniplayer expand doesn't jump", s2.t >= s.t - 2, { before: s.t, after: s2.t, url: s2.url });
  check("miniplayer expand no toast", (await toasts()).length === 0, await toasts());

  // 7. home page hover previews don't save
  await page.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded" }); await sleep(6000);
  const hovered = [];
  const thumbs = await page.$$('ytd-rich-item-renderer a#thumbnail[href^="/watch"], yt-lockup-view-model a[href^="/watch"]');
  for (const th of thumbs.slice(0, 8)) {
    const href = await th.evaluate((a) => a.getAttribute("href"));
    if (href.includes("aqz-KE-bpKQ") || hovered.length >= 3) continue;
    await th.scrollIntoView(); await th.hover(); await sleep(9000);
    hovered.push({ id: new URL(href, "https://www.youtube.com").searchParams.get("v"), inline: await page.evaluate(() => [...document.querySelectorAll(".html5-video-player")].map((p) => ({ id: p.id, inline: p.isInline?.(), vid: p.getVideoData?.().video_id, t: Math.round(p.getCurrentTime?.() || 0) }))) });
  }
  const pollution = [];
  for (const h of hovered) { const v = await getSaved(h.id); if (v) pollution.push({ ...h, v }); }
  check("hover previews not saved", hovered.length > 0 && pollution.length === 0, { hovered, pollution });
} catch (e) { console.log("ERROR", e.message); await page.screenshot({ path: "error.png" }); }
finally {
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed`);
  await browser.close();
}
