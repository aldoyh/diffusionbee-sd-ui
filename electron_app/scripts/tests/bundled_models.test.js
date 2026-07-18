// Run with: node electron_app/scripts/tests/bundled_models.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const bundledDir = path.join(__dirname, '..', '..', '.bundled-models');
const manifestPath = path.join(bundledDir, 'manifest.json');

assert.ok(fs.existsSync(manifestPath), `Manifest must exist at ${manifestPath}`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest.models), 'Manifest must contain a models array');
assert.ok(manifest.models.length > 0, 'Manifest must contain at least one bundled model');

for (const model of manifest.models) {
    assert.ok(model.id, 'Each model must have an id');
    assert.ok(model.staged_filename, 'Each model must have a staged_filename');
    const modelPath = path.join(bundledDir, model.staged_filename);
    assert.ok(fs.existsSync(modelPath), `Bundled model file must exist: ${modelPath}`);
    assert.ok(fs.statSync(modelPath).size > 0, `Bundled model file must not be empty: ${modelPath}`);
}

console.log('bundled_models.test.js: all assertions passed');
