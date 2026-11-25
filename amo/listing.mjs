// Manage the AMO listing through the v5 API. Reads WEB_EXT_API_KEY / WEB_EXT_API_SECRET from env.
//   node amo/listing.mjs info                                  status, previews
//   node amo/listing.mjs versions                              latest versions and their review status
//   node amo/listing.mjs meta                                  push summary, description, homepage, support_url, tags from amo/metadata.json
//   node amo/listing.mjs add-preview <png> <position> [caption-en] [caption-tr]
//   node amo/listing.mjs edit-preview <id> <position> [caption-en] [caption-tr]
//   node amo/listing.mjs delete-preview <id>
//   node amo/listing.mjs icon <png>                            listing icon (the manifest's SVG may not be used there)
// web-ext cannot upload screenshots, and it only sends a new version's notes for an existing add-on.
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const b64u = (b) => Buffer.from(b).toString("base64url");
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ iss: process.env.WEB_EXT_API_KEY, jti: randomUUID(), iat: now, exp: now + 60 }));
  const s = createHmac("sha256", process.env.WEB_EXT_API_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
const API = "https://addons.mozilla.org/api/v5/addons/addon/" + encodeURIComponent("@yt-resume-local");
async function call(method, path, body) {
  const headers = { Authorization: `JWT ${jwt()}` };
  if (body && !(body instanceof FormData)) { headers["Content-Type"] = "application/json"; body = JSON.stringify(body); }
  const r = await fetch(API + path, { method, headers, body });
  const text = await r.text();
  if (r.status === 429) {   // AMO throttles bursts of writes: wait as told, then retry
    const wait = Number((text.match(/(\d+) seconds?/) || [])[1] || 60);
    console.log(`throttled, retrying in ${wait + 2}s`);
    await new Promise((res) => setTimeout(res, (wait + 2) * 1000));
    return call(method, path, body instanceof FormData || typeof body !== "string" ? body : JSON.parse(body));
  }
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "info") {
  const a = await call("GET", "/");
  console.log(a.slug, a.status, "current:", a.current_version?.version, a.url);
  for (const p of a.previews || []) console.log("preview", p.id, "pos", p.position, JSON.stringify(p.caption));
} else if (cmd === "versions") {
  const v = await call("GET", "/versions/?filter=all_with_unlisted");
  for (const x of v.results.slice(0, 6)) console.log(x.version, x.channel, x.file?.status, x.is_disabled ? "disabled" : "");
} else if (cmd === "meta") {
  const m = JSON.parse(readFileSync(new URL("metadata.json", import.meta.url), "utf8"));
  const body = { summary: m.summary, description: m.description };
  if (m.homepage) body.homepage = m.homepage;
  if (m.support_url) body.support_url = m.support_url;
  if (m.tags) body.tags = m.tags;
  await call("PATCH", "/", body);
  console.log("listing updated:", Object.keys(body).join(", "));
} else if (cmd === "add-preview") {
  const [file, position, capEn, capTr] = args;
  const fd = new FormData();
  fd.set("image", new Blob([readFileSync(file)], { type: "image/png" }), basename(file));
  const p = await call("POST", "/previews/", fd);
  const patch = { position: Number(position) || 0 };
  if (capEn) patch.caption = { "en-US": capEn, ...(capTr ? { tr: capTr } : {}) };
  await call("PATCH", `/previews/${p.id}/`, patch);
  console.log("added preview", p.id);
} else if (cmd === "edit-preview") {
  const [id, position, capEn, capTr] = args;
  const patch = { position: Number(position) || 0 };
  if (capEn) patch.caption = { "en-US": capEn, ...(capTr ? { tr: capTr } : {}) };
  await call("PATCH", `/previews/${id}/`, patch);
  console.log("updated preview", id);
} else if (cmd === "icon") {
  const fd = new FormData();
  fd.set("icon", new Blob([readFileSync(args[0])], { type: "image/png" }), basename(args[0]));
  await call("PATCH", "/", fd);
  console.log("icon updated");
} else if (cmd === "delete-preview") {
  await call("DELETE", `/previews/${args[0]}/`);
  console.log("deleted preview", args[0]);
} else {
  console.log("usage: info | meta | add-preview <png> <position> [en] [tr] | edit-preview <id> <position> [en] [tr] | delete-preview <id>");
}
