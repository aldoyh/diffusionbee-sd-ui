/**
 * Seed bundled default models into the user's local DiffusionBee data directory.
 *
 * In packaged builds, models shipped under `resources/bundled_models/` are copied
 * to `~/.diffusionbee/downloaded_assets/` once and registered in
 * `downloaded_assets.json` so the app is ready to generate immediately after a
 * one-click Windows install.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getBundledModelsDir() {
    // In a packaged Electron app extraResources live under process.resourcesPath.
    // In Node-based development / tests, fall back to the repo-staged directory.
    if (process.resourcesPath) {
        return path.join(process.resourcesPath, 'bundled_models');
    }
    return path.resolve(__dirname, '..', '.bundled-models');
}

function loadJsonSafe(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (err) {
        console.warn('[seed-bundled] Failed to read JSON:', filePath, err.message);
    }
    return defaultValue;
}

function saveJsonPretty(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function seedBundledModels() {
    const bundledDir = getBundledModelsDir();
    if (!fs.existsSync(bundledDir)) {
        console.log('[seed-bundled] No bundled models directory:', bundledDir);
        return [];
    }

    const manifestPath = path.join(bundledDir, 'manifest.json');
    const manifest = loadJsonSafe(manifestPath, null);
    if (!manifest || !Array.isArray(manifest.models)) {
        console.warn('[seed-bundled] Missing or invalid manifest:', manifestPath);
        return [];
    }

    const homedir = os.homedir();
    const assetsDir = path.join(homedir, '.diffusionbee', 'downloaded_assets');
    const registryPath = path.join(homedir, '.diffusionbee', 'downloaded_assets.json');

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    const registry = loadJsonSafe(registryPath, {});
    const seeded = [];

    for (const model of manifest.models) {
        const bundledPath = path.join(bundledDir, model.staged_filename);
        if (!fs.existsSync(bundledPath)) {
            console.warn('[seed-bundled] Bundled file missing:', bundledPath);
            continue;
        }

        const destPath = path.join(assetsDir, model.staged_filename);
        const alreadyTracked = registry[model.id] && registry[model.id].asset_path === destPath && fs.existsSync(destPath);

        if (!alreadyTracked) {
            console.log('[seed-bundled] Copying bundled model:', model.id, '->', destPath);
            fs.copyFileSync(bundledPath, destPath);
        } else {
            console.log('[seed-bundled] Model already seeded:', model.id);
        }

        registry[model.id] = {
            id: model.id,
            filename: model.filename,
            asset_path: destPath,
            asset_path_raw: destPath,
            status: 'done',
            md5: model.md5,
            title: model.title,
            description: model.description,
            model_meta_data: model.model_meta_data,
            is_bundled: true,
        };

        seeded.push(model.id);
    }

    if (seeded.length > 0) {
        saveJsonPretty(registryPath, registry);
        console.log('[seed-bundled] Registered models:', seeded.join(', '));
    }

    return seeded;
}

module.exports = { seedBundledModels };
