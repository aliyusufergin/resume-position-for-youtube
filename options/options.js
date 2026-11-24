// Options page: settings, stored-data overview, backup and restore.
"use strict";

(function () {
  const L = YTResumeLogic;
  const $ = (id) => document.getElementById(id);

  const STRINGS = {
    en: {
      pageTitle: "Resume Position for YouTube settings",
      name: "Resume Position for YouTube",
      lead: "Remembers where you stopped each YouTube video, in this browser only. Changes apply right away.",
      resumed: "Resumed at ", restart: "Start over", watched: "Watched",
      previewCaption: "Preview. It follows your settings.",
      hResume: "Resuming",
      toastLabel: "Show a notice when resuming",
      toastDesc: "Shows the time you resumed at and a Start over button for a few seconds.",
      minLabel: "Shortest video to remember",
      minDesc: "Positions in shorter videos aren't saved.",
      endLabel: "Count as watched",
      endDesc: "Close a video this close to its end and it counts as watched, so it starts from the beginning next time. Automatic is the last 5% (10 to 30 seconds).",
      hThumbs: "Thumbnails",
      thumbsLabel: "Show progress on thumbnails",
      thumbsDesc: "A bar under videos you started, and a Watched badge on the ones you finished. In search, recommendations and channel pages.",
      colorLabel: "Bar color",
      hData: "Saved positions",
      retLabel: "Keep positions for",
      retDesc: "Positions of videos you haven't opened for this long are deleted.",
      retConfirm: (n, label) => `${n} saved ${n === 1 ? "position is" : "positions are"} older than ${label} and will be deleted now.`,
      retConfirmYes: "Delete and keep the change", cancel: "Cancel",
      retDeleted: (n) => `Deleted ${n} old ${n === 1 ? "position" : "positions"}.`,
      total: (n) => n === 1 ? "1 video saved" : `${n} videos saved`,
      empty: "Nothing saved yet. Watch a video for more than 10 seconds and it shows up here.",
      partial: "in progress", done: "watched",
      export: "Download backup", import: "Restore from backup", clear: "Delete all positions",
      clearConfirm: (n) => `Delete all ${n} saved ${n === 1 ? "position" : "positions"}? This can't be undone.`,
      clearYes: "Delete all", cleared: "All positions deleted.",
      exported: "Backup downloaded.",
      imported: (a, u, s) => `Restored ${a} new and ${u} updated ${a + u === 1 ? "position" : "positions"}` +
        (s ? `, skipped ${s} (the copy here was newer or the entry was invalid)` : "") + ". Settings were restored too.",
      importFailed: "That file isn't a backup from this add-on. Choose a file downloaded with Download backup.",
      privacy: "Everything stays in this browser. The add-on makes no network requests and keeps no account.",
      version: (v) => `Version ${v}`,
      hVideos: "Videos", search: "Search by title or channel",
      untitled: (id) => `Video ${id}`, untitledHint: "Title appears after you watch it again",
      del: "Delete", delLabel: (t) => `Delete ${t}`, deletedOne: (t) => `Deleted “${t}”.`, undo: "Undo",
      more: (n) => `Show ${n} more`, noMatch: "No videos match.",
      colors: ["Amber", "Red", "Blue", "Green", "Purple", "White"],
      auto: "Automatic", forever: "Forever",
      sec: (n) => `${n} s`, min: (n) => `${n} min`, days: (n) => `${n} days`, months: (n) => `${n} months`, year: "1 year",
    },
    tr: {
      pageTitle: "Resume Position for YouTube ayarları",
      name: "Resume Position for YouTube",
      lead: "YouTube videolarında kaldığın yeri yalnızca bu tarayıcıda hatırlar. Değişiklikler hemen uygulanır.",
      resumed: "Kaldığın yerden devam: ", restart: "Baştan başlat", watched: "İzlendi",
      previewCaption: "Önizleme. Ayarlarına göre değişir.",
      hResume: "Kaldığın yerden devam",
      toastLabel: "Devam ederken bildirim göster",
      toastDesc: "Birkaç saniye boyunca devam edilen süreyi ve Baştan başlat düğmesini gösterir.",
      minLabel: "Hatırlanacak en kısa video",
      minDesc: "Daha kısa videolarda konum kaydedilmez.",
      endLabel: "İzlendi sayılsın",
      endDesc: "Videoyu sonuna bu kadar kala kapatırsan izlendi sayılır ve bir dahakine baştan başlar. Otomatik: videonun son %5'i (10–30 saniye).",
      hThumbs: "Küçük resimler",
      thumbsLabel: "Küçük resimlerde ilerlemeyi göster",
      thumbsDesc: "Başladığın videoların altında bir çubuk, bitirdiklerinde İzlendi etiketi. Arama, öneriler ve kanal sayfalarında.",
      colorLabel: "Çubuk rengi",
      hData: "Kayıtlı konumlar",
      retLabel: "Konumları sakla",
      retDesc: "Bu süre boyunca açmadığın videoların konumları silinir.",
      retConfirm: (n, label) => `${label} süresinden eski ${n} kayıt şimdi silinecek.`,
      retConfirmYes: "Sil ve değiştir", cancel: "Vazgeç",
      retDeleted: (n) => `Eski ${n} kayıt silindi.`,
      total: (n) => `${n} video kayıtlı`,
      empty: "Henüz kayıt yok. Bir videoyu 10 saniyeden fazla izleyince burada görünür.",
      partial: "yarım", done: "izlendi",
      export: "Yedeği indir", import: "Yedekten geri yükle", clear: "Tüm kayıtları sil",
      clearConfirm: (n) => `Kayıtlı ${n} konumun tümü silinsin mi? Bu geri alınamaz.`,
      clearYes: "Tümünü sil", cleared: "Tüm kayıtlar silindi.",
      exported: "Yedek indirildi.",
      imported: (a, u, s) => `Geri yüklendi: ${a} yeni, ${u} güncellenen kayıt` +
        (s ? `; ${s} kayıt atlandı (buradaki daha yeni ya da kayıt bozuk)` : "") + ". Ayarlar da yedekten alındı.",
      importFailed: "Bu dosya bu eklentinin yedeği değil. Yedeği indir ile alınmış bir dosya seç.",
      privacy: "Her şey bu tarayıcıda kalır. Eklenti hiçbir ağ isteği yapmaz, hesap tutmaz.",
      version: (v) => `Sürüm ${v}`,
      hVideos: "Videolar", search: "Başlık ya da kanal ara",
      untitled: (id) => `Video ${id}`, untitledHint: "Başlık, videoyu tekrar izleyince görünür",
      del: "Sil", delLabel: (t) => `${t} kaydını sil`, deletedOne: (t) => `“${t}” silindi.`, undo: "Geri al",
      more: (n) => `${n} video daha göster`, noMatch: "Eşleşen video yok.",
      colors: ["Kehribar", "Kırmızı", "Mavi", "Yeşil", "Mor", "Beyaz"],
      auto: "Otomatik", forever: "Süresiz",
      sec: (n) => `${n} sn`, min: (n) => `${n} dk`, days: (n) => `${n} gün`, months: (n) => `${n} ay`, year: "1 yıl",
    },
  };
  const lang = (browser.i18n.getUILanguage() || "en").slice(0, 2).toLowerCase() === "tr" ? "tr" : "en";
  const T = STRINGS[lang];
  document.documentElement.lang = lang;

  // Labels for each choice in L.CHOICES.
  const LABELS = {
    minDuration: (v) => (v % 60 ? T.min(String(v / 60).replace(".", lang === "tr" ? "," : ".")) : T.min(v / 60)),
    endMargin: (v) => (v === 0 ? T.auto : v < 60 ? T.sec(v) : T.min(v / 60)),
    retentionDays: (v) => (v === 0 ? T.forever : v === 365 ? T.year : v === 180 ? T.months(6) : T.days(v)),
  };

  let cfg = L.DEFAULTS;
  let all = {};

  // ---------- text ----------
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const v = T[el.dataset.i18n];
    if (typeof v === "string") el.textContent = v;
  }
  $("version").textContent = T.version(browser.runtime.getManifest().version);

  // ---------- controls ----------
  for (const group of document.querySelectorAll(".segments")) {
    const key = group.dataset.setting;
    for (const v of L.CHOICES[key]) {
      const id = `${key}-${v}`;
      const input = Object.assign(document.createElement("input"), { type: "radio", name: key, id, value: String(v) });
      const label = Object.assign(document.createElement("label"), { htmlFor: id, textContent: LABELS[key](v) });
      input.addEventListener("change", () => choose(key, v));
      group.append(input, label);
    }
  }
  const swatches = document.querySelector(".swatches");
  L.CHOICES.thumbColor.forEach((c, i) => {
    const input = Object.assign(document.createElement("input"), { type: "radio", name: "thumbColor", value: c, title: T.colors[i] });
    input.setAttribute("aria-label", T.colors[i]);
    input.style.setProperty("--swatch", c);
    input.addEventListener("change", () => choose("thumbColor", c));
    swatches.append(input);
  });
  for (const key of ["toast", "thumbs"]) $(key).addEventListener("change", (e) => choose(key, e.target.checked));

  function render() {
    for (const group of document.querySelectorAll(".segments")) {
      const key = group.dataset.setting;
      for (const input of group.querySelectorAll("input")) input.checked = input.value === String(cfg[key]);
    }
    for (const input of swatches.querySelectorAll("input")) input.checked = input.value === cfg.thumbColor;
    $("toast").checked = cfg.toast;
    $("thumbs").checked = cfg.thumbs;
    $("row-color").classList.toggle("off", !cfg.thumbs);
    for (const input of swatches.querySelectorAll("input")) input.disabled = !cfg.thumbs;

    document.documentElement.style.setProperty("--bar", cfg.thumbColor);
    $("pv-toast").classList.toggle("hidden", !cfg.toast);
    for (const id of ["pv-thumb-a", "pv-thumb-b"]) $(id).classList.toggle("bare", !cfg.thumbs);

    const s = L.stats(all);
    $("store-total").textContent = s.total ? T.total(s.total) : T.empty;
    $("meter").hidden = $("legend").hidden = !s.total;
    $("meter").style.setProperty("--partial", s.total ? s.partial / s.total : 0);
    $("n-partial").textContent = s.partial;
    $("n-done").textContent = s.done;
    $("clear").disabled = $("export").disabled = !s.total;
    renderVideos();
  }

  // ---------- video list ----------
  const PAGE = 50;
  let shown = PAGE;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  function ago(ts) {
    const s = (ts - Date.now()) / 1000;
    for (const [unit, size] of [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (Math.abs(s) >= size) return rtf.format(Math.round(s / size), unit);
    }
    return rtf.format(0, "minute");
  }
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function videoRow(id, e) {
    const title = e.title || T.untitled(id);
    const li = el("li", "video");
    const main = el("div", "v-main");
    const a = el("a", "v-title" + (e.title ? "" : " untitled"), title);
    a.href = "https://www.youtube.com/watch?v=" + encodeURIComponent(id);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    const meta = el("div", "v-meta");
    if (e.author) meta.append(el("span", "", e.author));
    else if (!e.title) meta.append(el("span", "", T.untitledHint));
    meta.append(e.done ? el("span", "v-done", "✓ " + T.watched)
      : el("span", "num", L.formatTime(e.t) + " / " + L.formatTime(e.d)));
    meta.append(el("span", "", ago(e.ts)));
    const bar = el("div", "v-bar");
    const fill = bar.appendChild(el("div", "v-fill" + (e.done ? " done" : "")));
    fill.style.width = (e.done ? 100 : Math.max(2, Math.min(100, e.t / e.d * 100))) + "%";
    main.append(a, meta, bar);
    const del = el("button", "v-del", T.del);
    del.type = "button";
    del.setAttribute("aria-label", T.delLabel(title));
    del.addEventListener("click", async () => {
      const key = "v:" + id;
      const old = all[key];
      await browser.storage.local.remove(key);
      say(T.deletedOne(title), async () => { await browser.storage.local.set({ [key]: old }); }, "v-status");
    });
    li.append(main, del);
    return li;
  }

  function renderVideos() {
    const q = $("search").value.trim().toLocaleLowerCase(lang);
    const list = Object.entries(all)
      .filter(([k, e]) => k.startsWith("v:") && L.stats({ [k]: e }).total)
      .map(([k, e]) => [k.slice(2), e])
      .sort((x, y) => y[1].ts - x[1].ts);
    $("videos-group").hidden = !list.length;
    const hits = q ? list.filter(([id, e]) =>
      [e.title, e.author, id].some((v) => v && v.toLocaleLowerCase(lang).includes(q))) : list;
    $("videos").replaceChildren(...hits.slice(0, shown).map(([id, e]) => videoRow(id, e)));
    $("no-match").hidden = !(q && !hits.length);
    const rest = hits.length - shown;
    $("more").hidden = rest <= 0;
    $("more").textContent = T.more(Math.min(rest, PAGE));
  }
  $("search").placeholder = T.search;
  $("search").setAttribute("aria-label", T.search);
  $("search").addEventListener("input", () => { shown = PAGE; renderVideos(); });
  $("more").addEventListener("click", () => { shown += PAGE; renderVideos(); });

  async function save(next) {
    cfg = L.normalizeSettings(next);
    await browser.storage.local.set({ settings: cfg });
    render();
  }

  function choose(key, value) {
    hideConfirms();
    if (key === "retentionDays") {
      const doomed = L.expiredKeys(all, Date.now(), Object.assign({}, cfg, { retentionDays: value }))
        .filter((k) => L.stats({ [k]: all[k] }).total);    // count real entries, not broken ones
      if (doomed.length) {
        $("ret-confirm-text").textContent = T.retConfirm(doomed.length, LABELS.retentionDays(value));
        $("ret-confirm").hidden = false;
        $("ret-yes").onclick = async () => {
          hideConfirms();
          await save(Object.assign({}, cfg, { retentionDays: value }));
          const n = await prune();
          say(T.retDeleted(n));
        };
        $("ret-yes").focus();
        return;
      }
    }
    save(Object.assign({}, cfg, { [key]: value }));
  }

  function hideConfirms() {
    $("ret-confirm").hidden = true;
    $("clear-confirm").hidden = true;
    render();     // puts a cancelled radio back on the stored value
  }
  $("ret-no").addEventListener("click", hideConfirms);
  $("clear-no").addEventListener("click", hideConfirms);

  async function prune() {
    const expired = L.expiredKeys(all, Date.now(), cfg);
    if (expired.length) await browser.storage.local.remove(expired);
    return expired.filter((k) => L.stats({ [k]: all[k] }).total).length;
  }

  // Status lines under the data card and the video list; an optional undo button for deletes.
  let sayTimer;
  function say(text, undo, where = "status") {
    const box = $(where);
    box.replaceChildren(text);
    if (undo) {
      const b = el("button", "link", T.undo);
      b.type = "button";
      b.addEventListener("click", async () => { box.replaceChildren(); await undo(); });
      box.append(" ", b);
    }
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => box.replaceChildren(), undo ? 12000 : 8000);
  }

  // ---------- data ----------
  $("export").addEventListener("click", () => {
    const now = Date.now();
    const blob = new Blob([JSON.stringify(L.exportData(all, now), null, 1)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `youtube-resume-backup-${new Date(now).toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    say(T.exported);
  });

  $("import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    let r;
    try { r = L.importData(JSON.parse(await file.text()), all); } catch (err) { say(T.importFailed); return; }
    if (Object.keys(r.set).length) await browser.storage.local.set(r.set);
    if (r.settings) await save(r.settings);
    say(T.imported(r.added, r.updated, r.skipped));
  });

  $("clear").addEventListener("click", () => {
    hideConfirms();
    $("clear-confirm-text").textContent = T.clearConfirm(L.stats(all).total);
    $("clear-confirm").hidden = false;
    $("clear-no").focus();
  });
  $("clear-yes").addEventListener("click", async () => {
    await browser.storage.local.remove(Object.keys(all).filter((k) => k.startsWith("v:")));
    hideConfirms();
    say(T.cleared);
  });

  // Keep the overview current while videos play in other tabs.
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [k, c] of Object.entries(changes)) {
      if (c.newValue === undefined) delete all[k]; else all[k] = c.newValue;
    }
    if (changes.settings) cfg = L.normalizeSettings(changes.settings.newValue);
    render();
  });

  browser.storage.local.get(null).then((stored) => {
    all = stored;
    cfg = L.normalizeSettings(stored.settings);
    render();
    document.body.classList.add("ready");
  });
})();
