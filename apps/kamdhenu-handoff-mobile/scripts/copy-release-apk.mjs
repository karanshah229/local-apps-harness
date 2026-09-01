import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appDir = resolve(__dirname, '..');
const repoRoot = resolve(appDir, '../..');
const appJsonPath = resolve(appDir, 'app.json');

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const version = appJson.expo?.version || '1.0.0';

const apkSource = resolve(appDir, 'android/app/build/outputs/apk/release/app-release.apk');
const releasesDir = resolve(repoRoot, 'releases');
const apkDestination = resolve(releasesDir, `Kamdhenu-Handoff-${version}.apk`);

if (!existsSync(apkSource)) {
  console.error(`Error: Release APK not found at ${apkSource}`);
  process.exit(1);
}

mkdirSync(releasesDir, { recursive: true });
copyFileSync(apkSource, apkDestination);

const stats = statSync(apkDestination);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n✅ Release APK successfully copied to:\n   ${apkDestination} (${sizeMb} MB)\n`);
