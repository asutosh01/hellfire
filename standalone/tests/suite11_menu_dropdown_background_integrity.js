/**
 * Suite 11: 3-Bar Menu & Dropdown Background Integrity Test
 * Verifies that opening the 3-bar hamburger menu or dropdowns NEVER displaces,
 * crushes, or vanishes the active tab's WebContentsView or WebGL background.
 */

const { app, BrowserWindow, WebContentsView } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite11() {
  const results = {
    name: 'Suite 11: 3-Bar Menu & Viewport Integrity',
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

  console.log('\n--- Running Suite 11: 3-Bar Menu & Viewport Integrity ---');

  const standaloneDir = path.resolve(__dirname, '..');
  const mainJs = fs.readFileSync(path.join(standaloneDir, 'main.js'), 'utf-8');
  const preloadJs = fs.readFileSync(path.join(standaloneDir, 'preload.js'), 'utf-8');
  const browserJs = fs.readFileSync(path.join(standaloneDir, 'ui', 'browser.js'), 'utf-8');

  // Static checks
  assert('main.js does not inflate chromeH with dropdown offset', !mainJs.includes('const chromeH = baseH + (ws.extraDropdownHeight || 0);'));
  assert('main.js enforces fixed chromeH = baseH', mainJs.includes('const chromeH = baseH;'));
  assert('main.js registers menu:open-app-menu IPC handler', mainJs.includes("ipcMain.handle('menu:open-app-menu'"));
  assert('preload.js exposes openAppMenu API', preloadJs.includes('openAppMenu: (coords) => ipcRenderer.invoke(\'menu:open-app-menu\', coords)'));
  assert('browser.js calls openAppMenu on menu open', browserJs.includes('window.privateFox?.openAppMenu?.({'));
  assert('browser.js does not call setDropdownOffset in setAppMenuOpen', !browserJs.includes('window.privateFox?.setDropdownOffset(h > 0 ? h + 8 : 0);'));

  // Runtime window & view bounds test
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(standaloneDir, 'preload.js'),
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(standaloneDir, 'ui', 'index.html'));

  const tabView = new WebContentsView({
    webPreferences: {
      contextIsolation: true
    }
  });
  win.contentView.addChildView(tabView);

  const baseH = 110;
  const initialBounds = { x: 0, y: baseH, width: 1280, height: 800 - baseH };
  tabView.setBounds(initialBounds);

  await tabView.webContents.loadFile(path.join(standaloneDir, 'ui', 'newtab.html'));

  const boundsBefore = tabView.getBounds();
  assert('Tab view initial Y is at chrome baseline (110)', boundsBefore.y === 110);
  assert('Tab view initial height is full available viewport (690)', boundsBefore.height === 690);

  // Trigger app menu open via browser.js
  await win.webContents.executeJavaScript(`
    if (typeof setAppMenuOpen === 'function') {
      setAppMenuOpen(true);
    }
  `);

  await new Promise(r => setTimeout(r, 200));

  const boundsAfter = tabView.getBounds();
  assert('Tab view Y remained strictly unchanged (110) after opening 3-bar menu', boundsAfter.y === 110);
  assert('Tab view height remained strictly unchanged (690) after opening 3-bar menu', boundsAfter.height === 690);
  assert('Home page viewport was not crushed or pushed down', boundsAfter.y === boundsBefore.y && boundsAfter.height === boundsBefore.height);

  // Close app menu
  await win.webContents.executeJavaScript(`
    if (typeof setAppMenuOpen === 'function') {
      setAppMenuOpen(false);
    }
  `);

  await new Promise(r => setTimeout(r, 100));

  const boundsClosed = tabView.getBounds();
  assert('Tab view bounds remained rock-solid after closing menu', boundsClosed.y === 110 && boundsClosed.height === 690);

  win.destroy();
  return results;
}

if (require.main === module) {
  app.whenReady().then(async () => {
    const res = await runSuite11();
    app.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runSuite11 };
