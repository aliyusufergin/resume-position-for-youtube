// Toolbar button: opens the settings page, like most add-ons' buttons do.
"use strict";
browser.action.onClicked.addListener(() => browser.runtime.openOptionsPage());
