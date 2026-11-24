/**
 * Master Test Harness: Run All 6 Comprehensive Browser Suites
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const { runSuite1 } = require('./suite1_window_and_tabs');
const { runSuite2 } = require('./suite2_omnibox_and_search');
const { runSuite3 } = require('./suite3_webgl_flame_and_idle');
const { runSuite4 } = require('./suite4_passwords_and_autofill');
const { runSuite5 } = require('./suite5_security_and_incognito');
const { runSuite6 } = require('./suite6_design_and_aesthetics');
const { runSuite7 } = require('./suite7_enterprise_qa_and_chaos');
const { runSuite8 } = require('./suite8_compliance_network_and_security_audit');
const { runSuite9 } = require('./suite9_zen_and_helium_features');
const { runSuite10 } = require('./suite10_real_app_launch_and_entrypoint_smoke');
const { runSuite11 } = require('./suite11_menu_dropdown_background_integrity');

app.on('window-all-closed', (e) => {
  if (e && e.preventDefault) e.preventDefault();
});

app.whenReady().then(async () => {
  console.log('================================================================');
  console.log('🔥 HELL FIRE BROWSER — COMPREHENSIVE SYSTEM TEST HARNESS');
  console.log('   Testing all modules bit by bit across architecture & design');
  console.log('================================================================');

  const startTime = Date.now();
  const allResults = [];

  const suites = [
    { id: 1, fn: runSuite1 },
    { id: 2, fn: runSuite2 },
    { id: 3, fn: runSuite3 },
    { id: 4, fn: runSuite4 },
    { id: 5, fn: runSuite5 },
    { id: 6, fn: runSuite6 },
    { id: 7, fn: runSuite7 },
    { id: 8, fn: runSuite8 },
    { id: 9, fn: runSuite9 },
    { id: 10, fn: runSuite10 },
    { id: 11, fn: runSuite11 }
  ];

  for (const s of suites) {
    const sStart = Date.now();
    try {
      const res = await s.fn();
      res.durationMs = Date.now() - sStart;
      allResults.push(res);
    } catch (err) {
      console.error(`Error running Suite ${s.id}:`, err);
      allResults.push({
        name: `Suite ${s.id} (Fatal Error)`,
        passed: 0,
        failed: 1,
        durationMs: Date.now() - sStart,
        tests: [{ title: 'Execution crashed', status: 'FAIL', extra: err.message }]
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n================================================================');
  console.log('                   MASTER TEST EXECUTION MATRIX                  ');
  console.log('================================================================');

  allResults.forEach((res, idx) => {
    totalTests += (res.passed + res.failed);
    totalPassed += res.passed;
    totalFailed += res.failed;

    const statusBadge = res.failed === 0 ? '✓ PASSED' : '✗ FAILED';
    console.log(`[Suite ${idx + 1}] ${res.name.padEnd(52)} | ${statusBadge} (${res.passed}/${res.passed + res.failed}) in ${res.durationMs}ms`);
  });

  console.log('----------------------------------------------------------------');
  console.log(`TOTAL TEST CASES RUN : ${totalTests}`);
  console.log(`TOTAL TESTS PASSED   : ${totalPassed} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
  console.log(`TOTAL TESTS FAILED   : ${totalFailed}`);
  console.log(`TOTAL DURATION       : ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('================================================================\n');

  // Save report to disk
  const reportPath = path.resolve(__dirname, 'test_report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    totalTests,
    totalPassed,
    totalFailed,
    totalDurationMs: totalDuration,
    successRate: `${((totalPassed/totalTests)*100).toFixed(1)}%`,
    suites: allResults
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
  console.log(`Master test report written to: ${reportPath}`);

  app.quit();
  process.exit(totalFailed > 0 ? 1 : 0);
});
