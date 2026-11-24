# Architecture

## System Overview

Hell Fire uses a multi-process architecture. The browser chrome, web tabs, and network layer run in separate contexts to isolate untrusted web code from the host operating system.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MAIN PROCESS (standalone/main.js)                     │
│  - Single Instance Lock (`app.requestSingleInstanceLock`)              │
│  - Window Management & Custom Frameless Chrome (`BrowserWindow`)        │
│  - Multi-Tab Embedding (`WebContentsView` & Dual-Pane Split Math)     │
│  - Network Layer Filter (72 BLOCKED_URL_PATTERNS via webRequest)       │
│  - DoH Resolver (RFC 8484 via Cloudflare / Quad9 / Mullvad)            │
│  - Hardware-Encrypted Vault (Windows DPAPI safeStorage)                │
│  - Navigation Sanitizer & Directory Traversal Guards                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC (Whitelisted Channels)
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌─────────────────────────────────┐   ┌───────────────────────────────────┐
│     CHROME INTERFACE VIEW       │   │      ISOLATED WEB CONTENT TABS    │
│  (standalone/ui/index.html)     │   │     (WebContentsView Instances)   │
│                                 │   │                                   │
│ - Preload Barrier (preload.js)  │   │ - Partitioned ('persist:hellfire')│
│ - ContextBridge Security Fence  │   │ - Incognito Partition in RAM      │
│ - Obsidian Dark Theme           │   │ - WebRTC LAN Leak Defense Active  │
│ - Tab Bar, Omnibox, Modals      │   │ - Cosmetic Ad Blocker Injected    │
│ - New Tab: 0.6x WebGL Flame     │   │ - Zero Camera/Mic Auto-Grant      │
└─────────────────────────────────┘   └───────────────────────────────────┘
```

## Directory Structure

```text
hellfire/
├── package.json                   # Root task runner and orchestration
├── README.md                      # Project overview and getting started
├── ARCHITECTURE.md                # System design and process topology
├── CONTRIBUTING.md                # Developer guidelines and rules
├── SECURITY.md                    # Security policy
├── .gitignore                     # Git ignore rules
├── Launch Hell Fire.bat           # Desktop launcher
└── standalone/                    # Application runtime
    ├── main.js                    # Main process lifecycle and IPC
    ├── preload.js                 # ContextBridge API boundary
    ├── package.json               # Manifest and build configuration
    ├── launch.vbs                 # Silent launcher script
    ├── data/                      # Local user profile storage (git-ignored)
    │   ├── history.json           # Browsing history store
    │   ├── bookmarks.json         # Saved bookmarks tree
    │   ├── settings.json          # User preferences
    │   └── vault.enc              # DPAPI-encrypted password vault
    ├── ui/                        # Browser chrome interface
    │   ├── index.html             # Main chrome markup
    │   ├── browser.js             # UI event controller and modal logic
    │   ├── browser.css            # Obsidian design tokens and layout
    │   ├── newtab.html            # New tab page with WebGL flame canvas
    │   └── assets/                # SVG vector icons and app.ico
    └── tests/                     # 10 test suites
        ├── run_all_tests.js       # Master test runner
        ├── test_report.json       # Execution report
        └── suite01-suite10        # Automated functional test suites
```

## Process Topology & Security Boundaries

### Main Process (`main.js`)
- Manages the native application window and lifecycle.
- Enforces single-instance execution via `app.requestSingleInstanceLock()`. Launching a second instance brings the existing window to focus and exits the new process immediately.
- Filters network requests through `sess.webRequest.onBeforeRequest`, blocking 72 advertising, analytics, and CNAME-cloaked domains.
- Enforces `disable_non_proxied_udp` on WebRTC to prevent private IP leakage on local networks.

### Chrome Interface View (`ui/index.html`)
- Runs as a standard renderer loading local assets.
- Node.js integration is disabled (`nodeIntegration: false`).
- Context isolation is enabled (`contextIsolation: true`).
- Communicates with the main process strictly through channels defined in `preload.js`.

### Web Content Tabs (`WebContentsView`)
- Each tab runs as a distinct `WebContentsView` attached to the main window's `contentView`.
- Web pages execute inside Chromium's site isolation sandbox.
- Web content cannot access internal browser APIs, local files, or credential storage.

## Credential Storage

Logins and autofill credentials are encrypted using Electron's `safeStorage` API:

```text
Plaintext Credentials (JSON)
       │
       ▼
safeStorage.encryptStringAsync(plainText)
       │
       ▼
Windows Data Protection API (DPAPI) CryptProtectData
       │
       ▼
Ciphertext written to `standalone/data/vault.enc`
```

- **Machine Bound:** The encryption key is tied to the current Windows user login. The ciphertext cannot be decrypted on another machine or user account.
- **Corruption Recovery:** If `vault.enc` is damaged or truncated, the vault loader catches the error and initializes an empty array rather than failing to launch.

## DNS Resolution

DNS queries resolve over TLS 1.3 via RFC 8484 DNS-over-HTTPS:

| Provider | DoH Endpoint URL | Features |
| :--- | :--- | :--- |
| **Cloudflare** | `https://cloudflare-dns.com/dns-query` | Anycast routing, DNSSEC validation |
| **Quad9** | `https://dns.quad9.net/dns-query` | Swiss jurisdiction, malware domain blocking |
| **Mullvad** | `https://doh.mullvad.net/dns-query` | No logging resolver |

The active resolver is set in `standalone/data/settings.json` and applied at startup via `app.configureHostResolver`.
