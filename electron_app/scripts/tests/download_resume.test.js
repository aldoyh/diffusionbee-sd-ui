// Standalone assertion test (no test framework) for the Range-resume download
// handler in electron_app/src/native_functions.js.
//
// The handler region is extracted from the REAL source at test time and driven
// with a mocked ipcMain against a local Range-capable HTTP server, so this
// exercises the production code (not a copy). Run with:
//   node electron_app/scripts/tests/download_resume.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', '..', 'src', 'native_functions.js');

// ── Load the production handler region (resolve_hf_token → end of download-file) ──
const handlers = {};
const mockIpcMain = { on: (ch, fn) => { handlers[ch] = fn; } };
const src = fs.readFileSync(SRC, 'utf8');
const start = src.indexOf('function resolve_hf_token()');
const end = src.indexOf('console.log("native functions imported")');
assert(start > 0 && end > start, 'region extraction failed');
const loader = new Function('ipcMain', 'require', src.slice(start, end));
loader(mockIpcMain, require);
assert(typeof handlers['download-file'] === 'function', 'download-file handler not registered');
assert(typeof handlers['download-cancel'] === 'function', 'download-cancel handler not registered');

// ── Local HTTP server with Range support ──
function makeServer(content, opts = {}) {
  const etag = '"' + crypto.createHash('sha256').update(content).digest('hex') + '"';
  const chunkDelayMs = opts.chunkDelayMs || 0;
  const server = http.createServer((req, res) => {
    const range = req.headers.range;
    if (range && !opts.ignoreRange) {
      const m = /bytes=(\d+)-/.exec(range);
      const start = m ? parseInt(m[1], 10) : 0;
      if (start >= content.length) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + content.length });
        res.end();
        return;
      }
      const slice = content.slice(start);
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${content.length - 1}/${content.length}`,
        'Content-Length': slice.length,
        'Etag': etag,
      });
      if (chunkDelayMs > 0) {
        let i = 0;
        const step = 65536;
        const tick = () => {
          if (i >= slice.length) { res.end(); return; }
          res.write(slice.slice(i, i + step));
          i += step;
          setTimeout(tick, chunkDelayMs);
        };
        tick();
      } else {
        res.end(slice);
      }
    } else {
      res.writeHead(200, { 'Content-Length': content.length, 'Etag': etag });
      if (chunkDelayMs > 0) {
        // Server.close() only stops NEW connections — tests that need a
        // mid-transfer drop use closeAllConnections() on this branch too.
        let i = 0;
        const step = 65536;
        const tick = () => {
          if (i >= content.length) { res.end(); return; }
          res.write(content.slice(i, i + step));
          i += step;
          setTimeout(tick, chunkDelayMs);
        };
        tick();
      } else {
        res.end(content);
      }
    }
  });
  return server;
}

function runDownload(url, dest, opts) {
  return new Promise((resolve) => {
    const downloadId = 'dl-' + Math.random().toString(36).slice(2);
    const bindings = {};
    const result = { progress: [] };
    bindings[downloadId] = {
      progress: (m) => result.progress.push(m),
      success: (m) => { result.success = m; resolve(result); },
      error: (m) => { result.error = m; resolve(result); },
      cancelled: (m) => { result.cancelled = m; resolve(result); },
    };
    const evt = {
      sender: {
        send: (ch, data) => {
          if (ch !== 'to_download') return;
          const cb = bindings[data.download_id] && bindings[data.download_id][data.fn];
          if (cb) cb(data.msg);
        },
      },
    };
    handlers['download-file'](evt, url, dest, downloadId, opts || {});
  });
}

async function listen(server) {
  await new Promise((r) => server.listen(0, r));
  return `http://127.0.0.1:${server.address().port}/file`;
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbee-dl-'));
  const content = crypto.randomBytes(1_000_000); // 1 MB
  const md5 = crypto.createHash('md5').update(content).digest('hex');
  const half = content.length / 2;

  // 1) Fresh download: 200 → partial → rename, md5 verified
  {
    const s = makeServer(content);
    const url = await listen(s);
    const dest = path.join(dir, 'model_a.tdict');
    const r = await runDownload(url, dest, { expected_md5: md5 });
    assert.strictEqual(r.error, undefined, 'fresh error: ' + JSON.stringify(r.error));
    assert.ok(fs.existsSync(dest), 'fresh: final file missing');
    assert.ok(!fs.existsSync(dest + '.partial'), 'fresh: partial should be removed');
    assert.strictEqual(fs.statSync(dest).size, content.length, 'fresh: size');
    assert.strictEqual(r.success.hash, md5, 'fresh: md5 mismatch');
    assert.strictEqual(r.success.resumed, false, 'fresh: resumed=false');
    assert.ok(r.progress[0] >= 0 && r.progress[0] < 10, 'fresh: progress starts low, got ' + r.progress[0]);
    assert.strictEqual(r.progress[r.progress.length - 1], 100, 'fresh: progress ends at 100');
    s.close();
    console.log('PASS 1/7 fresh download + md5');
  }

  // 2) Resume: half-written partial → 206 append → full re-read md5
  {
    const s = makeServer(content);
    const url = await listen(s);
    const dest = path.join(dir, 'model_b.tdict');
    fs.writeFileSync(dest + '.partial', content.slice(0, half));
    const r = await runDownload(url, dest, { expected_md5: md5 });
    assert.strictEqual(r.error, undefined, 'resume error: ' + JSON.stringify(r.error));
    assert.strictEqual(fs.statSync(dest).size, content.length, 'resume: final size');
    assert.strictEqual(r.success.resumed, true, 'resume: resumed=true');
    assert.strictEqual(r.success.hash, md5, 'resume: full-file md5 must match');
    assert.ok(r.progress[0] >= 50, 'resume: progress must reflect the existing partial base, got ' + r.progress[0]);
    assert.ok(!fs.existsSync(dest + '.partial'), 'resume: partial gone after finalize');
    s.close();
    console.log('PASS 2/7 resume from partial (206 + full-file re-verify)');
  }

  // 3) Etag mismatch → partial discarded, fresh download
  {
    const s = makeServer(content);
    const url = await listen(s);
    const dest = path.join(dir, 'model_c.tdict');
    fs.writeFileSync(dest + '.partial', content.slice(0, half));
    fs.writeFileSync(dest + '.partial.json', JSON.stringify({ etag: 'wrong-etag' }));
    const r = await runDownload(url, dest, { expected_md5: md5 });
    assert.strictEqual(r.error, undefined, 'etag error: ' + JSON.stringify(r.error));
    assert.strictEqual(r.success.resumed, false, 'etag mismatch: must restart fresh');
    assert.strictEqual(fs.statSync(dest).size, content.length, 'etag: final size');
    assert.strictEqual(r.success.hash, md5, 'etag: md5 verified');
    s.close();
    console.log('PASS 3/7 etag mismatch → restart from zero');
  }

  // 4) 416 Range Not Satisfiable → partial already complete, verified + renamed
  {
    const s = makeServer(content);
    const url = await listen(s);
    const dest = path.join(dir, 'model_d.tdict');
    fs.writeFileSync(dest + '.partial', content);
    const r = await runDownload(url, dest, { expected_md5: md5 });
    assert.strictEqual(r.error, undefined, '416 error: ' + JSON.stringify(r.error));
    assert.strictEqual(r.success.resumed, true, '416: resumed=true');
    assert.strictEqual(r.success.hash, md5, '416: hash verified');
    assert.ok(fs.existsSync(dest), '416: renamed to final');
    assert.ok(!fs.existsSync(dest + '.partial'), '416: partial gone');
    s.close();
    console.log('PASS 4/7 416 → completed from existing partial');
  }

  // 5) No expected md5 (FLUX-style) → success with null hash
  {
    const s = makeServer(content);
    const url = await listen(s);
    const dest = path.join(dir, 'model_e.tdict');
    const r = await runDownload(url, dest, {});
    assert.strictEqual(r.error, undefined, 'no-md5 error: ' + JSON.stringify(r.error));
    assert.strictEqual(r.success.hash, null, 'no-md5: hash null');
    assert.ok(fs.existsSync(dest), 'no-md5: file present');
    s.close();
    console.log('PASS 5/7 no expected md5 → etag-guarded success');
  }

  // 6) Cancel mid-download → 'cancelled' fires, partial removed, NO success/error after
  {
    const s = makeServer(content, { chunkDelayMs: 15 }); // 16 chunks × 15ms ≈ 240ms transfer
    const url = await listen(s);
    const dest = path.join(dir, 'model_f.tdict');
    const downloadId = 'dl-cancel';
    let cancelled = false;
    let progressEvents = 0;
    const events = [];
    const evt = {
      sender: {
        send: (ch, data) => {
          if (ch !== 'to_download' || data.download_id !== downloadId) return;
          events.push(data.fn + ':' + JSON.stringify(data.msg).slice(0, 60));
          if (data.fn === 'cancelled') cancelled = true;
          if (data.fn === 'progress') progressEvents += 1;
        },
      },
    };
    handlers['download-file'](evt, url, dest, downloadId, {});
    await new Promise((r) => setTimeout(r, 80)); // mid-transfer
    const cancelEvt = {
      sender: {
        send: (ch, data) => {
          if (ch !== 'to_download' || data.download_id !== downloadId) return;
          events.push('CAN-' + data.fn);
          if (data.fn === 'cancelled') cancelled = true;
        },
      },
    };
    handlers['download-cancel'](cancelEvt, downloadId);
    await new Promise((r) => setTimeout(r, 600));
    assert.strictEqual(cancelled, true, 'cancel: cancelled event should fire');
    assert.ok(!events.some((e) => e.startsWith('success')), 'cancel: no success after cancel, got ' + JSON.stringify(events));
    assert.ok(!events.some((e) => e.startsWith('error')), 'cancel: no error after cancel, got ' + JSON.stringify(events));
    assert.ok(!fs.existsSync(dest + '.partial'), 'cancel: partial removed');
    assert.ok(!fs.existsSync(dest), 'cancel: no final file');
    assert.ok(progressEvents > 0, 'cancel: download was actually streaming');
    s.close();
    console.log('PASS 6/7 real cancel aborts stream + cleans partial (no success/error after cancel)');
  }

  // 7) Transient network error mid-download → partial is KEPT for retry
  {
    const s = makeServer(content, { chunkDelayMs: 15 });
    const url = await listen(s);
    const dest = path.join(dir, 'model_g.tdict');
    const downloadId = 'dl-err';
    let errored = null;
    const evt = {
      sender: {
        send: (ch, data) => {
          if (ch !== 'to_download' || data.download_id !== downloadId) return;
          if (data.fn === 'error') errored = data.msg;
        },
      },
    };
    handlers['download-file'](evt, url, dest, downloadId, {});
    await new Promise((r) => setTimeout(r, 80));
    // server.close() only stops NEW connections — must forcibly close the
    // in-flight one to simulate a mid-transfer connection drop.
    s.closeAllConnections();
    s.close();
    await new Promise((r) => setTimeout(r, 800));
    assert.ok(errored, 'network error: error should fire');
    const partialSize = fs.existsSync(dest + '.partial') ? fs.statSync(dest + '.partial').size : 0;
    assert.ok(partialSize > 0, 'network error: partial should be KEPT for resume, got ' + partialSize);
    console.log('PASS 7/7 transient error keeps partial for resume');
  }

  console.log('\nALL DOWNLOAD RESUME TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error('TEST FAILURE:', e.message);
  process.exit(1);
});
