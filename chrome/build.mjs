// Builds the Chrome Web Store package from the shared Firefox sources.
//   node chrome/build.mjs  ->  dist/chrome/ and web-ext-artifacts/resume_position_for_youtube-chrome-<version>.zip
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = new URL("..", import.meta.url).pathname;
const out = root + "dist/chrome/";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const d of ["src", "options"]) cpSync(root + d, out + d, { recursive: true });
rmSync(out + "src/background.js");
cpSync(root + "chrome/icons", out + "icons", { recursive: true });
for (const f of ["compat.js", "background.js", "theme.js"]) cpSync(root + "chrome/" + f, out + "src/" + f);

const m = JSON.parse(readFileSync(root + "manifest.json", "utf8"));
delete m.browser_specific_settings;
// The Chrome Web Store allows at most 132 characters here.
m.description = "Pick up YouTube videos where you left off, even with watch history off. Positions stay in your browser; nothing is sent anywhere.";
if (m.description.length > 132) throw new Error("description too long for Chrome");
m.minimum_chrome_version = "111"; // world: "MAIN" content scripts
m.icons = { 16: "icons/black-16.png", 32: "icons/black-32.png", 48: "icons/black-48.png", 128: "icons/black-128.png" };
m.background = { service_worker: "src/background.js" };
m.action = { default_title: m.action.default_title, default_icon: { 16: "icons/black-16.png", 32: "icons/black-32.png" } };
const iso = m.content_scripts.find((c) => !c.world);
iso.js = ["src/compat.js", "src/theme.js", ...iso.js];
// Chrome injects a file only once per frame, even when two entries list it for different worlds,
// so the MAIN-world entry gets its own copy of logic.js.
const main = m.content_scripts.find((c) => c.world === "MAIN");
main.js = main.js.map((f) => (f === "src/logic.js" ? "src/logic-main.js" : f));
cpSync(out + "src/logic.js", out + "src/logic-main.js");
writeFileSync(out + "manifest.json", JSON.stringify(m, null, 2) + "\n");

const html = readFileSync(out + "options/options.html", "utf8");
const tag = '<script src="../src/logic.js"></script>';
if (!html.includes(tag)) throw new Error("options.html: logic.js tag not found");
writeFileSync(out + "options/options.html", html.replace(tag,
  '<script src="../src/compat.js"></script>\n  <script src="../src/theme.js"></script>\n  ' + tag));
// Logo and favicon stay the adaptive SVG: Chrome renders SVG in <img> and favicons.
cpSync(root + "icons/icon.svg", out + "icons/icon.svg");

mkdirSync(root + "web-ext-artifacts", { recursive: true });
const zip = root + `web-ext-artifacts/resume_position_for_youtube-chrome-${m.version}.zip`;
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", "-X", zip, "."], { cwd: out });
console.log(zip);
