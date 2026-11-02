import { existsSync } from 'node:fs';
import { launchChecks } from '../lib/launch-checks.ts';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const checks = launchChecks(process.env);
for (const check of checks) {
  console.log(`${check.ready ? 'PRESENT' : 'REVIEW '}  ${check.title}`);
  if (!check.ready) console.log(`         ${check.action}`);
}
console.log('\nThis checks configuration presence only. It makes no network calls and prints no secrets.');
const mandatory = new Set(['origin','firebase-browser','firebase-server','session','media']);
if (checks.some(check => mandatory.has(check.id) && !check.ready)) process.exitCode = 1;
