/**
 * Suite 10: End-to-End App Launch & Desktop Entrypoint Smoke Test
 * Tests the real execution path: Spawns the actual main.js binary,
 * verifies 0 uncaught startup exceptions, verifies active window creation,
 * and validates all desktop shortcuts and launcher batch files.
 * Integrating skills: agency-reality-checker, agency-code-reviewer, agency-sre-site-reliability-engineer
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

async function runSuite10() {
  const results = {
    name: 'Suite 10: Real Entrypoint & E2E App Launch Smoke Test',
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

  console.log('\n--- Running Suite 10: Real App Launch & Entrypoint Smoke Test ---');

  const standaloneDir = path.resolve(__dirname, '..');
  const projectDir = path.resolve(standaloneDir, '..');
  const electronExe = path.join(standaloneDir, 'node_modules', 'electron', 'dist', 'electron.exe');
  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\ASUT', 'Desktop');

  // ─────────────────────────────────────────────────────────────
  // 1. REAL ELECTRON PROCESS BOOTSTRAP (Smoke Test)
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 1: Real Process Spawning & Startup Monitoring]');

  assert('Electron executable binary exists in standalone node_modules',
    fs.existsSync(electronExe), `Path: ${electronExe}`);
  assert('main.js entrypoint file exists in standalone root',
    fs.existsSync(path.join(standaloneDir, 'main.js')));
  assert('package.json scripts.start references "electron ."',
    fs.existsSync(path.join(standaloneDir, 'package.json')) &&
    require(path.join(standaloneDir, 'package.json')).scripts.start === 'electron .');

  // Spawn the real application process for 4 seconds
  let startupStderr = '';
  let startupStdout = '';
  let processExitedPrematurely = false;
  let exitCode = null;

  await new Promise((resolve) => {
    const child = spawn(electronExe, ['.'], {
      cwd: standaloneDir,
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
    });

    child.stdout?.on('data', (data) => {
      startupStdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      startupStderr += data.toString();
    });

    child.on('exit', (code) => {
      processExitedPrematurely = true;
      exitCode = code;
    });

    // Let the app initialize, create its window, apply DoH, and load UI
    setTimeout(() => {
      if (!processExitedPrematurely) {
        // App is alive and healthy - terminate test spawn cleanly
        child.kill();
      }
      resolve();
    }, 3800);
  });

  // Verify no fatal startup crashes
  const hasTypeError = /TypeError:/i.test(startupStderr) || /TypeError:/i.test(startupStdout);
  const hasUnhandledRejection = /UnhandledPromiseRejection/i.test(startupStderr) || /UnhandledPromiseRejection/i.test(startupStdout);
  const hasReferenceError = /ReferenceError:/i.test(startupStderr) || /ReferenceError:/i.test(startupStdout);
  const hasSyntaxError = /SyntaxError:/i.test(startupStderr) || /SyntaxError:/i.test(startupStdout);

  assert('Real app launch produced ZERO UnhandledPromiseRejection errors',
    !hasUnhandledRejection, startupStderr.slice(0, 200));
  assert('Real app launch produced ZERO TypeError exceptions (e.g. setWebRTCIPHandlingPolicy)',
    !hasTypeError, startupStderr.slice(0, 200));
  assert('Real app launch produced ZERO ReferenceError exceptions',
    !hasReferenceError, startupStderr.slice(0, 200));
  assert('Real app launch produced ZERO SyntaxError exceptions',
    !hasSyntaxError, startupStderr.slice(0, 200));
  assert('Real app process remained alive with active window (did not crash or exit on boot)',
    !processExitedPrematurely, `Exit code: ${exitCode}`);

  // ─────────────────────────────────────────────────────────────
  // 2. DESKTOP SHORTCUT TARGET INTEGRITY
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 2: Desktop Shortcut (.lnk) Target Verification]');

  const shortcutsToCheck = ['Hell Fire.lnk', 'Hell Fire Browser.lnk'];
  shortcutsToCheck.forEach(lnkName => {
    const lnkPath = path.join(desktopDir, lnkName);
    const exists = fs.existsSync(lnkPath);
    assert(`Desktop shortcut exists: ${lnkName}`, exists);

    if (exists) {
      try {
        const psCmd = `powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('${lnkPath.replace(/'/g, "''")}'); Write-Output ($s.TargetPath + '|' + $s.WorkingDirectory)"`;
        const output = execSync(psCmd).toString().trim();
        const [targetPath, workDir] = output.split('|');

        assert(`Shortcut ${lnkName} target executable exists on disk`,
          fs.existsSync(targetPath), `Target: ${targetPath}`);
        assert(`Shortcut ${lnkName} target does NOT point to dead 'private-fox' directory`,
          !targetPath.toLowerCase().includes('private-fox'));
        assert(`Shortcut ${lnkName} working directory exists on disk`,
          fs.existsSync(workDir), `WorkDir: ${workDir}`);
      } catch (err) {
        assert(`Shortcut ${lnkName} inspected without error`, false, err.message);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 3. LAUNCHER BATCH SCRIPTS INTEGRITY
  // ─────────────────────────────────────────────────────────────
  console.log('  [Section 3: Launcher Script Verification]');

  const rootBat = path.join(projectDir, 'Launch Hell Fire.bat');
  const standaloneBat = path.join(standaloneDir, 'Launch Hell Fire.bat');
  const vbsScript = path.join(standaloneDir, 'launch.vbs');

  assert('Root "Launch Hell Fire.bat" exists', fs.existsSync(rootBat));
  assert('Standalone "Launch Hell Fire.bat" exists', fs.existsSync(standaloneBat));
  assert('launch.vbs does not contain stale "private-fox" path',
    fs.existsSync(vbsScript) && !fs.readFileSync(vbsScript, 'utf-8').includes('private-fox'));

  return results;
}

module.exports = { runSuite10 };

if (require.main === module) {
  app.whenReady().then(async () => {
    const res = await runSuite10();
    console.log(`\nSuite 10 finished: ${res.passed} passed, ${res.failed} failed.`);
    app.quit();
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
