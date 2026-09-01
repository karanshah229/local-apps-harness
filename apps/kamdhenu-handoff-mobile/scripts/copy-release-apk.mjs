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
  console.error(`\n❌ Error: Release APK not found at ${apkSource}`);
  console.error('The Gradle build did not generate an APK. Please check for build errors above.\n');
  process.exit(1);
}

const sourceStats = statSync(apkSource);
mkdirSync(releasesDir, { recursive: true });
copyFileSync(apkSource, apkDestination);

const destStats = statSync(apkDestination);
const sizeMb = (destStats.size / (1024 * 1024)).toFixed(2);
const modifiedTime = destStats.mtime.toLocaleTimeString();
console.log(`\n✅ Release APK (${version}) successfully built and copied!`);
console.log(`   Source:      ${apkSource}`);
console.log(`   Destination: ${apkDestination}`);
console.log(`   Size:        ${sizeMb} MB`);
console.log(`   Built at:    ${modifiedTime}\n`);
