#!/usr/bin/env node
// Cross-platform equivalent of prepare_backend_for_packaging.sh, for Windows CI.
// Usage: node scripts/prepare_backend_for_packaging.js --source <pyinstaller-dist-dir> [--realesrgan <realesrgan-release-dir>]

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--source') args.source = argv[++i];
        if (argv[i] === '--realesrgan') args.realesrgan = argv[++i];
    }
    return args;
}

function copyRecursiveExcluding(src, dest, excludeNames) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (excludeNames.has(entry.name)) continue;
        if (entry.name.endsWith('.pyc')) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursiveExcluding(srcPath, destPath, excludeNames);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.source) {
        console.error('[prepare-backend] ERROR: --source <pyinstaller-dist-dir> is required');
        process.exit(1);
    }

    const root = path.resolve(__dirname, '..');
    const stage = path.join(root, 'electron_app', '.packaged-backend');

    if (!fs.existsSync(args.source)) {
        console.error(`[prepare-backend] ERROR: source dir not found: ${args.source}`);
        process.exit(1);
    }

    fs.rmSync(stage, { recursive: true, force: true });
    fs.mkdirSync(stage, { recursive: true });

    const excludeNames = new Set(['venv', 'venv311', '.venv', '__pycache__', '.DS_Store', '.git']);
    copyRecursiveExcluding(args.source, stage, excludeNames);

    if (args.realesrgan) {
        if (!fs.existsSync(args.realesrgan)) {
            console.error(`[prepare-backend] WARNING: realesrgan dir not found: ${args.realesrgan} — upscaling will not work`);
        } else {
            for (const entry of fs.readdirSync(args.realesrgan, { withFileTypes: true })) {
                const srcPath = path.join(args.realesrgan, entry.name);
                let destName = entry.name;
                // The upstream release ships an exe named realesrgan-ncnn-vulkan.exe (or similar);
                // rename to the exact name native_functions.js's run_realesrgan() looks for.
                if (entry.name.toLowerCase().endsWith('.exe')) {
                    destName = 'realesrgan_ncnn_windows.exe';
                }
                const destPath = path.join(stage, destName);
                if (entry.isDirectory()) {
                    copyRecursiveExcluding(srcPath, destPath, excludeNames);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }

    const hasExe = fs.existsSync(path.join(stage, 'diffusionbee_backend.exe'));
    const hasScript = fs.existsSync(path.join(stage, 'stable_diffusion', 'diffusionbee_backend.py'));
    if (!hasExe && !hasScript) {
        console.error('[prepare-backend] ERROR: No runnable backend in staged core');
        process.exit(1);
    }

    console.log(`[prepare-backend] Staged backend at ${stage}`);
}

main();
