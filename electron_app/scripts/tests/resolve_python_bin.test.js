// Standalone assertion test (no framework needed) — run with: node electron_app/scripts/tests/resolve_python_bin.test.js
const assert = require('assert');
const path = require('path');

// Mirrors the venv-candidate selection logic in bridge.js's resolvePythonBin,
// parameterized by platform so both branches can be verified without an
// actual Electron runtime (bridge.js requires('electron') at module scope,
// which throws outside Electron, so we test the algorithm directly here).
function venvCandidates(scriptDir, platform) {
    if (platform === 'win32') {
        return [
            path.join(scriptDir, 'venv311', 'Scripts', 'python.exe'),
            path.join(scriptDir, 'venv', 'Scripts', 'python.exe'),
            path.join(scriptDir, '.venv', 'Scripts', 'python.exe'),
        ];
    }
    return [
        path.join(scriptDir, 'venv311', 'bin', 'python3'),
        path.join(scriptDir, 'venv', 'bin', 'python3'),
        path.join(scriptDir, '.venv', 'bin', 'python3'),
    ];
}

function fallbackCommand(platform) {
    return platform === 'win32' ? 'python' : 'python3';
}

assert.strictEqual(
    venvCandidates('/scripts', 'win32')[0],
    path.join('/scripts', 'venv311', 'Scripts', 'python.exe')
);
assert.strictEqual(
    venvCandidates('/scripts', 'darwin')[0],
    path.join('/scripts', 'venv311', 'bin', 'python3')
);
assert.strictEqual(fallbackCommand('win32'), 'python');
assert.strictEqual(fallbackCommand('darwin'), 'python3');

console.log('resolve_python_bin.test.js: all assertions passed');
