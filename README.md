<p align="center">
  <img src="assets/logo.png" alt="Hell Fire Browser" width="128" height="128" style="border-radius: 20px;" />
</p>

<h1 align="center">Hell Fire Browser</h1>

<p align="center">
  <b>Fast, isolated, and quiet desktop web browser built with Electron and Chromium.</b><br>
  Features hardware-backed credential encryption, network-level tracking defense, procedural WebGL graphics, and dual-pane split view.
</p>

<p align="center">
  <a href="https://drive.google.com/uc?export=download&id=1oVh8r2_AThhZ8SEELWG2xlTDyUGfaI1a"><b>Download Setup (.exe)</b></a> •
  <a href="https://drive.google.com/uc?export=download&id=12FW-lLgSu8V24YXplMVWTT9V8q761luG"><b>Download Portable (.exe)</b></a> •
  <a href="#features">Features</a> •
  <a href="#running-from-source">Build from Source</a>
</p>

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

- **Setup Installer:** [Hell-Fire-Setup-1.0.0.exe](https://drive.google.com/uc?export=download&id=1oVh8r2_AThhZ8SEELWG2xlTDyUGfaI1a) (123 MB)
- **Portable Edition:** [Hell-Fire-1.0.0-Portable.exe](https://drive.google.com/uc?export=download&id=12FW-lLgSu8V24YXplMVWTT9V8q761luG) (112 MB)

The installer puts the browser in `%LocalAppData%\Programs\Hell Fire`, adds Desktop and Start Menu shortcuts, registers the app in Windows Settings, and starts it automatically. It requires no administrator rights or Node.js.

## Running from Source

Prerequisites: Node.js 18+ and npm 9+ on Windows 10/11 x64.

```bash
git clone https://github.com/hellfire-browser/hellfire.git
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
