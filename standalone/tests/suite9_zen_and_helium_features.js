/**
 * Suite 9: Zen & Helium Browser Innovations
 * Testing: Split-View Dual Tiling, Link Glance Ephemeral Modal, and CNAME Uncloaking Defense
 * Integrating skills: agency-code-reviewer, agency-penetration-tester, agency-reality-checker
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite9() {
  const results = {
    name: 'Suite 9: Zen & Helium Innovations (Split-View, Glance, CNAME Uncloaking)',
    tests: [],
    passed: 0,
    failed: 0
  };

  function assert(title, condition, extra = '') {
    if (condition) {
      results.tests.push({ title, status: 'PASS', extra });
      results.passed++;
      console.log(`  ✓ [PASS] ${title}`);
    } else {
      results.tests.push({ title, status: 'FAIL', extra });
      results.failed++;
      console.error(`  ✗ [FAIL] ${title} - ${extra}`);
    }
  }

  console.log('\n--- Running Suite 9: Zen & Helium Innovations ---');

  const mainCode = fs.readFileSync(path.resolve(__dirname, '..', 'main.js'), 'utf-8');
  const preloadCode = fs.readFileSync(path.resolve(__dirname, '..', 'preload.js'), 'utf-8');
  const browserHtml = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'index.html'), 'utf-8');
  const browserCss = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'browser.css'), 'utf-8');
  const browserJs = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'browser.js'), 'utf-8');

  // ─────────────────────────────────────────────────────────────
  // 1. HELIUM-INSPIRED CNAME UNCLOAKING & TRACKER DEFENSE
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 1: Helium CNAME Uncloaking & Extended Filter Defense]');

  const cnameTargets = [
    'adobedc.net',
    'demdex.net',
    'omtrdc.net',
    'eulerian.net',
    'tagcommander.com',
    'at-o.net',
    'keywee.co',
    'wizaly.com',
    'affise.com',
    'wt-eu02.net',
    'kueezrtb.com',
    'sc-static.net',
    'snapchat.com/tr'
  ];

  cnameTargets.forEach(target => {
    assert(`BLOCKED_URL_PATTERNS includes canonical CNAME target: ${target}`,
      mainCode.includes(target));
  });

  // Extract BLOCKED_URL_PATTERNS to test matching in isolation
  const patternMatch = mainCode.match(/const BLOCKED_URL_PATTERNS = \[([\s\S]*?)\];/);
  assert('BLOCKED_URL_PATTERNS array extracted from main.js', !!patternMatch);

  let blockedPatterns = [];
  if (patternMatch) {
    try {
      blockedPatterns = eval(`[${patternMatch[1]}]`);
    } catch (e) {
      blockedPatterns = [];
    }
  }

  function isUrlBlocked(testUrl) {
    return blockedPatterns.some(pattern => {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`, 'i').test(testUrl);
    });
  }

  assert('Cloaked Adobe Experience Cloud tracker (data.adobedc.net) is blocked',
    isUrlBlocked('https://analytics.publisher.com.adobedc.net/collect'));
  assert('Cloaked Demdex audience tracker (dpm.demdex.net) is blocked',
    isUrlBlocked('https://sub.dpm.demdex.net/id?d_visid_ver=1'));
  assert('Cloaked Eulerian tracking endpoint is blocked',
    isUrlBlocked('https://cdn.eulerian.net/tracker.js'));
  assert('Cloaked TagCommander endpoint is blocked',
    isUrlBlocked('https://collector.tagcommander.com/v3/event'));
  assert('Benign first-party content (wikipedia.org) is NOT blocked',
    !isUrlBlocked('https://en.wikipedia.org/wiki/Main_Page'));
  assert('Benign open-source repo (github.com) is NOT blocked',
    !isUrlBlocked('https://github.com/LadybirdBrowser/ladybird'));

  // ─────────────────────────────────────────────────────────────
  // 2. ZEN-INSPIRED SPLIT-VIEW DUAL TILING
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 2: Zen Split-View Dual Tiling]');

  assert('main.js updateActiveViewBounds includes 50/50 dual pane split math',
    mainCode.includes('Math.floor(availW / 2)') && mainCode.includes('splitTab.view.setBounds'));
  assert('main.js createBrowserWindow initializes splitTabId: null',
    mainCode.includes('splitTabId: null'));
  assert('main.js registers tab:split-toggle IPC handler',
    mainCode.includes("ipcMain.handle('tab:split-toggle'"));
  assert('main.js registers tab:split-close IPC handler',
    mainCode.includes("ipcMain.handle('tab:split-close'"));
  assert('main.js registers tab:split-state IPC handler',
    mainCode.includes("ipcMain.handle('tab:split-state'"));
  assert('main.js closeTab resets splitTabId when closed tab was in split view',
    mainCode.includes('ws.splitTabId = null') && mainCode.includes("'tab:split-state'"));
  assert('main.js tab:context-menu includes Split View option',
    mainCode.includes('Split View with this Tab') || mainCode.includes('Close Split View'));

  // Split-View UI Elements
  assert('index.html contains #btnSplitView action button',
    browserHtml.includes('id="btnSplitView"'));
  assert('index.html contains #menuSplitView app menu entry',
    browserHtml.includes('id="menuSplitView"'));
  assert('index.html split view button has aria-label and accessible title',
    browserHtml.includes('aria-label="Toggle Split View"') && browserHtml.includes('Split View Dual Pane (Ctrl+Alt+S)'));
  assert('index.html contains no forbidden emojis in split view markup',
    !/[🔥🛡️🚀⭐⚡🔍✨📦💎]/.test(browserHtml.slice(browserHtml.indexOf('btnSplitView'), browserHtml.indexOf('btnSplitView') + 200)));

  // Split-View CSS Styling
  assert('browser.css contains .action-btn--split.is-active styling',
    browserCss.includes('.action-btn--split.is-active'));

  // Split-View JS Event Wiring
  assert('browser.js wires click event to #btnSplitView',
    browserJs.includes("btnSplitView.addEventListener('click'") && browserJs.includes('toggleSplitView'));
  assert('browser.js wires click event to #menuSplitView',
    browserJs.includes("menuSplitView.addEventListener('click'"));
  assert('browser.js listens for tab:split-state to toggle .is-active badge',
    browserJs.includes("window.privateFox.on('tab:split-state'"));
  assert('browser.js binds Ctrl+Alt+S global keyboard shortcut for split view',
    browserJs.includes('e.ctrlKey && e.altKey') && browserJs.includes("'s'"));

  // ─────────────────────────────────────────────────────────────
  // 3. ZEN-INSPIRED LINK GLANCE EPHEMERAL PREVIEW
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 3: Zen Link Glance Ephemeral Preview]');

  assert('main.js updateActiveViewBounds calculates centered Glance bounds (84% width / 82% height)',
    mainCode.includes('Math.floor(w * 0.84)') && mainCode.includes('Math.floor(h * 0.82)'));
  assert('main.js createBrowserWindow initializes glanceView: null',
    mainCode.includes('glanceView: null'));
  assert('main.js registers glance:open IPC handler',
    mainCode.includes("ipcMain.handle('glance:open'"));
  assert('main.js registers glance:close IPC handler',
    mainCode.includes("ipcMain.handle('glance:close'"));
  assert('main.js win.on closed cleans up active glanceView to prevent memory leaks',
    mainCode.includes('winState.glanceView') && mainCode.includes('glanceView.webContents.close()'));

  // Glance UI Elements
  assert('index.html contains #glanceFloatingBar preview banner',
    browserHtml.includes('id="glanceFloatingBar"'));
  assert('index.html contains #btnGlanceOpenTab button',
    browserHtml.includes('id="btnGlanceOpenTab"'));
  assert('index.html contains #btnGlanceClose dismiss button',
    browserHtml.includes('id="btnGlanceClose"'));

  // Glance CSS Styling & Animation
  assert('browser.css contains .glance-floating-bar with glassmorphism backdrop blur',
    browserCss.includes('.glance-floating-bar') && browserCss.includes('backdrop-filter: blur'));
  assert('browser.css contains @keyframes glanceSlideDown entrance animation',
    browserCss.includes('@keyframes glanceSlideDown'));
  assert('browser.css enforces global [hidden] { display: none !important; } to defeat CSS specificity overrides',
    browserCss.includes('[hidden]') && browserCss.includes('display: none !important'));
  assert('browser.css enforces explicit .glance-floating-bar[hidden] { display: none !important; }',
    browserCss.includes('.glance-floating-bar[hidden]') && browserCss.includes('display: none !important'));
  assert('index.html initializes #glanceFloatingBar with inline style="display: none;"',
    browserHtml.includes('id="glanceFloatingBar"') && browserHtml.includes('style="display: none;"'));

  // Glance JS Event Wiring
  assert('browser.js wires #btnGlanceClose click event',
    browserJs.includes("btnGlanceClose.addEventListener('click'") && browserJs.includes('closeGlance'));
  assert('browser.js wires #btnGlanceOpenTab click event',
    browserJs.includes("btnGlanceOpenTab.addEventListener('click'") && browserJs.includes('createTab'));
  assert('browser.js listens for glance:state to toggle visibility',
    browserJs.includes("window.privateFox.on('glance:state'"));
  assert('browser.js dismisses glance preview on Escape key',
    browserJs.includes('glanceFloatingBar && !glanceFloatingBar.hidden') && browserJs.includes('closeGlance'));

  // ─────────────────────────────────────────────────────────────
  // 4. PRELOAD CONTEXTBRIDGE SECURITY & API PARITY
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 4: Preload API Parity & Security]');

  assert('preload.js ALLOWED_CHANNELS includes tab:split-state',
    preloadCode.includes("'tab:split-state'"));
  assert('preload.js ALLOWED_CHANNELS includes glance:state',
    preloadCode.includes("'glance:state'"));
  assert('preload.js exposes toggleSplitView',
    preloadCode.includes('toggleSplitView: (tabId) => ipcRenderer.invoke(\'tab:split-toggle\''));
  assert('preload.js exposes closeSplitView',
    preloadCode.includes('closeSplitView: () => ipcRenderer.invoke(\'tab:split-close\''));
  assert('preload.js exposes getSplitState',
    preloadCode.includes('getSplitState: () => ipcRenderer.invoke(\'tab:split-state\''));
  assert('preload.js exposes openGlance',
    preloadCode.includes('openGlance: (url) => ipcRenderer.invoke(\'glance:open\''));
  assert('preload.js exposes closeGlance',
    preloadCode.includes('closeGlance: () => ipcRenderer.invoke(\'glance:close\''));

  return results;
}

module.exports = { runSuite9 };

if (require.main === module) {
  app.whenReady().then(async () => {
    const res = await runSuite9();
    console.log(`\nSuite 9 finished: ${res.passed} passed, ${res.failed} failed.`);
    app.quit();
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
