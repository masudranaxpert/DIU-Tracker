/**
 * Installs PDF Tools native Android code from frontend/android-native/ into the
 * generated Capacitor android/ project. Safe to run after every `cap sync`.
 *
 * Source of truth (committed to git):
 *   frontend/android-native/ToolsFilesPlugin.java
 *   frontend/android-native/MainActivity.java
 *
 * Generated (gitignored):
 *   frontend/android/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(frontendRoot, 'android');
const nativeRoot = path.join(frontendRoot, 'android-native');

const pluginSrc = path.join(nativeRoot, 'ToolsFilesPlugin.java');
const mainActivitySrc = path.join(nativeRoot, 'MainActivity.java');
const pluginDestDir = path.join(
  androidRoot,
  'app',
  'src',
  'main',
  'java',
  'com',
  'diucse',
  'academictracker',
  'plugins'
);
const pluginDest = path.join(pluginDestDir, 'ToolsFilesPlugin.java');
const mainActivityDest = path.join(
  androidRoot,
  'app',
  'src',
  'main',
  'java',
  'com',
  'diucse',
  'academictracker',
  'MainActivity.java'
);
const filePathsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');

const resSrcRoot = path.join(nativeRoot, 'res');
const resDestRoot = path.join(androidRoot, 'app', 'src', 'main', 'res');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyResources() {
  if (!fs.existsSync(resSrcRoot)) return;
  fs.cpSync(resSrcRoot, resDestRoot, { recursive: true });
  console.log('[tools-plugin] Installed notification icon resources');
}

function copyIfExists(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`[tools-plugin] Missing ${label}: ${src}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`[tools-plugin] Installed ${label}`);
  return true;
}

function patchFilePaths() {
  ensureDir(path.dirname(filePathsPath));

  const downloadToolsPath = `
    <external-path
        name="download_tools"
        path="Download/DIU Tracker Tools/" />
    <external-path
        name="download_root"
        path="Download/" />`;

  if (!fs.existsSync(filePathsPath)) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
${downloadToolsPath}
</paths>
`;
    fs.writeFileSync(filePathsPath, xml, 'utf8');
    console.log('[tools-plugin] Created file_paths.xml');
    return;
  }

  let xml = fs.readFileSync(filePathsPath, 'utf8');
  if (!xml.includes('download_tools')) {
    xml = xml.replace('</paths>', `${downloadToolsPath}\n</paths>`);
    fs.writeFileSync(filePathsPath, xml, 'utf8');
    console.log('[tools-plugin] Updated file_paths.xml');
  }
}

function patchAndroidManifest() {
  if (!fs.existsSync(manifestPath)) {
    console.warn('[tools-plugin] AndroidManifest.xml missing — cannot patch windowSoftInputMode.');
    return;
  }

  let xml = fs.readFileSync(manifestPath, 'utf8');

  // Check if adjustPan is already set
  if (xml.includes('android:windowSoftInputMode="adjustPan"')) {
    console.log('[tools-plugin] AndroidManifest.xml already configured with adjustPan.');
    return;
  }

  // If there's an existing windowSoftInputMode attribute, change it to adjustPan
  if (xml.includes('android:windowSoftInputMode=')) {
    xml = xml.replace(/android:windowSoftInputMode="[^"]*"/, 'android:windowSoftInputMode="adjustPan"');
    fs.writeFileSync(manifestPath, xml, 'utf8');
    console.log('[tools-plugin] Patched AndroidManifest.xml: updated windowSoftInputMode to adjustPan');
    return;
  }

  // If there is no windowSoftInputMode, inject it into the MainActivity tag
  if (xml.includes('android:name=".MainActivity"')) {
    xml = xml.replace(
      'android:name=".MainActivity"',
      'android:name=".MainActivity"\n            android:windowSoftInputMode="adjustPan"'
    );
    fs.writeFileSync(manifestPath, xml, 'utf8');
    console.log('[tools-plugin] Patched AndroidManifest.xml: added android:windowSoftInputMode="adjustPan"');
  } else {
    console.warn('[tools-plugin] Could not find MainActivity in AndroidManifest.xml to patch.');
  }
}

function main() {
  if (!fs.existsSync(androidRoot)) {
    console.warn('[tools-plugin] android/ folder missing — run `npx cap add android` first.');
    process.exit(0);
  }

  const okPlugin = copyIfExists(pluginSrc, pluginDest, 'ToolsFilesPlugin.java');
  const okMain = copyIfExists(mainActivitySrc, mainActivityDest, 'MainActivity.java');

  if (!okPlugin || !okMain) {
    process.exit(1);
  }

  patchFilePaths();
  patchAndroidManifest();
  copyResources();
  console.log('[tools-plugin] Native PDF tools ready.');
}

main();
