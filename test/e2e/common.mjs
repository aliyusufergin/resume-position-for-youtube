// Browser scenarios against real YouTube. Needs Firefox 140+: FIREFOX_BIN=/path/to/firefox npm run e2e
import puppeteer from "puppeteer-core";
const EXT = new URL("../..", import.meta.url).pathname;
export const VIDEO = "aqz-KE-bpKQ"; // Big Buck Bunny, ~10 min
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function launch() {
  const browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: process.env.FIREFOX_BIN || "firefox",
    headless: true,
    env: { ...process.env },
    extraPrefsFirefox: { "media.autoplay.default": 0, "media.autoplay.blocking_policy": 0, "intl.accept_languages": "en-US" },
    protocolTimeout: 120000,
  });
  await browser.installExtension(EXT);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  return { browser, page };
}
export async function handleConsent(page) {
  if (!page.url().includes("consent.")) return false;
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /reject all|tümünü reddet/i.test(x.textContent));
    if (b) { b.click(); return true; } return false;
  });
  await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
  return clicked;
}
export async function state(page) {
  return page.evaluate(() => {
    const p = document.getElementById("movie_player");
    return {
      url: location.href,
      ext: typeof YTResumeLogic,
      hasPlayer: !!(p && p.getVideoData),
      id: p && p.getVideoData && p.getVideoData().video_id,
      t: p && p.getCurrentTime && Math.round(p.getCurrentTime()),
      d: p && p.getDuration && Math.round(p.getDuration()),
      st: p && p.getPlayerState && p.getPlayerState(),
      ad: p ? /ad-(showing|interrupting)/.test(p.className) : null,
      toast: document.querySelector(".ytresume-toast")?.textContent || null,
    };
  });
}
