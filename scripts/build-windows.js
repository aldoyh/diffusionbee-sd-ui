#!/usr/bin/env node
/**
 * Windows installer build orchestrator.
 *
 * Coordinates the full Windows build pipeline on a Windows host:
 *   1. Validate prerequisites.
 *   2. Install backend Python dependencies.
 *   3. Build backend executable with PyInstaller.
 *   4. Download Real-ESRGAN Windows release.
 *   5. Stage backend for electron-builder.
 *   6. Bundle default SD 1.5 model (ready to generate).
 *   7. Build Vue frontend and NSIS installer.
 *
 * Usage: node scripts/build-windows.js [--no-models]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backends', 'stable_diffusion');
const REALESRGAN_RELEASE_DIR = path.join(BACKEND_DIR, 'realesrgan-release');

const args = { noModels: process.argv.slice(2).includes('--no-models') };

function run(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const cwd = options.cwd || ROOT;
        console.log(`\n[build-windows] $ ${cmd} ${args.join(' ')}`);
        const proc = spawn(cmd, args, {
            cwd,
            stdio: 'inherit',
            shell: process.platform === 'win32',
            env: { ...process.env, ...(options.env || {}) },
        });
        proc.on('close', (code) => {
            if (code !== 0) return reject(new Error(`Command failed with exit code ${code}`));
            resolve();
        });
        proc.on('error', reject);
    });
}

function exists(p) {
    try { fs.accessSync(p); return true; } catch { return false; }
}

async function validatePrerequisites() {
    console.log('[build-windows] Validating prerequisites...');
    if (!exists(path.join(BACKEND_DIR, 'diffusionbee_backend.py'))) {
        throw new Error('Backend script not found');
async function buildBackend() {
    console.log('[build-windows] Building backend executable with PyInstaller...');
    await run('pyinstaller', ['diffusionbee_backend.spec'], { cwd: BACKEND_DIR });
    const exePath = path.join(BACKEND_DIR, 'dist', 'diffusionbee_backend', 'diffusionbee_backend.exe');
    if (!exists(exePath)) throw new Error('PyInstaller did not produce expected executable');
    console.log('[build-windows] Backend executable built:', exePath);
}

async function downloadRealEsrgan() {
    console.log('[build-windows] Downloading Real-ESRGAN Windows release...');
    const zipPath = path.join(BACKEND_DIR, 'realesrgan.zip');
    if (exists(REALESRGAN_RELEASE_DIR)) {
        console.log('[build-windows] Real-ESRGAN release already present, skipping download.');
        return;
    }
    if (process.platform === 'win32') {
        await run('powershell', [
            '-Command',
            `Invoke-WebRequest -Uri 'https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases/latest/download/realesrgan-ncnn-vulkan-windows.zip' -OutFile '${zipPath}'; Expand-Archive -Path '${zipPath}' -DestinationPath '${REALESRGAN_RELEASE_DIR}' -Force`,
        ]);
    } else {
        console.log('[build-windows] Non-Windows host: skipping Real-ESRGAN binary download.');
    }
}

async function stageBackend() {
    console.log('[build-windows] Staging backend for packaging...');
    const realesrganArg = exists(REALESRGAN_RELEASE_DIR) ? `--realesrgan ${REALESRGAN_RELEASE_DIR}` : '';
    await run('node', [
        'scripts/prepare_backend_for_packaging.js',
        '--source', 'backends/stable_diffusion/dist/diffusionbee_backend',
        ...realesrganArg.split(' ').filter(Boolean),
    ]);
}

async function bundleModels() {
    if (args.noModels) {
        console.log('[build-windows] Skipping model bundling (--no-models).');
        return;
    }
    console.log('[build-windows] Bundling default generation model...');
    await run('node', ['scripts/bundle_default_models.js', '--download']);
}

async function buildInstaller() {
    console.log('[build-windows] Building NSIS installer...');
    await run('npm', ['run', 'build:win']);
    const distDir = path.join(ROOT, 'electron_app', 'dist_electron');
    const installers = fs.readdirSync(distDir).filter(f => f.endsWith('.exe'));
    if (installers.length === 0) throw new Error('No .exe installer found');
    console.log('[build-windows] Installer(s) produced:');
    for (const name of installers) {
        const fullPath = path.join(distDir, name);
        const size = fs.statSync(fullPath).size;
        console.log(`  - ${name} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    }
}

async function main() {
    try {
        await validatePrerequisites();
        await installBackendDependencies();
        await buildBackend();
        await downloadRealEsrgan();
        await stageBackend();
        await bundleModels();
        await buildInstaller();
        console.log('\n[build-windows] Build completed successfully.');
    } catch (err) {
        console.error('\n[build-windows] BUILD FAILED:', err.message);
        process.exit(1);
    }
}

main();

    }
    if (!exists(path.join(BACKEND_DIR, 'diffusionbee_backend.spec'))) {
        throw new Error('PyInstaller spec not found');
    }
    if (!exists(path.join(ROOT, 'electron_app', 'build', 'Icon.ico'))) {
        throw new Error('Windows icon not found');
    }
    console.log('[build-windows] Prerequisites OK.');
}

async function installBackendDependencies() {
    console.log('[build-windows] Installing backend Python dependencies...');
    await run('python', ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: BACKEND_DIR });
    await run('python', ['-m', 'pip', 'install', 'pyinstaller']);
}
