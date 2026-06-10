#!/bin/bash
cd /var/www/sud.cvr.name/server
npm install dotenv qs 2>&1 | tail -5
echo "---"
node -e "import('dotenv').then(m => console.log('dotenv OK')).catch(e => console.log('FAIL:', e.message))"
node -e "import('qs').then(m => console.log('qs OK')).catch(e => console.log('FAIL:', e.message))"
