// Run with: node electron_app/scripts/tests/convert_model_spawn.test.js
const assert = require('assert');
const path = require('path');

function pythonCommand(platform) {
    return platform === 'win32' ? 'python' : 'python3';
}

function backendBinName(platform) {
    return platform === 'win32' ? 'diffusionbee_backend.exe' : 'diffusionbee_backend';
}

assert.strictEqual(pythonCommand('win32'), 'python');
assert.strictEqual(pythonCommand('darwin'), 'python3');
assert.strictEqual(
    path.join('core', backendBinName('win32')),
    path.join('core', 'diffusionbee_backend.exe')
);

console.log('convert_model_spawn.test.js: all assertions passed');
