#!/usr/bin/env node
/**
 * Деплой на VDS: копирует parse-all-cases.js и создаёт systemd service/timer
 */

const { execSync } = require('child_process');

const VDS_HOST = process.env.VDS_HOST || 'your-vds-host';
const VDS_USER = process.env.VDS_USER || 'root';

if (VDS_HOST === 'your-vds-host') {
  console.error('Set VDS_HOST and VDS_USER env variables');
  process.exit(1);
}

const files = [
  'scripts/parse-all-cases.js',
  'cron-parse-cases.sh',
  'sudo-cases-parser.service',
  'sud-parser.timer',
];

console.log(`Deploying to ${VDS_USER}@${VDS_HOST}...`);

// Copy files
files.forEach(file => {
  try {
    execSync(`scp ${file} ${VDS_USER}@${VDS_HOST}:/tmp/`, { stdio: 'inherit' });
    console.log(`Copied: ${file}`);
  } catch(e) {
    console.error(`Failed to copy ${file}`);
  }
});

// Create remote commands
const remoteSetup = `
  sudo mv /tmp/parse-all-cases.js /opt/sud-app/
  sudo mv /tmp/cron-parse-cases.sh /opt/sud-app/
  sudo cp /tmp/sudo-cases-parser.service /etc/systemd/system/sud-parser.service
  sudo cp /tmp/sud-parser.timer /etc/systemd/system/
  sudo sed -i 's/<YOUR_SERVICE_ROLE_KEY>/${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}/g' /etc/systemd/system/sud-parser.service
  sudo systemctl daemon-reload
  sudo systemctl enable sud-parser.timer
  sudo systemctl start sud-parser.timer
  sudo systemctl list-timers --all | grep sud-parser
`;

console.log('\nRun on VDS:');
console.log(remoteSetup);