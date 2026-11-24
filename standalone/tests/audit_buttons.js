const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'index.html'), 'utf-8');
const browserJs = fs.readFileSync(path.resolve(__dirname, '..', 'ui', 'browser.js'), 'utf-8');

// Match all buttons with an ID
const buttonRegex = /<button[^>]*id=["']([^"']+)["'][^>]*>/gi;
let match;
const buttons = [];

while ((match = buttonRegex.exec(indexHtml)) !== null) {
  buttons.push(match[1]);
}

console.log(`Found ${buttons.length} buttons with IDs in index.html:`);

const unhandled = [];
const handled = [];

buttons.forEach(id => {
  // Check if id is referenced in browser.js with getElementById or addEventListener
  const hasRef = browserJs.includes(`'${id}'`) || browserJs.includes(`"${id}"`);
  if (hasRef) {
    handled.push(id);
  } else {
    unhandled.push(id);
  }
});

console.log(`\nHandled buttons (${handled.length}):`);
handled.forEach(id => console.log(`  ✓ ${id}`));

console.log(`\nUnhandled buttons (${unhandled.length}):`);
unhandled.forEach(id => console.log(`  ✗ ${id}`));

// Output summary object
const result = {
  totalButtons: buttons.length,
  handledCount: handled.length,
  unhandledCount: unhandled.length,
  unhandled
};

fs.writeFileSync(path.resolve(__dirname, 'buttons_audit.json'), JSON.stringify(result, null, 2));
