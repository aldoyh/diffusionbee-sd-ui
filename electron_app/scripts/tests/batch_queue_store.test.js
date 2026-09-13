// Run with: node electron_app/scripts/tests/batch_queue_store.test.js
//
// Standalone assertion test for the batch-queue persistence + completion
// helpers in electron_app/src/batch_queue_store.js. No test framework and no
// build step: the source is ESM with only `export function` statements and
// reads window.localStorage, so this test
//   1. shims `window.localStorage` with an in-memory store,
//   2. strips the `export ` keyword with a trivial regex (dependency-free
//      ESM -> CJS transform), then
//   3. asserts against the real exported functions.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC_PATH = path.join(__dirname, '..', '..', 'src', 'batch_queue_store.js');

// --- in-memory localStorage shim ---
const mem = new Map();
global.window = {
    localStorage: {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => mem.set(k, String(v)),
        removeItem: (k) => mem.delete(k),
    },
};

// --- load the ESM source as CJS (only `export function X` exists in the file) ---
const source = fs.readFileSync(SRC_PATH, 'utf8');
const exportedNames = (source.match(/export\s+function\s+([a-zA-Z0-9_]+)/g) || [])
    .map((m) => m.replace(/export\s+function\s+/, ''));
const cjsSource = source
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s*\{[^}]*\}/gm, '')
    + '\nmodule.exports = {' + exportedNames.join(', ') + '};\n';
const mod = { exports: {} };
new Function('module', 'exports', 'window', cjsSource)(mod, mod.exports, global.window);
const {
    loadAppletBatch,
    saveAppletBatch,
    loadHomepageBatch,
    saveHomepageBatch,
    batchItemDone,
    batchItemHasError,
} = mod.exports;

// --- 1. Round-trips through the applet key, independent of the homepage key. ---
saveAppletBatch([
    { id: 1, state: 'pending', prompt: 'castle' },
    { id: 2, state: 'done', prompt: 'old done item' },
    { id: 3, state: 'queued', prompt: 'mid-flight' },
]);
const restored = loadAppletBatch();
assert.strictEqual(restored.length, 1, 'only pending items survive a restart');
assert.strictEqual(restored[0].id, 1, 'pending item is preserved');
assert.strictEqual(restored[0].prompt, 'castle', 'pending item data survives');

// --- 2. Homepage queue is stored under its own key (no cross-talk). ---
saveHomepageBatch([{ id: 'h1', state: 'pending', prompt: 'aurora' }]);
const homepageRestored = loadHomepageBatch();
assert.strictEqual(homepageRestored.length, 1, 'homepage item restored');
assert.strictEqual(homepageRestored[0].id, 'h1', 'homepage id preserved');
assert.strictEqual(loadAppletBatch().length, 1, 'applet queue unaffected by homepage saves');

// --- 3. Malformed / non-array payloads degrade to an empty queue. ---
mem.set('batch_queue_applet_v1', 'not json {');
assert.deepStrictEqual(loadAppletBatch(), [], 'corrupt storage returns []');
mem.set('batch_queue_homepage_v1', JSON.stringify({ not: 'an array' }));
assert.deepStrictEqual(loadHomepageBatch(), [], 'object payload returns []');

// --- 4. batchItemDone: every image slot must have an output. ---
const doneGroup = {
    get_group: () => ({ imgs: [{ image_url: 'a.png' }, { image_url: 'b.png' }] }),
};
assert.strictEqual(batchItemDone(doneGroup, 'g1'), true, 'all slots filled => done');
const partialGroup = {
    get_group: () => ({ imgs: [{ image_url: 'a.png' }, { image_url: null }] }),
};
assert.strictEqual(batchItemDone(partialGroup, 'g1'), false, 'empty slot => not done');
assert.strictEqual(batchItemDone(null, 'g1'), false, 'null gallery => not done');
assert.strictEqual(batchItemDone({}, 'g1'), false, 'gallery without get_group => not done');

// --- 5. batchItemHasError: any ERROR image flags the item. ---
const errorGroup = {
    get_group: () => ({ imgs: [{ image_url: 'a.png' }, { image_url: 'ERROR' }] }),
};
assert.strictEqual(batchItemHasError(errorGroup, 'g1'), true, 'ERROR slot => has error');
assert.strictEqual(batchItemHasError(doneGroup, 'g1'), false, 'clean group => no error');

// --- 6. Items without an explicit state are treated as pending (defensive default). ---
saveAppletBatch([{ id: 9, prompt: 'no state' }]);
assert.strictEqual(loadAppletBatch().length, 1, 'missing state defaults to pending');

console.log('batch_queue_store.test.js: all assertions passed');
