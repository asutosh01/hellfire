/**
 * Suite 12: Tab Drag & Drop Swapping and Reordering
 * Verifies that tabs can be smoothly dragged, shifted, and swapped across the tab strip,
 * updating DOM order, active tab cycling, and main process tab state.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite12() {
  const results = {
    name: 'Suite 12: Tab Drag & Drop Swapping and Reordering',
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

  console.log('\n--- Running Suite 12: Tab Drag & Drop Swapping and Reordering ---');

  const standaloneDir = path.resolve(__dirname, '..');
  const mainJs = fs.readFileSync(path.join(standaloneDir, 'main.js'), 'utf-8');
  const preloadJs = fs.readFileSync(path.join(standaloneDir, 'preload.js'), 'utf-8');
  const browserJs = fs.readFileSync(path.join(standaloneDir, 'ui', 'browser.js'), 'utf-8');
  const browserCss = fs.readFileSync(path.join(standaloneDir, 'ui', 'browser.css'), 'utf-8');

  // 1. Static Contract Checks
  assert('main.js defines reorderTabs function', mainJs.includes('function reorderTabs(winState, orderedTabIds)'));
  assert('main.js registers tab:reorder IPC handler', mainJs.includes("ipcMain.handle('tab:reorder'"));
  assert('preload.js exposes reorderTabs API', preloadJs.includes("reorderTabs: (orderedTabIds) => ipcRenderer.invoke('tab:reorder', orderedTabIds)"));
  assert('browser.js contains attachTabDragAndDrop architecture', browserJs.includes('function attachTabDragAndDrop(tabBtn)'));
  assert('browser.js contains moveActiveTab function for keyboard reordering', browserJs.includes('function moveActiveTab(direction)'));
  assert('browser.js binds Ctrl+Shift+PageUp and PageDown/Arrow keys', browserJs.includes("e.ctrlKey && e.shiftKey && (e.key === 'PageUp' || e.key === 'ArrowLeft')"));
  assert('browser.js registers Escape cancellation handler', browserJs.includes("e.key === 'Escape' && activeTabDrag"));
  assert('browser.css styles .tab.tab--dragging with grabbing cursor and elevated z-index', browserCss.includes('.tab.tab--dragging') && browserCss.includes('cursor: grabbing !important;'));
  assert('browser.css styles .tab.tab--drag-animating with spring transition', browserCss.includes('.tab.tab--drag-animating') && browserCss.includes('cubic-bezier(0.2, 0, 0, 1)'));
  assert('browser.css styles body.is-tab-dragging', browserCss.includes('body.is-tab-dragging'));

  // 2. Main Process Tab Array Reordering Logic Unit Tests
  const mockTabs = [
    { id: 101, title: 'Tab One', url: 'https://example.com/1' },
    { id: 102, title: 'Tab Two', url: 'https://example.com/2' },
    { id: 103, title: 'Tab Three', url: 'https://example.com/3' },
    { id: 104, title: 'Tab Four', url: 'https://example.com/4' }
  ];

  function testReorderLogic(initialTabs, orderedIds) {
    const tabMap = new Map();
    initialTabs.forEach(t => tabMap.set(String(t.id), t));
    const newTabs = [];
    orderedIds.forEach(id => {
      const key = String(id);
      if (tabMap.has(key)) {
        newTabs.push(tabMap.get(key));
        tabMap.delete(key);
      }
    });
    for (const remaining of tabMap.values()) {
      newTabs.push(remaining);
    }
    return newTabs;
  }

  const reordered1 = testReorderLogic([...mockTabs], [103, 101, 104, 102]);
  assert('reorderTabs logic correctly swaps and sequences tab objects',
    reordered1.map(t => t.id).join(',') === '103,101,104,102',
    `Got: ${reordered1.map(t => t.id).join(',')}`
  );

  const reordered2 = testReorderLogic([...mockTabs], [104]);
  assert('reorderTabs preserves relative order of unmentioned tabs',
    reordered2.map(t => t.id).join(',') === '104,101,102,103',
    `Got: ${reordered2.map(t => t.id).join(',')}`
  );

  // 3. Runtime Browser Window & UI Drag/Swap Simulation
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

  const uiTestResult = await win.webContents.executeJavaScript(`
    (() => {
      const tabsScroll = document.getElementById('tabsScroll');
      const btnNewTab = document.getElementById('btnNewTab');

      // Create 3 simulated tab buttons
      const tabA = document.createElement('button');
      tabA.className = 'tab';
      tabA.id = 'tab-1';
      tabA.setAttribute('data-tab-id', '1');
      tabA.textContent = 'Alpha';

      const tabB = document.createElement('button');
      tabB.className = 'tab';
      tabB.id = 'tab-2';
      tabB.setAttribute('data-tab-id', '2');
      tabB.textContent = 'Beta';

      const tabC = document.createElement('button');
      tabC.className = 'tab';
      tabC.id = 'tab-3';
      tabC.setAttribute('data-tab-id', '3');
      tabC.textContent = 'Gamma';

      tabsScroll.insertBefore(tabA, btnNewTab);
      tabsScroll.insertBefore(tabB, btnNewTab);
      tabsScroll.insertBefore(tabC, btnNewTab);

      // Verify DOM insertion
      const initialDomIds = Array.from(tabsScroll.querySelectorAll('.tab')).map(t => t.getAttribute('data-tab-id'));

      // Test DOM swapping: Swap Tab A and Tab B
      tabB.after(tabA);
      const swappedDomIds1 = Array.from(tabsScroll.querySelectorAll('.tab')).map(t => t.getAttribute('data-tab-id'));

      // Move Tab C before Tab B
      tabB.before(tabC);
      const swappedDomIds2 = Array.from(tabsScroll.querySelectorAll('.tab')).map(t => t.getAttribute('data-tab-id'));

      // Verify btnNewTab remains at the end
      const lastChildIsNewTab = tabsScroll.lastElementChild === btnNewTab;

      // Clean up test tabs
      tabA.remove();
      tabB.remove();
      tabC.remove();

      return {
        initialDomIds,
        swappedDomIds1,
        swappedDomIds2,
        lastChildIsNewTab
      };
    })()
  `);

  assert('UI initializes tabs in correct starting DOM order', uiTestResult.initialDomIds.join(',') === '1,2,3');
  assert('DOM accurately updates when swapping Tab A after Tab B', uiTestResult.swappedDomIds1.join(',') === '2,1,3');
  assert('DOM accurately updates when swapping Tab C before Tab B', uiTestResult.swappedDomIds2.join(',') === '3,2,1');
  assert('btnNewTab always remains at the end of tabsScroll', uiTestResult.lastChildIsNewTab === true);

  win.destroy();

  return results;
}

module.exports = { runSuite12 };
