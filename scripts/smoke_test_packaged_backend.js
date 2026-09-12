#!/usr/bin/env node
/**
 * Smoke-test the packaged PyInstaller backend binary.
 *
 * Spawns `diffusionbee_backend` from `.packaged-backend/`, reads its stdout
 * for up to 60 s, and verifies it emits at least one `sdbk` line (the
 * stable-diffusion state heartbeat the Electron bridge expects on startup).
 *
 * Exit 0 = pass, exit 1 = fail.
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TIMEOUT_MS = 60_000;

// Resolve the packaged binary
const projectRoot = path.resolve(__dirname, '..');
const candidates = [
    path.join(projectRoot, 'electron_app', '.packaged-backend', 'diffusionbee_backend'),
    path.join(projectRoot, 'electron_app', '.packaged-backend', 'diffusionbee_backend.exe'),
];

const backendPath = candidates.find(p => fs.existsSync(p));
if (!backendPath) {
    console.error('[smoke-test] Packaged backend not found. Looked in:');
    candidates.forEach(c => console.error('  ', c));
    process.exit(1);
}

console.log(`[smoke-test] Spawning: ${backendPath}`);
console.log(`[smoke-test] Timeout: ${TIMEOUT_MS / 1000}s`);

const child = spawn(backendPath, [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
});

let stdoutBuf = '';
let stderrBuf = '';
let gotSdbk = false;
let gotPy2b = false;
const lines = [];

const timer = setTimeout(() => {
    child.kill();
    report(false, 'Timeout — no sdbk line received within 60s');
}, TIMEOUT_MS);

function report(pass, detail) {
    clearTimeout(timer);
    console.log('');
    console.log('='.repeat(60));
    console.log(pass ? '✅  PASS' : '❌  FAIL');
    if (detail) console.log(detail);
    console.log('='.repeat(60));

    if (lines.length) {
        console.log('\nReceived lines:');
        lines.forEach(l => console.log('  >', l));
    }
    if (stderrBuf.trim()) {
        console.log('\nStderr (last 500 chars):');
        console.log('  ', stderrBuf.trim().slice(-500));
    }
    process.exit(pass ? 0 : 1);
}

child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk.toString('utf8');

    // Process complete lines
    let nlIdx;
    while ((nlIdx = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nlIdx).trim();
        stdoutBuf = stdoutBuf.slice(nlIdx + 1);
        if (line.length === 0) continue;

        lines.push(line);
        console.log(`[py stdout] ${line}`);

        // Check for py2b prefix (renderer-bound messages)
        // The bridge adds 'py2b ' prefix before forwarding to renderer,
        // but the raw stdout sends bare 'sdbk ' lines.
        if (line.startsWith('sdbk ')) {
            gotSdbk = true;
            const payload = line.slice(5);
            console.log(`[smoke-test] Got sdbk state update: ${payload}`);
            // 'sdbk inrd' = backend is ready — that's our success signal
            if (payload.trim() === 'inrd') {
                report(true, `Backend responded with sdbk inrd (ready).`);
                return;
            }
        }
        // Also match if bridge-prepended 'py2b sdbk ...' comes through
        if (line.startsWith('py2b sdbk ')) {
            gotSdbk = true;
            const payload = line.slice(10);
            console.log(`[smoke-test] Got py2b sdbk state update: ${payload}`);
            if (payload.trim() === 'inrd') {
                report(true, `Backend responded with py2b sdbk inrd (ready).`);
                return;
            }
        }
    }
});

child.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    stderrBuf += text;
    // Don't spam stderr to console; buffer it for the report
});

child.on('error', (err) => {
    report(false, `Failed to spawn backend: ${err.message}`);
});

child.on('close', (code) => {
    // If we haven't reported yet
    clearTimeout(timer);
    if (!gotSdbk) {
        report(
            false,
            `Backend exited with code ${code} without sending sdbk. ` +
            `Got ${lines.length} line(s) of output.`
        );
    }
});
