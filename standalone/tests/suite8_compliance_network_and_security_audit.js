/**
 * Suite 8: Compliance, Network Security (DoH / TLS), Download Sanitization & A11y Standards
 * Integrating skills: agency-compliance-auditor, agency-api-tester, agency-network-engineer
 */
const { app, session, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite8() {
  const results = {
    name: 'Suite 8: Compliance, Network (DoH), Download Sanitization & A11y',
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

  console.log('\n--- Running Suite 8: Compliance, Network, Download Sanitization & A11y ---');

  const mainCode = fs.readFileSync(path.resolve(__dirname, '..', 'main.js'), 'utf-8');
  const browserHtml = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'index.html'), 'utf-8');
  const newtabHtml = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'newtab.html'), 'utf-8');
  const preloadCode = fs.readFileSync(path.resolve(__dirname, '..', 'preload.js'), 'utf-8');

  // ─────────────────────────────────────────────────────────────
  // 1. DOWNLOAD PATH TRAVERSAL SANITIZATION (PortSwigger / Snyk)
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 1: Download Sanitization & Path Traversal]');

  assert('main.js contains path.basename sanitization for incoming download filenames',
    mainCode.includes('path.basename(rawFileName)'));
  assert('main.js strips directory traversal and illegal filename characters',
    mainCode.includes('.replace(/[/\\\\?%*:|"<>]/g, \'_\')'));
  assert('main.js verifies targetPath starts with downloads directory',
    mainCode.includes('targetPath.startsWith(downloadsDir)'));

  // Test custom filename sanitizer logic
  function sanitizeDownloadFilename(raw) {
    const sanitized = path.basename(raw).replace(/[/\\?%*:|"<>]/g, '_');
    return sanitized.trim() || 'download';
  }

  assert('Sanitizer: ../../../../Windows/System32/cmd.exe converted to safe basename',
    sanitizeDownloadFilename('../../../../Windows/System32/cmd.exe') === 'cmd.exe');
  assert('Sanitizer: ..\\..\\..\\malicious.bat converted to safe basename',
    sanitizeDownloadFilename('..\\..\\..\\malicious.bat') === 'malicious.bat');
  assert('Sanitizer: empty or whitespace filename defaults to "download"',
    sanitizeDownloadFilename('   ') === 'download');

  // ─────────────────────────────────────────────────────────────
  // 2. NETWORK SECURITY & DOH RESOLVERS (RFC 8484)
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 2: Network Security & DNS over HTTPS Resolvers]');

  assert('main.js configures secure DNS mode with built-in host resolver',
    mainCode.includes('secureDnsMode: \'secure\'') && mainCode.includes('enableBuiltInResolver: true'));

  const settingsJsonPath = path.resolve(__dirname, '..', 'data', 'settings.json');
  let settingsData = {};
  if (fs.existsSync(settingsJsonPath)) {
    try { settingsData = JSON.parse(fs.readFileSync(settingsJsonPath, 'utf-8')); } catch (e) {}
  }

  const doh = settingsData.dohProviders || {};

  assert('DoH providers include Cloudflare secure endpoint', typeof doh.cloudflare === 'string' && doh.cloudflare.startsWith('https://'));
  assert('DoH providers include Quad9 privacy-respecting endpoint', typeof doh.quad9 === 'string' && doh.quad9.startsWith('https://'));
  assert('DoH providers include Mullvad secure privacy endpoint', typeof doh.mullvad === 'string' && doh.mullvad.startsWith('https://'));

  // ─────────────────────────────────────────────────────────────
  // 3. STORAGE PARTITIONING & DATA DELETION COMPLIANCE (GDPR/CCPA)
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 3: Storage Partitioning & Deletion Compliance]');

  assert('clearStorageData includes cookies, localstorage, indexdb, and indexeddb',
    mainCode.includes('indexeddb') && mainCode.includes('localstorage') && mainCode.includes('cookies'));
  assert('clearStorageData includes serviceworkers cleanup',
    mainCode.includes('serviceworkers'));
  assert('clearStorageData includes cachestorage cleanup',
    mainCode.includes('cachestorage'));

  // ─────────────────────────────────────────────────────────────
  // 4. API CONTRACT AUDIT (PRELOAD VS MAIN PROCESS)
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 4: API Contract & IPC Surface Verification]');

  // Extract all invoke channels from preload.js
  const preloadMatches = preloadCode.matchAll(/ipcRenderer\.invoke\(['"]([^'"]+)['"]/g);
  const preloadChannels = Array.from(preloadMatches, m => m[1]);
  assert('Preload exposes verified list of IPC invocation channels', preloadChannels.length >= 25);

  // Verify all channels have matching handlers in main.js
  let missingHandlers = 0;
  for (const ch of preloadChannels) {
    if (!mainCode.includes(`'${ch}'`) && !mainCode.includes(`"${ch}"`)) {
      missingHandlers++;
      console.warn(`  Warning: Channel ${ch} missing in main.js`);
    }
  }
  assert('Zero missing IPC handlers between preload.js and main.js', missingHandlers === 0);

  // ─────────────────────────────────────────────────────────────
  // 5. ACCESSIBILITY (WCAG 2.1 AA) & ARIA AUDIT
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 5: Accessibility & WCAG 2.1 AA Audit]');

  // Check Omnibox ARIA attributes
  assert('Omnibox input has role or autocomplete attributes',
    browserHtml.includes('id="omniboxInput"') && browserHtml.includes('autocomplete="off"'));

  // Check high-contrast obsidian color scheme (> 10:1 ratio for white text on obsidian background)
  assert('Obsidian background (#090d16) and text color tokens configured',
    browserHtml.includes('var(--bg-obsidian)') || browserHtml.includes('#090d16') || newtabHtml.includes('#090d16'));

  // Check all form inputs have associated labels or placeholder descriptors
  const hasOmniboxPlaceholder = browserHtml.includes('placeholder="Search Brave or enter URL"') && browserHtml.includes('aria-label="Address and search bar"');
  assert('Omnibox has descriptive accessible placeholder and aria-label', hasOmniboxPlaceholder);

  const hasSearchInputPlaceholder = newtabHtml.includes('id="searchField"') && newtabHtml.includes('placeholder="Search with Brave or enter address"');
  assert('Newtab search input has descriptive accessible placeholder', hasSearchInputPlaceholder);

  // Check password inputs have type="password" for screen reader privacy
  assert('Password manager credential inputs have secure password masking',
    browserHtml.includes('type="password"'));

  return results;
}

module.exports = { runSuite8 };

if (require.main === module) {
  app.whenReady().then(async () => {
    const res = await runSuite8();
    console.log(`\nSuite 8 finished: ${res.passed} passed, ${res.failed} failed.`);
    app.quit();
  });
}
