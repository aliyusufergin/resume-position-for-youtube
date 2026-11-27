// Chrome build only: the shared code uses Firefox's `browser` namespace.
// Chrome's MV3 `chrome.*` APIs return promises, so an alias is enough.
if (typeof globalThis.browser === "undefined") globalThis.browser = chrome;
