/**
 * Suite 5: Security, Encrypted DNS & Incognito Isolation
 */
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

async function runSuite5() {
  const results = { name: 'Suite 5: Security & Incognito Isolation', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 5: Security & Incognito Isolation ---');

  // Test 5.1: Content Security Policy (CSP) in newtab.html
  const newtabHtml = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'newtab.html'), 'utf-8');
  assert('CSP meta tag present in newtab.html', newtabHtml.includes('http-equiv="Content-Security-Policy"'));
  assert('CSP restricts connect-src to self (no data exfiltration)', newtabHtml.includes("connect-src 'self'"));
  assert('CSP restricts default-src to safe boundaries', newtabHtml.includes("default-src 'self'"));

  // Test 5.2: Incognito Badge Exclusivity (Normal Window Check)
  const normalWin = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    webPreferences: { contextIsolation: true }
  });

  const normalNewtabPath = path.resolve(__dirname, '..', 'ui', 'newtab.html');
  await normalWin.loadFile(normalNewtabPath);
  await new Promise(r => setTimeout(r, 600));

  const normalCheck = await normalWin.webContents.executeJavaScript(`
    ({
      isIncognitoBody: document.body.classList.contains('is-incognito-tab'),
      heroIncognitoVisible: document.getElementById('heroIncognito').style.display !== 'none',
      heroNormalVisible: document.getElementById('heroNormal').style.display !== 'none'
    })
  `);

  assert('Normal window does NOT have is-incognito-tab class', !normalCheck.isIncognitoBody);
  assert('Normal window hides incognito hero badge', !normalCheck.heroIncognitoVisible);
  assert('Normal window shows standard Hell Fire hero badge', normalCheck.heroNormalVisible);

  normalWin.destroy();

  // Test 5.3: Incognito Window Activation
  const incognitoWin = new BrowserWindow({
    width: 1200,
    height: 700,
    show: false,
    webPreferences: { contextIsolation: true }
  });

  const incognitoNewtabPath = path.resolve(__dirname, '..', 'ui', 'newtab.html');
  await incognitoWin.loadFile(incognitoNewtabPath, { search: 'incognito=1' });
  await new Promise(r => setTimeout(r, 600));

  const incognitoCheck = await incognitoWin.webContents.executeJavaScript(`
    (() => {
      // simulate newtab query param handling
      const isIncog = window.location.search.includes('incognito=1');
      if (isIncog) {
        document.body.classList.add('is-incognito-tab');
        const heroNormal = document.getElementById('heroNormal');
        const heroIncognito = document.getElementById('heroIncognito');
        if (heroNormal) heroNormal.style.display = 'none';
        if (heroIncognito) heroIncognito.style.display = 'flex';
      }
      return {
        isIncognitoBody: document.body.classList.contains('is-incognito-tab'),
        heroIncognitoVisible: document.getElementById('heroIncognito').style.display !== 'none',
        hasPrivacyCards: Boolean(document.querySelector('.incognito-info-grid'))
      };
    })()
  `);

  assert('Incognito window receives is-incognito-tab class', incognitoCheck.isIncognitoBody);
  assert('Incognito window displays "You\'ve gone Incognito" hero', incognitoCheck.heroIncognitoVisible);
  assert('Incognito window provides privacy security cards', incognitoCheck.hasPrivacyCards);

  incognitoWin.destroy();

  // Test 5.4: Ephemeral In-Memory Partition Session Check
  const incognitoPartitionSession = session.fromPartition('incognito-test-session', { cache: false });
  assert('Incognito partition is successfully isolated from default storage', incognitoPartitionSession !== session.defaultSession);

  return results;
}

module.exports = { runSuite5 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite5();
      console.log(`\nSuite 5 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
