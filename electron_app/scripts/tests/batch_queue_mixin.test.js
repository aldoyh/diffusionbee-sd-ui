// Run with: node electron_app/scripts/tests/batch_queue_mixin.test.js
//
// Standalone assertion test for the shared batch-queue state machine in
// electron_app/src/batch_queue_mixin.js. No test framework and no build
// step: both the mixin and batch_queue_store.js are ESM, so this test
//   1. shims `window.localStorage` with an in-memory store,
//   2. strips `export ` / `import` with a trivial regex (the same
//      dependency-free ESM -> CJS transform the store test uses), then
//   3. drives the mixin through the exact transitions the batch UI relies
//      on: pending -> queued -> running -> done | error, including the
//      pruned-group history fallback and the no-double-submit guarantee.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', '..', 'src', 'batch_queue_store.js');
const MIXIN_PATH = path.join(__dirname, '..', '..', 'src', 'batch_queue_mixin.js');

// --- in-memory localStorage shim ---
const mem = new Map();
global.window = {
    localStorage: {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => mem.set(k, String(v)),
        removeItem: (k) => mem.delete(k),
    },
};

// --- load the store ESM source as CJS (mirrors batch_queue_store.test.js) ---
const storeSource = fs.readFileSync(STORE_PATH, 'utf8');
const exportedNames = (storeSource.match(/export\s+function\s+([a-zA-Z0-9_]+)/g) || [])
    .map((m) => m.replace(/export\s+function\s+/, ''));
const storeCjs = storeSource
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s*\{[^}]*\}/gm, '')
    + '\nmodule.exports = {' + exportedNames.join(', ') + '};\n';
const storeMod = { exports: {} };
new Function('module', 'exports', 'window', storeCjs)(storeMod, storeMod.exports, global.window);

// --- load the mixin ESM source as CJS ---
const mixinSource = fs.readFileSync(MIXIN_PATH, 'utf8');
const mixinCjs = mixinSource
    .replace(/^import\s*\{([^}]*)\}\s*from\s*"[^"]*"\s*$/m, 'const {$1} = storeExports;')
    .replace(/export\s+default/, 'module.exports =');
const mixinMod = { exports: {} };
new Function('module', 'exports', 'window', 'storeExports', mixinCjs)(mixinMod, mixinMod.exports, global.window, storeMod.exports);
const mixin = mixinMod.exports;

assert.ok(mixin && mixin.methods && mixin.methods.runBatch, 'mixin loads with runBatch');

// --- helper: build a component-like `this` from the mixin ---
function makeCtx(overrides = {}) {
    const ctx = Object.assign({}, mixin.data());
    // Bind the mixin's methods/computed FIRST, then apply the surface
    // overrides so the per-test hooks (submitBatchItem, getBatchGallery,
    // persistBatchQueue) win over the mixin's default stubs.
    for (const [k, fn] of Object.entries(mixin.methods)) ctx[k] = fn.bind(ctx);
    for (const [k, fn] of Object.entries(mixin.computed)) ctx[k] = fn.bind(ctx);
    Object.assign(ctx, overrides);
    // Never let the polling timer keep the Node process alive during tests.
    ctx.startBatchPolling = () => { ctx.batch_poll_timer = 12345; };
    ctx.stopBatchPolling = () => { ctx.batch_poll_timer = null; };
    return ctx;
}

const toasts = [];
function fakeApp(overrides = {}) {
    return Object.assign({
        app_state: { isArabic: false },
        show_toast: (msg) => toasts.push(msg),
        stable_diffusion_manager: { queue: { current_group: null, groups_todo: [] } },
    }, overrides);
}

// --- 1. runBatch submits each pending item once, state set BEFORE submit ---
{
    const submitted = [];
    const ctx = makeCtx({
        app: fakeApp(),
        submitBatchItem(item, groupId) { submitted.push({ itemId: item.id, groupId }); },
        getBatchGallery: () => ({ get_group: () => null }),
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [
        { id: 'a', state: 'pending', gen_options: { seed: 1 } },
        { id: 'b', state: 'pending', gen_options: { seed: 2 } },
    ];
    ctx.runBatch();
    assert.strictEqual(submitted.length, 2, 'both pending items submitted');
    assert.ok(ctx.batch_queue.every((it) => it.state === 'queued'), 'state set to queued');
    assert.ok(ctx.batch_queue.every((it) => !!it.group_id), 'each item got a group_id');
    assert.strictEqual(new Set(ctx.batch_queue.map((it) => it.group_id)).size, 2, 'distinct group_ids');
    // A second runBatch must not re-submit (single-submit guarantee).
    ctx.runBatch();
    assert.strictEqual(submitted.length, 2, 'no double submit on second run');
    console.log('PASS 1: runBatch single-submit + state-before-submit');
}

// --- 2. submit failure -> error ---
{
    const ctx = makeCtx({
        app: fakeApp(),
        submitBatchItem() { throw new Error('boom'); },
        getBatchGallery: () => ({ get_group: () => null }),
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'x', state: 'pending', gen_options: {} }];
    ctx.runBatch();
    assert.strictEqual(ctx.batch_queue[0].state, 'error', 'failed submit -> error');
    console.log('PASS 2: submit failure -> error');
}

// --- 3. gallery guard aborts cleanly ---
{
    const before = toasts.length;
    const ctx = makeCtx({
        app: fakeApp(),
        submitBatchItem() { throw new Error('must not be called'); },
        getBatchGallery: () => null,
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'y', state: 'pending', gen_options: {} }];
    ctx.runBatch();
    assert.strictEqual(ctx.batch_queue[0].state, 'pending', 'item untouched when gallery missing');
    assert.strictEqual(toasts.length, before + 1, 'abort toast shown');
    console.log('PASS 3: gallery guard aborts cleanly');
}

// --- 4. queued -> running -> done via gallery images ---
{
    let imgs = [{ image_url: null }];
    const ctx = makeCtx({
        app: fakeApp({ stable_diffusion_manager: { queue: { current_group: { group_id: 'g1' }, groups_todo: [] } } }),
        getBatchGallery: () => ({ get_group: (id) => (id === 'g1' ? { imgs } : null) }),
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'a', state: 'queued', group_id: 'g1' }];
    ctx.tickBatchQueue();
    assert.strictEqual(ctx.batch_queue[0].state, 'running', 'current group -> running');
    imgs = [{ image_url: '/tmp/out.png' }];
    ctx.tickBatchQueue();
    assert.strictEqual(ctx.batch_queue[0].state, 'done', 'all slots filled -> done');
    assert.strictEqual(ctx.batch_poll_timer, null, 'polling stops when nothing active');
    console.log('PASS 4: queued -> running -> done');
}

// --- 5. group image error -> error ---
{
    const ctx = makeCtx({
        app: fakeApp(),
        getBatchGallery: () => ({ get_group: () => ({ imgs: [{ image_url: 'ERROR' }] }) }),
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'a', state: 'running', group_id: 'g1' }];
    ctx.tickBatchQueue();
    assert.strictEqual(ctx.batch_queue[0].state, 'error', 'ERROR image -> error');
    console.log('PASS 5: backend error signal -> error');
}

// --- 6. pruned group + present in history -> done (not a false error) ---
{
    const ctx = makeCtx({
        app: fakeApp({
            app_state: { isArabic: false, app_data: { history: { g9: { group_id: 'g9', prompt: 'x' } } } },
        }),
        getBatchGallery: () => ({ get_group: () => null }), // pruned by gallery
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'a', state: 'queued', group_id: 'g9' }];
    ctx.tickBatchQueue();
    assert.strictEqual(ctx.batch_queue[0].state, 'done', 'pruned but in history -> done');
    console.log('PASS 6: pruned group + history -> done');
}

// --- 7. pruned group + NOT in history -> error (the P2 false-"done" fix) ---
{
    const ctx = makeCtx({
        app: fakeApp({ app_state: { isArabic: false, app_data: { history: {} } } }),
        getBatchGallery: () => ({ get_group: () => null }),
        persistBatchQueue: () => {},
    });
    ctx.batch_queue = [{ id: 'a', state: 'queued', group_id: 'g-ghost' }];
    ctx.tickBatchQueue();
    assert.strictEqual(ctx.batch_queue[0].state, 'error', 'absence alone is NOT done -> error');
    console.log('PASS 7: pruned group without history -> error (no false done)');
}

// --- 8. persist watcher fires with the queue ---
{
    let saved = null;
    const ctx = makeCtx({ persistBatchQueue: (q) => { saved = q; } });
    ctx.batch_queue = [{ id: 'a', state: 'pending' }];
    mixin.watch.batch_queue.handler.call(ctx);
    assert.ok(saved && saved[0].id === 'a', 'deep watcher persists queue');
    console.log('PASS 8: persist watcher');
}

// --- 9. computed labels ---
{
    const ctx = makeCtx({ app: fakeApp() });
    ctx.batch_queue = [
        { id: 'a', state: 'pending' },
        { id: 'b', state: 'queued' },
        { id: 'c', state: 'running' },
        { id: 'd', state: 'done' },
    ];
    assert.strictEqual(ctx.batchPendingCount(), 1, 'only pending counted');
    assert.strictEqual(ctx.batchHasActive(), true, 'queued/running are active');
    assert.strictEqual(ctx.stateLabel('done'), '✓ Done');
    assert.strictEqual(ctx.batchCountLabel(1), '1 request');
    assert.strictEqual(ctx.batchCountLabel(3), '3 requests');
    console.log('PASS 9: computed labels');
}

console.log('batch_queue_mixin.test.js: all assertions passed');
