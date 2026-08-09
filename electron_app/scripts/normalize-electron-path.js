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
  let trimmedPath = rawPath.trim();

  if (!trimmedPath) {
    throw new Error(`[normalize-electron-path] ${pathFile} is empty`);
  }

  // pnpm occasionally writes a spurious 'dist/' prefix into path.txt. The
  // prefix must NOT be there: electron's own index.js joins __dirname/dist with
  // this value, and so do we below — a prefixed value produces a broken
  // .../dist/dist/Electron.app/... lookup. (Same class of dirt as the trailing
  // whitespace handled below.)
  if (trimmedPath.startsWith('dist/')) {
    trimmedPath = trimmedPath.slice('dist/'.length);
    if (!trimmedPath) {
      throw new Error(`[normalize-electron-path] ${pathFile} contains only a 'dist/' prefix`);
    }
    fs.writeFileSync(pathFile, trimmedPath, 'utf8');
    console.log(`[normalize-electron-path] Removed spurious 'dist/' prefix in ${pathFile}`);
  } else if (rawPath !== trimmedPath) {
    fs.writeFileSync(pathFile, trimmedPath, 'utf8');
    console.log(`[normalize-electron-path] Trimmed trailing whitespace in ${pathFile}`);
  }

  const electronBinary = path.join(electronDir, 'dist', trimmedPath);
  if (!fs.existsSync(electronBinary)) {
    throw new Error(`[normalize-electron-path] Electron binary not found at ${electronBinary}`);
  }
}

main();
