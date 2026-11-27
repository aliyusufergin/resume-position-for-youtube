// Chrome build: service worker. Clicking the toolbar button opens the settings.
// Chrome has no theme_icons, so pages report the colour scheme (theme.js) and the icon follows it.
const icon = (c) => ({ 16: `/icons/${c}-16.png`, 32: `/icons/${c}-32.png` });
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && typeof msg.ytrDark === "boolean") chrome.action.setIcon({ path: icon(msg.ytrDark ? "white" : "black") });
});
