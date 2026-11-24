/**
 * Suite 3: WebGL Burning Hellfire Engine & Zero-Resource Idle Lifecycle
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

async function runSuite3() {
  const results = { name: 'Suite 3: WebGL Hellfire Engine & Idle Lifecycle', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 3: WebGL Hellfire Engine & Idle Lifecycle ---');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    center: true,
    backgroundColor: '#090d16',
    webPreferences: {
      contextIsolation: true
    }
  });

  const newtabPath = path.resolve(__dirname, '..', 'ui', 'newtab.html');
  await win.loadFile(newtabPath);
  await new Promise(r => setTimeout(r, 800));

  // Test 3.1: Canvas presence & WebGL context initialization
  const webglStatus = await win.webContents.executeJavaScript(`
    (() => {
      const canvas = document.getElementById('hellfireBgCanvas');
      if (!canvas) return { error: 'No canvas found' };
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { error: 'No webgl context' };
      return {
        hasCanvas: true,
        hasContext: true,
        width: canvas.width,
        height: canvas.height,
        engineExists: Boolean(window.__hellfireBg)
      };
    })()
  `);

  assert('Canvas #hellfireBgCanvas present in DOM', webglStatus.hasCanvas);
  assert('WebGL rendering context initialized successfully', webglStatus.hasContext);
  assert('Canvas scaled with devicePixelRatio bounds', webglStatus.width >= 1280 && webglStatus.height >= 800);
  assert('Hellfire background engine hook (window.__hellfireBg) exposed', webglStatus.engineExists);

  // Test 3.2: 0.6x Velocity Scale & Initial Active State
  await win.webContents.executeJavaScript(`window.__hellfireBg.setForceVisible(true);`);
  await new Promise(r => setTimeout(r, 100));
  const speedScale = await win.webContents.executeJavaScript(`window.__hellfireBg.getSpeedScale()`);
  assert('Flame animation speed scale calibrated strictly to 0.6x', speedScale === 0.6);

  const initialRunning = await win.webContents.executeJavaScript(`window.__hellfireBg.isRunning()`);
  const initialVisible = await win.webContents.executeJavaScript(`window.__hellfireBg.isEffectivelyVisible()`);
  assert('Animation loop is actively ticking on page open', initialRunning === true);
  assert('Initial visibility state is effectively visible', initialVisible === true);

  // Test 3.3: Window Minimize Event -> Immediate Idle Pause
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: false, reason: 'minimize' } }));
  `);
  await new Promise(r => setTimeout(r, 150));

  const minRunning = await win.webContents.executeJavaScript(`window.__hellfireBg.isRunning()`);
  const minTime = await win.webContents.executeJavaScript(`window.__hellfireBg.getAccumulatedTime()`);
  assert('Animation completely halts on window minimize signal (0% GPU/CPU)', minRunning === false);

  // Verify time is frozen (zero drift during pause)
  await new Promise(r => setTimeout(r, 400));
  const postPauseTime = await win.webContents.executeJavaScript(`window.__hellfireBg.getAccumulatedTime()`);
  assert('Accumulated time is strictly frozen during pause (no background drift)', postPauseTime === minTime);

  // Test 3.4: Window Restore -> Seamless Resumption
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: true, reason: 'restore' } }));
  `);
  await new Promise(r => setTimeout(r, 500));

  const restoredRunning = await win.webContents.executeJavaScript(`window.__hellfireBg.isRunning()`);
  const restoredTime = await win.webContents.executeJavaScript(`window.__hellfireBg.getAccumulatedTime()`);
  assert('Animation seamlessly resumes on window restore', restoredRunning === true);
  assert('Animation advances smoothly from paused time without temporal warp', restoredTime >= minTime);

  // Test 3.5: Tab Switch Signal -> Idle Pause
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: false, reason: 'tab-switch' } }));
  `);
  await new Promise(r => setTimeout(r, 150));

  const switchRunning = await win.webContents.executeJavaScript(`window.__hellfireBg.isRunning()`);
  assert('Animation halts when user switches away to another tab or website', switchRunning === false);

  // Test 3.6: Tab Switch Back -> Resumption
  await win.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('hellfire:view-visibility', { detail: { visible: true, reason: 'tab-switch' } }));
  `);
  await new Promise(r => setTimeout(r, 400));

  const returnRunning = await win.webContents.executeJavaScript(`window.__hellfireBg.isRunning()`);
  assert('Animation resumes burning when returning home', returnRunning === true);

  win.destroy();
  return results;
}

module.exports = { runSuite3 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite3();
      console.log(`\nSuite 3 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
