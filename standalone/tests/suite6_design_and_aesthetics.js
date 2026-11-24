/**
 * Suite 6: Visual & Aesthetic Design Directives Compliance
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function runSuite6() {
  const results = { name: 'Suite 6: Visual & Aesthetic Design Directives', tests: [], passed: 0, failed: 0 };
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

  console.log('\n--- Running Suite 6: Visual & Aesthetic Design Directives ---');

  const uiDir = path.resolve(__dirname, '..', 'ui');
  const indexHtml = fs.readFileSync(path.join(uiDir, 'index.html'), 'utf-8');
  const newtabHtml = fs.readFileSync(path.join(uiDir, 'newtab.html'), 'utf-8');
  const browserCss = fs.readFileSync(path.join(uiDir, 'browser.css'), 'utf-8');

  // Test 6.1: Zero Emoji Mandate in UI Buttons, Menus & Tabs
  // Regex pattern matching unicode emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  // Check UI button labels, menu items, tabs for emoji
  function scanForEmojis(html, fileName) {
    const lines = html.split('\n');
    const violations = [];
    lines.forEach((line, idx) => {
      // Exclude comments
      const clean = line.replace(/<!--.*?-->/g, '');
      if (emojiRegex.test(clean) && (clean.includes('<button') || clean.includes('<span') || clean.includes('menu-item') || clean.includes('<h'))) {
        violations.push({ line: idx + 1, text: clean.trim() });
      }
    });
    return violations;
  }

  const indexEmojiViolations = scanForEmojis(indexHtml, 'index.html');
  const newtabEmojiViolations = scanForEmojis(newtabHtml, 'newtab.html');

  assert('Zero emojis in index.html chrome, menus, and buttons', indexEmojiViolations.length === 0, `${indexEmojiViolations.length} violations`);
  assert('Zero emojis in newtab.html hero, search, and shortcuts', newtabEmojiViolations.length === 0, `${newtabEmojiViolations.length} violations`);

  // Test 6.2: Typography Architecture (Inter + OpenType Feature Settings + JetBrains Mono)
  assert('Inter font-face configured in newtab.html', newtabHtml.includes("font-family: 'Inter'"));
  assert('JetBrains Mono font-face configured in newtab.html', newtabHtml.includes("font-family: 'JetBrains Mono'"));
  assert('OpenType feature settings cv02, cv03, cv04, cv11, tnum, zero enabled', newtabHtml.includes("'cv02' 1, 'cv03' 1, 'cv04' 1, 'cv11' 1, 'tnum' 1, 'calt' 1, 'zero' 1"));
  assert('Negative tracking (-0.012em letter spacing) configured', newtabHtml.includes('-0.012em'));

  // Test 6.3: "Vibe Coded" Dark Theme Tokens
  assert('Root background token is obsidian #090d16', newtabHtml.includes('#090d16'));
  assert('Surface card token is #161b22', newtabHtml.includes('#161b22'));
  assert('Border token is #30363d', newtabHtml.includes('#30363d'));
  assert('Accent blue token is #2563eb / #3b82f6', newtabHtml.includes('#2563eb') && newtabHtml.includes('#3b82f6'));

  // Test 6.4: Official 1:1 App Icon Geometry & Multi-MIP Bundle
  const icoPath = path.join(uiDir, 'assets', 'app.ico');
  const pngPath = path.join(uiDir, 'assets', 'app-icon.png');
  assert('Official app.ico exists in assets', fs.existsSync(icoPath));
  assert('Official master app-icon.png exists in assets', fs.existsSync(pngPath));

  // Test 6.5: Spring Animation Easing Curve & Timing
  assert('Spring easing curve cubic-bezier(0.16, 1, 0.3, 1) configured', newtabHtml.includes('cubic-bezier(0.16, 1, 0.3, 1)') || indexHtml.includes('cubic-bezier(0.16, 1, 0.3, 1)'));
  assert('Fast fraction-of-second transition timings (150ms-240ms) utilized', newtabHtml.includes('240ms') || indexHtml.includes('150ms'));

  // Test 6.6: Capsule Pill Tab Architecture
  assert('Tab border specifications present in browser.css', browserCss.includes('.tab') && browserCss.includes('border'));
  assert('Active tab illuminated capsule border styled in browser.css', browserCss.includes('.tab[aria-selected="true"]') && browserCss.includes('border: 1px solid #f97316'));

  return results;
}

module.exports = { runSuite6 };

if (require.main === module) {
  app.whenReady().then(async () => {
    try {
      const res = await runSuite6();
      console.log(`\nSuite 6 Summary: ${res.passed}/${res.passed + res.failed} tests passed.`);
    } catch (e) {
      console.error(e);
    } finally {
      app.quit();
    }
  });
}
