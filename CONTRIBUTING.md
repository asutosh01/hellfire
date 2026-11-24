# Contributing to Hell Fire

Guidelines for contributing to the Hell Fire codebase.

## Code Standards

1. **Icons:** Use SVG icons for all UI elements. Emojis are not permitted in browser chrome or modal dialogs.
2. **Process Boundary:** Renderers must never access Node.js internals directly. All communication with the main process must use the channels in `preload.js`.
3. **Error Handling:** IPC handlers and asynchronous file/network operations must handle errors without crashing the main process or leaving hanging promises.
4. **Privacy Defaults:**
   - WebRTC `disable_non_proxied_udp` policy must remain active.
   - DNS-over-HTTPS configuration must be respected.
   - Tracker blocking rules must block direct endpoints and common CNAME aliases.

## Development Setup

Prerequisites: Node.js 18+ and npm 9+.

```bash
git clone https://github.com/hellfire-browser/hellfire.git
cd hellfire/standalone
npm install
npm start
```

## Running Tests

Run the test harness before opening a pull request:

```bash
npm test
```

To run only the entrypoint smoke test:

```bash
npm run test:smoke
```
