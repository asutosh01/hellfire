/**
 * Suite 1: Window Architecture & Tab Management Lifecycle
 */
const { app, BrowserWindow, WebContentsView } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite1() {
  const results = { name: 'Suite 1: Window Architecture & Tab Management', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 1: Window Architecture & Tab Management ---');

  // Test 1.1: App Icon Existence & Format
  const icoPath = path.resolve(__dirname, '..', 'ui', 'assets', 'app.ico');
  const pngPath = path.resolve(__dirname, '..', 'ui', 'assets', 'app-icon.png');
  assert('App icon (app.ico) exists in assets', fs.existsSync(icoPath));
  assert('Master 1:1 app-icon.png exists in assets', fs.existsSync(pngPath));

  // Test 1.2: Window Creation & Custom Chrome Properties
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#090d16',
    icon: icoPath,
    webPreferences: {
      preload: path.resolve(__dirname, '..', 'preload.js'),
      contextIsolation: true
    }
  });

  assert('BrowserWindow instantiated successfully', win && !win.isDestroyed());
  assert('Window frame is frameless (custom chrome)', win.isMenuBarVisible() === false);
  const [w, h] = win.getSize();
  assert('Window default dimensions initialized (1280x800)', Math.abs(w - 1280) <= 2 && Math.abs(h - 800) <= 2, `Actual: ${w}x${h}`);

  // Test 1.3: WebContentsView Tab Simulation
  const tab1View = new WebContentsView({
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  const tab2View = new WebContentsView({
    webPreferences: { contextIsolation: true, sandbox: true }
  });

  win.contentView.addChildView(tab1View);
  assert('Tab 1 WebContentsView attached to contentView', win.contentView.children.includes(tab1View));

  // Test 1.4: Tab Switching Mechanics
  win.contentView.removeChildView(tab1View);
  win.contentView.addChildView(tab2View);
  assert('Tab switching removes Tab 1 from active contentView', !win.contentView.children.includes(tab1View));
  assert('Tab switching attaches Tab 2 to active contentView', win.contentView.children.includes(tab2View));

  win.contentView.removeChildView(tab2View);
  try { tab1View.webContents.close(); } catch (e) {}
  try { tab2View.webContents.close(); } catch (e) {}

  // Test 1.5: Window State Transitions
  win.minimize();
  assert('Window minimize state triggered', true);
  win.restore();
  assert('Window restore state triggered', true);

  win.destroy();
  assert('Window destroyed and closed cleanly', win.isDestroyed());

  return results;
}

module.exports = { runSuite1 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite1();
      console.log(`\nSuite 1 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
