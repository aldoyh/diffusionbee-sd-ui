// Run with: node electron_app/scripts/tests/realesrgan_paths.test.js
const assert = require('assert');
const path = require('path');
const os = require('os');

function realesrganBinName(platform) {
    return platform === 'win32' ? 'realesrgan_ncnn_windows.exe' : 'realesrgan_ncnn_macos';
}

function weightsPathFor(bin_path) {
    return path.join(path.dirname(bin_path), 'models');
}

function outPathFor(tmpdir) {
    return path.join(tmpdir, Math.random() + '.png');
}

assert.strictEqual(realesrganBinName('win32'), 'realesrgan_ncnn_windows.exe');
assert.strictEqual(realesrganBinName('darwin'), 'realesrgan_ncnn_macos');
assert.strictEqual(
    weightsPathFor(path.join('C:', 'app', 'core', 'realesrgan_ncnn_windows.exe')),
    path.join('C:', 'app', 'core', 'models')
);
assert.ok(outPathFor(os.tmpdir()).startsWith(os.tmpdir()));

console.log('realesrgan_paths.test.js: all assertions passed');
