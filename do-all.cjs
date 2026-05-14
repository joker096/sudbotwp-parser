const { execSync } = require('child_process');
try {
  execSync('git add -A', { encoding: 'utf8', stdio: 'inherit' });
} catch(e) {}
try {
  execSync('git commit -m "chore: remove obsolete deploy/parser scripts, document parsing logic"', { encoding: 'utf8', stdio: 'inherit' });
} catch(e) {}
try {
  execSync('git push', { encoding: 'utf8', stdio: 'inherit' });
} catch(e) {}