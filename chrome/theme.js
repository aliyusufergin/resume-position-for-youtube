// Chrome build: tell the service worker whether the browser is in dark mode,
// so the toolbar icon stays visible (Chrome has no theme_icons).
(() => {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const send = () => { try { chrome.runtime.sendMessage({ ytrDark: mq.matches }).catch(() => {}); } catch (e) {} };
  send();
  mq.addEventListener("change", send);
})();
