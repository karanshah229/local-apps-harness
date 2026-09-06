import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appDir = resolve(__dirname, '..');
const appJson = JSON.parse(readFileSync(resolve(appDir, 'app.json'), 'utf8'));
const version = appJson.expo?.version || '1.0.0';
const apkSource = resolve(appDir, 'android/app/build/outputs/apk/qa/app-qa.apk');
const releasesDir = resolve(appDir, '../kamdhenu-handoff/releases');
const apkDestination = resolve(releasesDir, `Kamdhenu-Handoff-QA-${version}.apk`);

if (!existsSync(apkSource)) {
  console.error(`QA APK not found at ${apkSource}`);
  process.exit(1);
}

mkdirSync(releasesDir, { recursive: true });
copyFileSync(apkSource, apkDestination);
const sizeMb = (statSync(apkDestination).size / (1024 * 1024)).toFixed(2);
console.log(`QA APK copied to ${apkDestination} (${sizeMb} MB)`);
