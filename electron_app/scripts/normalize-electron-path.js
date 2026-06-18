const fs = require('fs');
const path = require('path');

function main() {
  const electronPackageJsonPath = require.resolve('electron/package.json');
  const electronDir = path.dirname(electronPackageJsonPath);
  const pathFile = path.join(electronDir, 'path.txt');

  if (!fs.existsSync(pathFile)) {
    console.warn(`[normalize-electron-path] Missing ${pathFile}`);
    return;
  }

  const rawPath = fs.readFileSync(pathFile, 'utf8');
  const trimmedPath = rawPath.trim();

  if (!trimmedPath) {
    throw new Error(`[normalize-electron-path] ${pathFile} is empty`);
  }

  if (rawPath !== trimmedPath) {
    fs.writeFileSync(pathFile, trimmedPath, 'utf8');
    console.log(`[normalize-electron-path] Trimmed trailing whitespace in ${pathFile}`);
  }

  const electronBinary = path.join(electronDir, 'dist', trimmedPath);
  if (!fs.existsSync(electronBinary)) {
    throw new Error(`[normalize-electron-path] Electron binary not found at ${electronBinary}`);
  }
}

main();
