# Chrome Web Store listing

Copy these into the developer dashboard (https://chrome.google.com/webstore/devconsole).
Package: `npm run build:chrome` → `web-ext-artifacts/resume_position_for_youtube-chrome-<version>.zip`.

## Store listing

- **Name** (from the manifest): Resume Position for YouTube
- **Summary** (from the manifest, max 132): Pick up YouTube videos where you left off, even with watch history off. Positions stay in your browser; nothing is sent anywhere.
- **Category:** Tools
- **Language:** English
- **Store icon:** `chrome/icons/black-128.png`
- **Screenshots (1280×800):** `amo/screenshot-1.png`, `amo/screenshot-2.png`, `amo/screenshot-3.png`, `chrome/store/screenshot-4.png`
  (the AMO screenshot-4 says "another Firefox", so Chrome gets its own)
- **Small promo tile (440×280):** `chrome/store/promo-small-440x280.png`
- **Homepage URL:** https://github.com/aliyusufergin/resume-position-for-youtube
- **Support URL:** https://github.com/aliyusufergin/resume-position-for-youtube/issues

### Description

```
YouTube only remembers where you stopped a video if watch history is on. This extension does it locally instead, so you can keep history off and still resume.

How it works
• Your position is saved every few seconds, and when you pause, seek, switch videos or close the tab.
• Reopen the video from anywhere (home, search, recommendations, a link) and it continues where you left off. A small notice shows the time, with a "Start over" button.
• Thumbnails in search, recommendations and channel pages show how far you got; finished videos get a full bar and a "Watched" badge.
• Finished videos start from the beginning (by default: closed in the last 5%, 10–30 s).
• Links with an explicit time (&t=) always win.

What it ignores
Ads, hover previews, live streams, Shorts, short videos (under 90 seconds by default), YouTube Music and embedded players. It does not run in Incognito windows.

Settings
Click the extension's toolbar button (or open its options) to choose:
• how long positions are kept: 30 days, 90 days, 6 months, 1 year or forever
• the shortest video to remember and how close to the end a video counts as watched
• whether the resume notice appears
• whether thumbnails show progress, and the bar color
The options page also lists your saved videos by title, with search, so you can delete one on its own. You can also download a backup, restore it in another browser, or delete everything.

Languages
English, Turkish, German, French, Spanish, Portuguese and Russian (follows your browser language).

Privacy
Positions (video ID, title, channel name, time, duration) are kept in the extension's local storage on this computer and removed after 90 days without use (you can change this). Backups are plain JSON files that you download yourself. No network requests, no analytics, no account needed.

Open source: https://github.com/aliyusufergin/resume-position-for-youtube
```

## Privacy practices tab

- **Single purpose:**
  Remembers the playback position of YouTube videos locally, so they resume where the user left off even with YouTube watch history turned off.
- **Permission justification, `storage`:**
  Saves each video's playback position, title and channel name, plus the user's settings, in local extension storage on the user's computer.
- **Permission justification, host permission `https://www.youtube.com/*`:**
  The content scripts run only on YouTube watch, search and channel pages to read the player's current time, seek to the saved position and draw progress bars on video thumbnails.
- **Remote code:** No, I am not using remote code. All scripts are in the package.
- **Data usage:** tick nothing. The extension does not collect or transmit any user data; everything stays in `chrome.storage.local` on the device.
- **Certifications:** tick all three (no selling of data, no use unrelated to the single purpose, no use for creditworthiness or lending).
- **Privacy policy URL:** https://github.com/aliyusufergin/resume-position-for-youtube#privacy

## Distribution

- Visibility: Public. Regions: all.
