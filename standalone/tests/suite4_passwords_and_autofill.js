/**
 * Suite 4: Password Manager & Autofill Vault (Bitwarden / 21st.dev UX)
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

async function runSuite4() {
  const results = { name: 'Suite 4: Password Manager & Autofill Vault', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 4: Password Manager & Autofill Vault ---');

  // Register mock IPC handlers required by preload.js
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
    height: 750,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, '..', 'preload.js'),
      contextIsolation: true
    }
  });

  const indexPath = path.resolve(__dirname, '..', 'ui', 'index.html');
  await win.loadFile(indexPath);
  await new Promise(r => setTimeout(r, 600));

  // Test 4.1: Password Modal Elements Integrity
  const elementsCheck = await win.webContents.executeJavaScript(`
    (() => {
      const modal = document.getElementById('modalPasswords');
      const search = document.getElementById('passwordsSearch');
      const addBtn = document.getElementById('btnAddNewPassword');
      const addForm = document.getElementById('passwordAddForm');
      const siteInput = document.getElementById('newPassSite');
      const userInput = document.getElementById('newPassUser');
      const passInput = document.getElementById('newPassSecret');
      const tabLogins = document.getElementById('tabAutofillLogins');
      const tabAddresses = document.getElementById('tabAutofillAddresses');

      return {
        hasModal: Boolean(modal),
        hasSearch: Boolean(search),
        hasAddBtn: Boolean(addBtn),
        hasAddForm: Boolean(addForm),
        hasInputs: Boolean(siteInput && userInput && passInput),
        hasTabs: Boolean(tabLogins && tabAddresses)
      };
    })()
  `);

  assert('Password manager modal (#modalPasswords) exists in DOM', elementsCheck.hasModal);
  assert('Password search filter input (#passwordsSearch) exists', elementsCheck.hasSearch);
  assert('Inline "+ Add Login" button and form exist', elementsCheck.hasAddBtn && elementsCheck.hasAddForm);
  assert('Credentials form inputs (site, user, secret) exist', elementsCheck.hasInputs);
  assert('Segmented navigation tabs (Logins vs Addresses) exist', elementsCheck.hasTabs);

  // Test 4.2: Password CRUD Simulation via Vault Store
  const crudResult = await win.webContents.executeJavaScript(`
    (() => {
      // Open modal
      const modal = document.getElementById('modalPasswords');
      if (modal) modal.hidden = false;

      // Add a test login entry
      const siteInput = document.getElementById('newPassSite');
      const userInput = document.getElementById('newPassUser');
      const passInput = document.getElementById('newPassSecret');
      const saveBtn = document.getElementById('btnSaveNewPassword');

      siteInput.value = 'github.com';
      userInput.value = 'security_tester';
      passInput.value = 'HellFire#Pass2026!';

      if (saveBtn) saveBtn.click();

      // Check login list rendering
      const list = document.getElementById('passwordsList');
      const itemsCount = list ? list.querySelectorAll('.password-item').length : 0;
      const textContent = list ? list.innerText : '';

      return {
        itemsCount,
        hasGithub: textContent.includes('github.com'),
        hasUser: textContent.includes('security_tester')
      };
    })()
  `);

  assert('Login item successfully added to credential store', crudResult.itemsCount > 0);
  assert('Rendered card displays website domain "github.com"', crudResult.hasGithub);
  assert('Rendered card displays username "security_tester"', crudResult.hasUser);

  // Test 4.3: Password Masking & Reveal Toggle
  const revealTest = await win.webContents.executeJavaScript(`
    (() => {
      const toggleEyeBtn = document.querySelector('[data-action="toggle-eye"]');
      const secretSpan = document.querySelector('.password-secret-text');
      if (!toggleEyeBtn || !secretSpan) return { error: 'No item rendered' };

      const expectedSecret = toggleEyeBtn.getAttribute('data-secret');
      const initialMasked = secretSpan.textContent.includes('•');
      toggleEyeBtn.click();
      const revealedText = secretSpan.textContent;
      toggleEyeBtn.click();
      const remasked = secretSpan.textContent.includes('•');

      return { initialMasked, revealedText, expectedSecret, remasked };
    })()
  `);

  assert('Password initially rendered in masked bullet format', revealTest.initialMasked === true);
  assert('Password revealed on eye toggle click matches secret', Boolean(revealTest.revealedText) && revealTest.revealedText === revealTest.expectedSecret);
  assert('Password re-masked on subsequent toggle click', revealTest.remasked === true);

  // Test 4.4: Dual Tab Switching (Addresses Tab)
  const tabSwitchResult = await win.webContents.executeJavaScript(`
    (() => {
      const tabAddr = document.getElementById('tabAutofillAddresses');
      if (!tabAddr) return false;
      tabAddr.click();
      const addrSection = document.getElementById('viewAutofillAddresses');
      const loginsSection = document.getElementById('viewAutofillLogins');
      return addrSection && !addrSection.hidden && loginsSection && loginsSection.hidden;
    })()
  `);

  assert('Switching to Addresses tab shows autofill addresses section', Boolean(tabSwitchResult));

  win.destroy();
  return results;
}

module.exports = { runSuite4 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite4();
      console.log(`\nSuite 4 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
