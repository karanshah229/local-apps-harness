import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const mobile = (...parts) => resolve(root, 'apps/kamdhenu-handoff-mobile', ...parts);
const source = (...parts) => readFileSync(mobile(...parts), 'utf8');

test('Android QA build installs beside production with release-mode JavaScript', () => {
  const gradle = source('android', 'app', 'build.gradle');
  const manifest = source('android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const qaManifest = source('android', 'app', 'src', 'qa', 'AndroidManifest.xml');
  const strings = source('android', 'app', 'src', 'qa', 'res', 'values', 'strings.xml');

  assert.match(gradle, /qa\s*\{[\s\S]*?initWith release/);
  assert.match(gradle, /applicationIdSuffix "\.qa"/);
  assert.match(gradle, /versionNameSuffix "-qa"/);
  assert.doesNotMatch(gradle, /debuggable true/);
  assert.doesNotMatch(gradle, /debuggableVariants\s*=\s*\[[^\]]*qa/i);
  assert.match(gradle, /appScheme: "kamdhenu-handoff-qa"/);
  assert.match(manifest, /android:scheme="\$\{appScheme\}"/);
  assert.match(qaManifest, /android:debuggable="true"/);
  assert.match(qaManifest, /tools:ignore="HardcodedDebugMode"/);
  assert.match(strings, /Kamdhenu Handoff QA/);
});

test('QA diagnostics are build-gated and production identity remains unchanged', () => {
  const identity = source('src', 'config', 'buildIdentity.ts');
  const panel = source('src', 'components', 'QaDiagnosticsPanel.tsx');
  const probes = source('src', 'services', 'qaDiagnostics.ts');
  const appJson = JSON.parse(source('app.json'));

  assert.match(identity, /EXPO_PUBLIC_QA_MODE === '1'/);
  assert.match(identity, /assertQaBuild/);
  assert.match(panel, /if \(!IS_QA_BUILD\) return null/);
  assert.match(probes, /assertQaBuild\(\)/);
  assert.match(probes, /qa_handled_error_probe/);
  assert.match(probes, /qa_retention_probe/);
  assert.match(probes, /Sentry\.nativeCrash\(\)/);
  assert.equal(appJson.expo.android.package, 'com.kamdhenu.handoff');
  assert.equal(appJson.expo.name, 'Kamdhenu Handoff');
  assert.equal(appJson.expo.scheme, 'kamdhenu-handoff');
});

test('QA artifact copy and package metadata are registered', () => {
  const packageJson = JSON.parse(source('package.json'));
  const copyScript = source('scripts', 'copy-qa-apk.mjs');
  const registry = JSON.parse(readFileSync(resolve(root, 'platform', 'apps.json'), 'utf8'));
  const app = registry.apps.find(candidate => candidate.id === 'kamdhenu-handoff');

  assert.match(packageJson.scripts['build:android:qa'], /EXPO_PUBLIC_QA_MODE=1/);
  assert.match(packageJson.scripts['build:android:qa'], /assembleQa/);
  assert.match(copyScript, /Kamdhenu-Handoff-QA-\$\{version\}\.apk/);
  assert.match(copyScript, /\.\.\/kamdhenu-handoff\/releases/);
  assert.equal(app.mobile.androidPackage, 'com.kamdhenu.handoff');
  assert.equal(app.mobile.qaAndroidPackage, 'com.kamdhenu.handoff.qa');
  assert.equal(app.mobile.qaArtifact, 'apps/kamdhenu-handoff/releases/Kamdhenu-Handoff-QA-1.0.17.apk');
});
