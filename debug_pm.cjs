const fs = require('fs');
const content = fs.readFileSync('dist/assets/PaymentModal-C8bXx69Y.js', 'utf8');

const terms = ['.events.map', '.events.filter', '.events.length', 'events.map', 'events.filter'];
for (const term of terms) {
  const idx = content.indexOf(term);
  if (idx !== -1) {
    console.log('Found "' + term + '" at pos ' + idx);
    console.log(JSON.stringify(content.substring(Math.max(0, idx - 50), idx + term.length + 50)));
    console.log('---');
  } else {
    console.log('Not found: ' + term);
  }
}

// Also search for where the error occurs (around char 10578)
// The error is at line 4:10578 in the source map
// Let's look at the actual line 4 content around that position
const lines = content.split('\n');
console.log('\nTotal lines: ' + lines.length);
if (lines.length >= 4) {
  console.log('Line 4 length: ' + lines[3].length);
  if (lines[3].length > 10578) {
    console.log('Around pos 10578: ' + JSON.stringify(lines[3].substring(10550, 10610)));
  }
}

// More importantly - find ALL method calls on events-like variables
// Look for patterns like "s.events" where s is a variable
const eventPattern = /[a-z]\.events/gi;
let match;
while ((match = eventPattern.exec(content)) !== null) {
  const pos = match.index;
  console.log('Variable.events at pos ' + pos + ': ' + JSON.stringify(content.substring(pos - 10, pos + 40)));
}