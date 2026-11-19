# YouTube Resume: domain knowledge

## Firefox platform (verified 2026-11)
- MV3. The background must be an event page (`background.scripts`); Firefox has no service worker support. This extension may not need a background at all.
- `world: "MAIN"` content scripts work in Firefox 128+. A MAIN script cannot use WebExtension APIs, so it talks to the isolated script through `postMessage`/CustomEvent.
- Required for AMO signing:
  - `browser_specific_settings.gecko.id`
  - `data_collection_permissions: {"required": ["none"]}`, with `strict_min_version: "140.0"`
- Sign: `web-ext sign --channel=unlisted --api-key=... --api-secret=...`. Bump `version` on every sign.
- Test: `web-ext run --start-url <watch url>`; check with `web-ext lint`.
- `storage.local` is wiped on uninstall. To keep it while testing, set `extensions.webextensions.keepStorageOnUninstall` in about:config.

## YouTube integration
- Video changes:
  - Document events `yt-navigate-finish`, `yt-player-updated` and `yt-page-data-updated`.
  - The `<video>` element can be replaced; listen for `loadstart`/`durationchange`.
- Video ID: the `v=` URL param, confirmed against `#movie_player.getVideoData().video_id`.
- Skip:
  - live videos (`getVideoData().isLive`)
  - inline/hover previews (`player.isInline()`, `#inline-preview-player`, `ytd-video-preview`)
  - Shorts, music.youtube.com and embeds
- Ads: no saving or seeking while `#movie_player` has `ad-showing` / `ad-interrupting`.
- Seek with `#movie_player.seekTo(t, true)` from the MAIN world. YouTube's own start-up seek can race it, so seek after the first `timeupdate` once no ad is showing, then check again ~1 s later.
- `t=` in the URL wins. Caveat: when watch history is ON, YouTube adds `t=` to thumbnail links by itself.
- YouTube's DOM changes often. Keep all selectors and event names in one module.

## Known traps (from other implementations)
- Saving the ad's time instead of the video's.
- Miniplayer jumping back to 0.
- Comment timestamp links fighting the resume.
- Playlist/queue navigation losing positions.
- Previews polluting saved positions.
- Races between tabs.

## How to check a change works
Use a real Firefox (`web-ext run`) and cover these scenarios:
- resume after reload
- resume after SPA navigation from the home page and from recommendations
- a video with a pre-roll ad
- a `t=` link
- a finished video, which should start at 0
- hovering a thumbnail, which must not save anything
- a playlist
- the miniplayer
