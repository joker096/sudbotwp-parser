const { execSync } = require('child_process');
try { execSync('git add -A', { encoding: 'utf8', stdio: 'inherit' }); } catch(e) {}
try { execSync('git commit -m "fix: add null checks for e.date.split() in Profile calendar filters, exclude 404.html from PWA precache"', { encoding: 'utf8', stdio: 'inherit' }); } catch(e) {}
try { execSync('git push', { encoding: 'utf8', stdio: 'inherit' }); } catch(e) {}