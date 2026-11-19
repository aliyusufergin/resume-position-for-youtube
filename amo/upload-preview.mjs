// Usage: node amo-preview.mjs <image.png> [caption-en] [caption-tr]  (reads WEB_EXT_API_KEY/SECRET from env)
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const b64u = (b) => Buffer.from(b).toString("base64url");
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ iss: process.env.WEB_EXT_API_KEY, jti: randomUUID(), iat: now, exp: now + 60 }));
  const s = createHmac("sha256", process.env.WEB_EXT_API_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
const API = "https://addons.mozilla.org/api/v5/addons/addon/" + encodeURIComponent("@yt-resume-local");
const [file, capEn, capTr] = process.argv.slice(2);
const list = await fetch(API + "/", { headers: { Authorization: `JWT ${jwt()}` } }).then((r) => r.json());
console.log("addon:", list.slug, "status:", list.status, "listed previews:", (list.previews || []).length, "url:", list.url);
if (file) {
  const fd = new FormData();
  fd.set("image", new Blob([readFileSync(file)], { type: "image/png" }), "screenshot-1.png");
  const r = await fetch(API + "/previews/", { method: "POST", headers: { Authorization: `JWT ${jwt()}` }, body: fd });
  const body = await r.text();
  console.log("upload:", r.status, body.slice(0, 300));
  if (r.ok && capEn) {
    const id = JSON.parse(body).id;
    const c = await fetch(API + `/previews/${id}/`, { method: "PATCH", headers: { Authorization: `JWT ${jwt()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ caption: { "en-US": capEn, ...(capTr ? { tr: capTr } : {}) } }) });
    console.log("caption:", c.status, (await c.text()).slice(0, 200));
  }
}
