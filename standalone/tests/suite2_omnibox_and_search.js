/**
 * Suite 2: Omnibox, URL Normalization & Search Routing
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Test URL normalization algorithm mirror from main.js
function normalizeUrl(input, isIncognito = false) {
  if (!input) return getNewTabUrl(isIncognito);
  const trimmed = input.trim();
  if (trimmed === 'about:hellfire' || trimmed === 'about:privatefox' || trimmed === 'about:newtab' || trimmed === 'about:blank' || trimmed === 'about:incognito') {
    return getNewTabUrl(isIncognito);
  }
  const allowedNewTabBase = url.pathToFileURL(path.join(__dirname, '..', 'ui', 'newtab.html')).href;
  if (trimmed.startsWith(allowedNewTabBase)) return trimmed;
  if (trimmed.startsWith('about:')) return 'about:blank';
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return 'http://' + trimmed;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) return 'http://' + trimmed;
  if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed)) return 'https://' + trimmed;
  return getSearchUrl(trimmed, 'brave');
}

function getSearchUrl(query, engine = 'brave') {
  const enc = encodeURIComponent(query);
  const engines = {
    brave: `https://search.brave.com/search?q=${enc}`,
    google: `https://www.google.com/search?q=${enc}`,
    duckduckgo: `https://duckduckgo.com/?q=${enc}`,
    ecosia: `https://www.ecosia.org/search?q=${enc}`,
    startpage: `https://www.startpage.com/sp/search?query=${enc}`
  };
  return engines[engine] || engines.brave;
}

function getNewTabUrl(isIncognito = false) {
  const fileUrl = url.pathToFileURL(path.join(__dirname, '..', 'ui', 'newtab.html')).href;
  return isIncognito ? `${fileUrl}?incognito=1` : fileUrl;
}

async function runSuite2() {
  const results = { name: 'Suite 2: Omnibox & Search Routing', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 2: Omnibox & Search Routing ---');

  // Test 2.1: Domain name normalization
  assert('Normalizes "github.com" to https://github.com', normalizeUrl('github.com') === 'https://github.com');
  assert('Normalizes "subdomain.example.org/path" to https://', normalizeUrl('subdomain.example.org/path') === 'https://subdomain.example.org/path');

  // Test 2.2: Localhost & IP addresses
  assert('Normalizes "localhost:3000" to http://localhost:3000', normalizeUrl('localhost:3000') === 'http://localhost:3000');
  assert('Normalizes IP "192.168.1.1:8080" to http://192.168.1.1:8080', normalizeUrl('192.168.1.1:8080') === 'http://192.168.1.1:8080');

  // Test 2.3: Search Query Routing
  const queryResult = normalizeUrl('hell fire browser privacy');
  assert('Routes search query to Brave Search URL', queryResult.startsWith('https://search.brave.com/search?q='));
  assert('Search engine URL encodes spaces', queryResult.includes('hell%20fire%20browser'));

  // Test 2.4: Multi-engine query builders
  assert('Google search URL builder works', getSearchUrl('test', 'google') === 'https://www.google.com/search?q=test');
  assert('DuckDuckGo search URL builder works', getSearchUrl('test', 'duckduckgo') === 'https://duckduckgo.com/?q=test');
  assert('StartPage search URL builder works', getSearchUrl('test', 'startpage') === 'https://www.startpage.com/sp/search?query=test');

  // Test 2.5: Internal about: scheme routing
  assert('Normalizes about:newtab to local newtab.html', normalizeUrl('about:newtab').includes('newtab.html'));
  assert('Normalizes about:incognito to incognito newtab.html query', normalizeUrl('about:incognito', true).includes('incognito=1'));

  // Test 2.6: Browser UI Omnibox Element Integrity
  const mockHandlers = {
    'app:get-initial-state': () => ({ tabs: [], activeTabId: 1, settings: {} }),
    'modal:set-open': () => {},
    'settings:get': () => ({}),
    'bookmarks:get': () => [],
    'history:get': () => [],
    'vault:save': () => ({ success: true }),
    'vault:get': () => null
  };
  for (const [ch, fn] of Object.entries(mockHandlers)) {
    try { ipcMain.removeHandler(ch); } catch (e) {}
    try { ipcMain.handle(ch, fn); } catch (e) {}
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.webContents.on('did-fail-load', (e, code, desc, validatedURL) => {
    console.log('SUITE2_FAIL_LOAD:', { code, desc, validatedURL });
  });

  try {
    const target = path.resolve(__dirname, '..', 'ui', 'index.html');
    await win.loadFile(target);
    await new Promise(r => setTimeout(r, 600));

    const uiChecks = await win.webContents.executeJavaScript(`
      ({
        hasOmniInput: Boolean(document.getElementById('omniboxInput')),
        hasBtnBack: Boolean(document.getElementById('btnBack')),
        hasBtnForward: Boolean(document.getElementById('btnForward')),
        hasBtnReload: Boolean(document.getElementById('btnReload')),
        hasBtnLock: Boolean(document.getElementById('btnLock')),
        hasBtnShield: Boolean(document.getElementById('btnShield') || document.getElementById('btnToggleShield')),
        hasBtnAppMenu: Boolean(document.getElementById('btnAppMenu'))
      })
    `);

    assert('Omnibox input (#omniboxInput) present in UI', uiChecks.hasOmniInput);
    assert('Navigation buttons (#btnBack, #btnForward, #btnReload) present in UI', uiChecks.hasBtnBack && uiChecks.hasBtnForward && uiChecks.hasBtnReload);
    assert('Security lock and Privacy Shield buttons present in UI', uiChecks.hasBtnLock && uiChecks.hasBtnShield);
    assert('App menu 3-bar button present in UI', uiChecks.hasBtnAppMenu);
  } catch (err) {
    console.error('Suite 2 UI check error:', err);
    assert('Omnibox & Toolbar UI elements load cleanly', false, err.message);
  } finally {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  }

  return results;
}

module.exports = { runSuite2 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite2();
      console.log(`\nSuite 2 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
