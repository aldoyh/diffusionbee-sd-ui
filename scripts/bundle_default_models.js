#!/usr/bin/env node
/**
 * Stage default DiffusionBee models for bundling inside the Windows NSIS installer.
 *
 * Produces electron_app/.bundled-models/ with model files + manifest.json.
 * Usage: node scripts/bundle_default_models.js [--download]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const STAGE_DIR = path.join(ROOT, 'electron_app', '.bundled-models');
const HOME_ASSETS_DIR = path.join(os.homedir(), '.diffusionbee', 'downloaded_assets');

const DEFAULT_MODELS = [
    {
        id: 'Default_SD1.5',
        filename: 'sd-v1-5_fp16.tdict',
        md5: 'a36c79b8edb4b21b75e50d5834d1f4ae',
        url: 'https://huggingface.co/divamgupta/stable_diffusion_mps/resolve/main/sd-v1-5_fp16.tdict',
        title: 'Stable Diffusion 1.5 (Default)',
        description: 'Stable Diffusion 1.5 base model, ready to generate out of the box.',
        model_meta_data: { type: 'sd_model', float_type: 'float16', sd_type: 'SD_1x' },
    },
];

const args = { download: process.argv.slice(2).includes('--download') };

function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }
function formatBytes(b) {
    if (b === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
function md5File(p) {
    const hash = crypto.createHash('md5');
    const fd = fs.openSync(p, 'r');
    try {
        const buf = Buffer.alloc(1024 * 1024);
        let n;
        while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) hash.update(buf.slice(0, n));
        return hash.digest('hex');
    } finally { fs.closeSync(fd); }
}

function copyWithProgress(src, dest) {
    const total = fs.statSync(src).size;
    const start = Date.now();
    fs.copyFileSync(src, dest);
    console.log(`  copied ${formatBytes(total)} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}
function downloadFile(url, dest, expectedMd5) {
    return new Promise((resolve, reject) => {
        const tmp = dest + '.partial';
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        const file = fs.createWriteStream(tmp);
        const request = https.get(url, { redirect: 'follow' }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close(); fs.unlinkSync(tmp);
                return downloadFile(res.headers.location, dest, expectedMd5).then(resolve).catch(reject);
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                file.close(); fs.unlinkSync(tmp);
                return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
            }
            const total = parseInt(res.headers['content-length'], 10) || 0;
            let downloaded = 0, lastLogged = 0;
            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (total && Date.now() - lastLogged > 2000) {
                    console.log(`  ${Math.round((downloaded / total) * 100)}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
                    lastLogged = Date.now();
                }
            });
            res.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    fs.renameSync(tmp, dest);
                    console.log(`  downloaded ${formatBytes(downloaded)}`);
                    if (expectedMd5) {
                        const actual = md5File(dest);
                        if (actual !== expectedMd5) { fs.unlinkSync(dest); return reject(new Error(`MD5 mismatch`)); }
                        console.log(`  MD5 OK: ${actual}`);
                    }
                    resolve();
                });
            });
        });
        request.on('error', (err) => { try { fs.unlinkSync(tmp); } catch {} reject(err); });
    });
}

async function stageModel(model) {
    const stagedName = `${model.id}_${model.filename}`;
    const stagedPath = path.join(STAGE_DIR, stagedName);
    if (fs.existsSync(stagedPath)) {
        console.log(`[bundle] ${model.id} already staged (${formatBytes(fs.statSync(stagedPath).size)})`);
        return { ...model, staged_filename: stagedName, staged_size: fs.statSync(stagedPath).size };
    }
    const localPath = path.join(HOME_ASSETS_DIR, stagedName);
    if (fs.existsSync(localPath)) {
        console.log(`[bundle] Copying ${model.id} from ${localPath}`);
        copyWithProgress(localPath, stagedPath);
        return { ...model, staged_filename: stagedName, staged_size: fs.statSync(stagedPath).size };
    }
    if (!args.download) {
        throw new Error(`${model.id} not found locally. Run with --download or place it in ${HOME_ASSETS_DIR}`);
    }
    console.log(`[bundle] Downloading ${model.id}`);
    await downloadFile(model.url, stagedPath, model.md5);
    return { ...model, staged_filename: stagedName, staged_size: fs.statSync(stagedPath).size };
}

async function main() {
    console.log('[bundle] Staging bundled default models...');
    mkdirp(STAGE_DIR);
    const manifest = { bundled_at: new Date().toISOString(), models: [] };
    for (const model of DEFAULT_MODELS) {
        const staged = await stageModel(model);
        manifest.models.push({
            id: staged.id,
            filename: staged.filename,
            staged_filename: staged.staged_filename,
            staged_size: staged.staged_size,
            md5: staged.md5,
            title: staged.title,
            description: staged.description,
            model_meta_data: staged.model_meta_data,
        });
    }
    fs.writeFileSync(path.join(STAGE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    const total = manifest.models.reduce((s, m) => s + (m.staged_size || 0), 0);
    console.log(`[bundle] Done: ${manifest.models.length} model(s), ${formatBytes(total)}`);
}
main().catch((err) => { console.error('[bundle] ERROR:', err.message); process.exit(1); });
