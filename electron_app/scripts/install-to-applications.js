#!/usr/bin/env node

/**
 * install-to-applications.js
 *
 * After `vue-cli-service electron:build --mac dir` produces a .app bundle
 * inside dist_electron/, this script locates it and copies (or replaces) it
 * into the system /Applications/ folder so the app can be launched like a
 * normal installed macOS application.
 *
 * Usage (called automatically by npm run electron:build:install):
 *   node ./scripts/install-to-applications.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_ELECTRON = path.join(__dirname, '..', 'dist_electron');

function findAppBundle() {
  if (!fs.existsSync(DIST_ELECTRON)) {
    return null;
  }
  const entries = fs.readdirSync(DIST_ELECTRON, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subDir = path.join(DIST_ELECTRON, entry.name);
      const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.name.endsWith('.app') && sub.isDirectory()) {
          return path.join(subDir, sub.name);
        }
      }
    }
  }
  return null;
}

function main() {
  const appBundle = findAppBundle();
  if (!appBundle) {    console.error(
      '❌ Could not find a .app bundle in dist_electron/.\n' +
      '   The build step may have failed. Check the output above for errors.'
    );
    process.exit(1);
  }

  const appName = path.basename(appBundle);
  const destination = path.join('/Applications', appName);

  console.log(`📦 Found app bundle: ${appBundle}`);
  console.log(`📍 Installing to: ${destination}`);

  // Remove previous installation if it exists
  if (fs.existsSync(destination)) {
    console.log('🗑️  Removing previous installation...');
    execSync(`rm -rf "${destination}"`, { stdio: 'inherit' });
  }

  // Copy the .app bundle to /Applications
  console.log('📋 Copying app bundle (this may take a moment)...');
  execSync(`cp -R "${appBundle}" "${destination}"`, { stdio: 'inherit' });

  // Verify the copy succeeded
  if (fs.existsSync(destination)) {
    const entitlements = path.join(__dirname, '..', 'build', 'entitlements.mac.plist');
    if (fs.existsSync(entitlements)) {
      console.log('🔏 Applying launch entitlements (ad-hoc sign)...');
      try {
        execSync(
          `codesign --force --deep --sign - --entitlements "${entitlements}" "${destination}"`,
          { stdio: 'inherit' }
        );
        execSync(`xattr -cr "${destination}"`, { stdio: 'inherit' });
      } catch (err) {
        console.warn('⚠️  Ad-hoc codesign failed; app may not launch until re-signed:', err.message);
      }
    }
    console.log(`✅ Successfully installed ${appName} to /Applications`);
    console.log(`   You can now open "${appName}" from your Applications folder or Spotlight.`);
  } else {
    console.error('❌ Failed to copy app bundle to /Applications.');
    process.exit(1);
  }
}

main();
