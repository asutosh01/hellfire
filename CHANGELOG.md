# Changelog

All notable changes to Hell Fire are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-11-24

### Architecture
- Standalone Electron 45 runtime using `WebContentsView` for tab management.
- Single-instance lock (`app.requestSingleInstanceLock()`) to prevent duplicate process conflicts and cache lockouts.
- Partitioned storage sessions (`persist:hellfire`) for tabs and RAM-only sessions (`persist:incognito`) for private browsing.

### Network and privacy
- Network request blocking via `webRequest.onBeforeRequest` covering 72 tracker, ad, miner, and CNAME cloaking patterns.
- CNAME tracking protection against common cloaked domains (`adobedc.net`, `demdex.net`, `tagcommander.com`, `eulerian.net`).
- DNS-over-HTTPS support for Cloudflare, Quad9, and Mullvad resolvers.
- WebRTC IP handling set to `disable_non_proxied_udp` to prevent local IP leaks.
- Disabled camera, microphone, and screen share permissions by default.

### Interface
- Frameless dark chrome (`#090d16` background, `#161b22` toolbar, `#2563eb` accent).
- SVG icons across all buttons, tabs, and menus.
- Procedural GLSL flame canvas on the new tab page running at 0.6x speed with auto-pause on window minimize/blur.
- 50/50 split view (`Ctrl+Alt+S`) and Link Glance preview modal (`Escape` to dismiss).

### Storage and security
- Encrypted password storage using Windows DPAPI via Electron `safeStorage`.
- Download filename sanitization using `path.basename()`.
- 10 automated test suites with 210 assertions covering core lifecycle, IPC, and security gates.
