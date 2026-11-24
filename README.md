<p align="center">
  <img src="assets/logo.png" alt="Hell Fire Browser" width="128" height="128" style="border-radius: 20px;" />
</p>

<h1 align="center">Hell Fire Browser</h1>

<p align="center">
  <a href="https://github.com/asutosh01/hellfire"><img src="https://img.shields.io/badge/version-1.0.0-2563eb.svg?style=flat-square" alt="Version 1.0.0" /></a>
  <a href="#tests"><img src="https://img.shields.io/badge/tests-213%20passed-22c55e.svg?style=flat-square" alt="Tests 213 Passed" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20x64-161b22.svg?style=flat-square&logo=windows&logoColor=white" alt="Platform: Windows x64" />
  <img src="https://img.shields.io/badge/engine-Electron%20%7C%20Chromium-090d16.svg?style=flat-square&logo=electron&logoColor=38bdf8" alt="Engine: Electron + Chromium" />
  <img src="https://img.shields.io/badge/privacy-Zero%20Telemetry-3b82f6.svg?style=flat-square" alt="Privacy: Zero Telemetry" />
  <a href="package.json"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
</p>

<p align="center">
  <b>A privacy-focused, high-performance desktop web browser engineered for security, speed, and quiet focus.</b><br>
  Zero telemetry, hardware-encrypted credentials, network-level tracking protection, encrypted DoH, and dual-pane split view.
</p>

<p align="center">
  <a href="https://drive.google.com/uc?export=download&id=1oVh8r2_AThhZ8SEELWG2xlTDyUGfaI1a"><b>Download Setup (.exe)</b></a> •
  <a href="https://drive.google.com/uc?export=download&id=12FW-lLgSu8V24YXplMVWTT9V8q761luG"><b>Download Portable (.exe)</b></a> •
  <a href="#privacy-by-architecture">Privacy Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#running-from-source">Build from Source</a>
</p>

---

## Privacy by Architecture

Most modern browsers collect background telemetry, log usage metrics, and expose local network endpoints. **Hell Fire is built with an uncompromising privacy-first model:**

- **Zero Telemetry & Tracking:** No analytics libraries, no usage pings, and no telemetry beacons. Your browsing activity stays strictly on your local machine.
- **Hardware-Backed Credential Vault:** Saved passwords and addresses are encrypted using native OS cryptography (Windows DPAPI via Electron `safeStorage`), bound to your Windows account.
- **Built-in Network Defense Shield:** Blocks ads, tracking pixels, crypto miners, and CNAME-cloaked tracking scripts across 72 exact rules in Chromium's network layer before requests load.
- **Encrypted DNS-over-HTTPS (DoH):** Queries domain names over encrypted TLS 1.3 tunnels supporting Cloudflare, Mullvad, and Quad9 to prevent ISP snooping and DNS hijacking.
- **WebRTC LAN IP Protection:** Enforces strict UDP routing policies to block malicious scripts from harvesting your local LAN IP address.
- **Permission Gating:** Access to camera, microphone, screen recording, and device sensors is blocked by default rather than silently granted.
- **RAM-Only Incognito Isolation:** Private browsing runs in completely isolated session partitions. Cookies, history, and cache are purged from memory immediately upon closing.

---

## Features

- **Frameless UI:** Obsidian dark palette (`#090d16` canvas, `#161b22` toolbar, `#2563eb` sapphire accent) built with standard HTML/CSS.
- **WebGL flame animation:** Procedural GLSL combustion canvas on the new tab page running at 0.6x speed; suspends automatically when the window is minimized or hidden.
- **Dual-pane split view:** Side-by-side 50/50 view (`Ctrl+Alt+S`) to view two pages simultaneously.
- **Link Glance:** Centered modal preview overlay to inspect links without leaving the current page.
- **Network shield:** Blocks advertising, tracking pixels, crypto miners, and CNAME-cloaked domains across 72 rules in `webRequest.onBeforeRequest`.
- **Credential vault:** Encrypts saved logins using Windows DPAPI via Electron `safeStorage`.
- **DNS-over-HTTPS:** Encrypted DNS over TLS 1.3 supporting Cloudflare, Quad9, and Mullvad.
- **WebRTC leak protection:** Enforces `disable_non_proxied_udp` to prevent local IP exposure.
- **Permission gating:** Blocks camera, microphone, and screen capture requests by default.
- **SVG iconography:** SVG icons across toolbars, tabs, and modals with zero emojis.

## Download & Installation

### Windows x64

<p>
  <a href="https://drive.google.com/uc?export=download&id=1oVh8r2_AThhZ8SEELWG2xlTDyUGfaI1a">
    <img src="https://img.shields.io/badge/Download-One--Click%20Setup%20(.exe)-2563eb?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows Installer" />
  </a>
  &nbsp;
  <a href="https://drive.google.com/uc?export=download&id=12FW-lLgSu8V24YXplMVWTT9V8q761luG">
    <img src="https://img.shields.io/badge/Download-Portable%20Edition%20(.exe)-0284c7?style=for-the-badge&logo=windows&logoColor=white" alt="Download Portable Edition" />
  </a>
</p>

- **Setup Installer (123 MB):** One-click self-contained installer. Automatically installs to `%LocalAppData%\Programs\Hell Fire`, creates desktop and Start menu shortcuts, registers in Windows Settings, and launches.
- **Portable Edition (112 MB):** Standalone `.exe` that runs from any folder or USB drive with zero installation.

The installer puts the browser in `%LocalAppData%\Programs\Hell Fire`, adds Desktop and Start Menu shortcuts, registers the app in Windows Settings, and starts it automatically. It requires no administrator rights or Node.js.

## Running from Source

Prerequisites: Node.js 18+ and npm 9+ on Windows 10/11 x64.

```bash
git clone https://github.com/asutosh01/hellfire.git
cd hellfire
npm install
npm start
```

Double-click `Launch Hell Fire.bat` or run `standalone\launch.vbs` for a console-free launch.

### Building Binaries

To compile the NSIS installer and portable executable:

```bash
cd standalone
npm run dist
```

Outputs are written to `standalone/dist/`:
- `Hell-Fire-Setup-1.0.0.exe`
- `Hell-Fire-1.0.0-Portable.exe`

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+T` | Open new tab |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Cycle tabs forward / backward |
| `Ctrl+Alt+S` | Toggle 50/50 split view |
| `Escape` | Close Glance preview or active modal |
| `Ctrl+Shift+N` | Open private window |
| `Shift+Escape` | Open task manager |
| `Ctrl+L` / `Alt+D` | Focus address bar |
| `Ctrl+D` | Bookmark active page |
| `Ctrl+H` | Toggle history sidebar |
| `Ctrl+,` | Open settings panel |
| `Ctrl+F` | Find in page |

## Configuration

Profile data is stored locally in `standalone/data/`:

| File | Purpose | Storage Format |
| :--- | :--- | :--- |
| `settings.json` | Search engine, DoH provider, bookmarks bar toggle | JSON |
| `history.json` | Browsing history | JSON |
| `bookmarks.json` | Bookmarks tree | JSON |
| `vault.enc` | Saved credentials | Encrypted (Windows DPAPI) |

Default settings in `standalone/data/settings.json`:

```json
{
  "searchEngine": "brave",
  "dohProvider": "cloudflare",
  "shieldEnabled": true,
  "showBookmarksBar": true,
  "blockThirdPartyCookies": true
}
```

## Project Structure

```text
hellfire/
├── package.json           # Root scripts
├── CONTRIBUTING.md        # Development guidelines
├── SECURITY.md            # Security policy
├── ARCHITECTURE.md        # Process model and design notes
├── CHANGELOG.md           # Release history
├── TROUBLESHOOTING.md     # Diagnostics and fixes
├── Launch Hell Fire.bat   # Windows launcher script
└── standalone/            # Application code
    ├── main.js            # Main process, window lifecycle, IPC
    ├── preload.js         # ContextBridge boundary
    ├── ui/                # Browser chrome interface
    │   ├── index.html     # Chrome markup
    │   ├── browser.js     # Chrome controller and modals
    │   ├── browser.css    # Styles and theme tokens
    │   └── newtab.html    # New tab page with WebGL flame canvas
    └── tests/             # Automated test suites
```

## Tests

```bash
# Run all 10 test suites (213 assertions)
npm test

# Run the launch smoke test
npm run test:smoke
```

Test results are logged to `standalone/tests/test_report.json`.

## License

MIT License. See [package.json](package.json).

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
