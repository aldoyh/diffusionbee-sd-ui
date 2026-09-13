#!/usr/bin/env node
/* CDP probe for the running DiffusionBee dev app (REMOTE_DEBUG_PORT=9222).
 * Verifies with runtime evidence: prompt-box hit-testing (click-through),
 * v-model typing, submit-button real click, loader/appearance, alignment audit.
 * Usage: node ui_probe.js [--wait-image <seconds>]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 9222;
const WAIT_IMAGE_S = Number((process.argv.includes('--wait-image') && process.argv[process.argv.indexOf('--wait-image') + 1]) || 0);

function log(...a) { console.log('[probe]', ...a); }

async function getTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  if (!res.ok) throw new Error(`/json/list HTTP ${res.status}`);
  return res.json();
}

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const events = [];
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res2, rej2) => {
        const id = ++sendSeq;
        pending.set(id, { res2, rej2 });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onerror = (e) => reject(new Error('WS error'));
    let sendSeq = 0;
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.rej2(new Error(msg.error.message || 'CDP error')); else p.res2(msg.result);
      } else if (msg.method) {
        if (events.length < 400) events.push(msg);
      }
    };
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  // 1. find the app window target
  let target = null;
  for (let i = 0; i < 60; i++) {
    try {
      const targets = await getTargets();
      target = targets.find(t => t.type === 'page' && !/devtools/i.test(t.url) && !/SplashScreen/i.test(t.title));
      if (target) break;
    } catch (e) { /* retry */ }
    await sleep(1000);
  }
  if (!target) { console.error('[probe] FAIL: no page target found on port ' + PORT); process.exit(2); }
  log('target:', target.title, '|', target.url.slice(0, 60));

  const cdp = await connectWS(target.webSocketDebuggerUrl);
  const logs = [];
  try { await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); } catch (e) { log('enable warn:', e.message); }

  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('page eval failed: ' + (d.exception && d.exception.description || d.text || '?').slice(0, 300));
    }
    return r.result.value;
  };

  // 2. wait for the homepage prompt box to exist
  let domReady = false;
  for (let i = 0; i < 60; i++) {
    try {
      if (await evaluate('!!document.querySelector(".chat-input")')) { domReady = true; break; }
      if (i === 20) {
        const state = await evaluate('JSON.stringify({title: document.title, bodyCls: document.body.className, hasSetup: !!document.querySelector("[class*=\\"model-setup\\"],[class*=\\"setup-dialog\\"],[class*=\\"onboarding\\"]"), splash: !!document.querySelector("[class*=\\"splash\\"]")})');
        log('waiting… page state:', state);
      }
    } catch (e) { /* page navigating */ }
    await sleep(1000);
  }
  log('domReady:', domReady);
  if (!domReady) {
    try { const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/probe-no-dom.png', Buffer.from(shot.data, 'base64')); log('saved /tmp/probe-no-dom.png'); } catch (e) {}
    process.exit(3);
  }

  // 3. capture renderer errors so far
  const earlyErrors = logs.filter(l => l.level === 'error').slice(0, 10);

  // 4. PROBE A: layout + click-through on the prompt box
  const probeA = await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    const r = ta.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { error: 'textarea has zero size', rect: null };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    const chain = [];
    let el = topEl;
    while (el && chain.length < 6) { chain.push(el.tagName + (el.className && String(el.className) ? '.' + String(el.className).split(' ').join('.') : '')); el = el.parentElement; }
    const isSelfOrInside = topEl && (topEl === ta || ta.contains(topEl) || (topEl.closest && topEl.closest('.chat-input') === ta));
    const st = getComputedStyle(ta);
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      centerHits: chain,
      clickReachesTextarea: !!isSelfOrInside,
      textareaPointerEvents: st.pointerEvents,
      bodyDir: getComputedStyle(document.body).direction,
      placeholder: ta.placeholder,
      disabled: ta.disabled, readOnly: ta.readOnly,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      docOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  })()`);
  log('PROBE A (layout/hit-test):', JSON.stringify(probeA, null, 1));

  // 5. PROBE B: v-model typing (native setter + input event)
  const probeB = await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    ta.focus();
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value');
    desc.set.call(ta, 'a serene mountain lake at dawn, oil painting');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const counter = document.querySelector('.prompt-token-counter span');
    return { value: ta.value, counterText: counter ? counter.textContent : null, focused: document.activeElement === ta };
  })()`);
  log('PROBE B (typing/v-model):', JSON.stringify(probeB));

  // screenshot with text typed
  try { const s1 = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/probe-typed.png', Buffer.from(s1.data, 'base64')); log('saved /tmp/probe-typed.png'); } catch (e) {}

  // 6. PROBE C: real mouse click on the submit button (at its center, via hit-test winner)
  const probeC = await evaluate(`(() => {
    const btn = document.querySelector('.chat-submit');
    if (!btn) return { error: 'no .chat-submit button' };
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { error: 'zero-size submit button' };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    const hitOk = topEl && (topEl === btn || btn.contains(topEl) || (topEl.closest && topEl.closest('.chat-submit') === btn));
    const opts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };
    const t = topEl || btn;
    t.dispatchEvent(new MouseEvent('mousedown', opts));
    t.dispatchEvent(new MouseEvent('mouseup', opts));
    t.dispatchEvent(new MouseEvent('click', opts));
    return { hitOk, hitEl: topEl ? topEl.tagName + '.' + String(topEl.className).slice(0, 40) : null, btnDisabled: btn.disabled };
  })()`);
  log('PROBE C (submit click):', JSON.stringify(probeC));

  // 7. wait for reaction: loader modal / pending state / toast
  await sleep(5000);
  const probeD = await evaluate(`(() => {
    const q = (s) => document.querySelector(s);
    const loader = q('.loader-modal') || q('[class*="loader-modal"]') || q('[class*="LoaderModal"]');
    const toasts = [...document.querySelectorAll('[class*="toast"],[class*="alert"],[class*="snack"]')].map(e => e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 100)).filter(Boolean).slice(0, 5);
    const ta = q('.chat-input');
    return {
      promptValueAfterClick: ta ? ta.value : null,
      loaderVisible: !!loader,
      loaderText: loader ? loader.textContent.replace(/\\s+/g, ' ').trim().slice(0, 140) : null,
      toasts,
      bodyHasPendingClass: document.body.className,
    };
  })()`);
  log('PROBE D (post-click state):', JSON.stringify(probeD, null, 1));

  // screenshot after submit
  try { const s2 = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/probe-submitted.png', Buffer.from(s2.data, 'base64')); log('saved /tmp/probe-submitted.png'); } catch (e) {}

  // 8. PROBE E: alignment audit (rtl/overflow/offscreen)
  const probeE = await evaluate(`(() => {
    const sels = ['.chat-box', '.chat-input', '.chat-actions', '.inspiration-text', '.welcome-sample-label', '.prompt-modifiers', '.home-batch-panel', '.lang-toggle'];
    const audit = [];
    for (const s of sels) {
      const el = document.querySelector(s);
      if (!el) continue;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      audit.push({ sel: s, dir: st.direction, textAlign: st.textAlign, w: Math.round(r.width), h: Math.round(r.height) });
    }
    const docW = document.documentElement.clientWidth;
    const offscreen = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && el.children.length === 0 && (r.right > docW + 12 || r.left < -12) && offscreen.length < 10) {
        offscreen.push({ tag: el.tagName, cls: String(el.className).slice(0, 50), left: Math.round(r.left), right: Math.round(r.right) });
      }
    });
    return { audit, scrollW: document.documentElement.scrollWidth, clientW: docW, offscreen };
  })()`);
  log('PROBE E (alignment):', JSON.stringify(probeE, null, 1));

  // 9. optionally wait for a new generated image on disk
  if (WAIT_IMAGE_S > 0) {
    const imgDir = path.join(os.homedir(), '.diffusionbee', 'images');
    const list = () => { try { return fs.readdirSync(imgDir).filter(f => f.endsWith('.png')); } catch { return []; }; };
    const before = new Set(list());
    log('waiting up to', WAIT_IMAGE_S, 's for a new image; existing count =', before.size);
    let generated = null;
    const deadline = Date.now() + WAIT_IMAGE_S * 1000;
    while (Date.now() < deadline) {
      await sleep(4000);
      const now = list();
      const fresh = now.filter(f => !before.has(f));
      if (fresh.length) { generated = fresh; break; }
      // report loader state periodically
      try {
        const st = await evaluate(`(() => { const l = document.querySelector('.loader-modal,[class*="loader-modal"]'); const g=[...document.querySelectorAll('.loader-modal [class*="progress"],[class*="loader-modal"] *')].map(e=>e.textContent.trim()).filter(t=>/step|%/i.test(t)).slice(0,3); return l ? ('loader: ' + g.join(' | ')).slice(0,120) : 'no loader'; })()`);
        log('  …', st);
      } catch (e) {}
    }
    log('generated:', generated ? JSON.stringify(generated) : 'NOTHING within timeout');
  }

  // 10. dump console errors collected
  log('console errors:', JSON.stringify(earlyErrors.length ? earlyErrors : (logs.filter(l => l.level === 'error').slice(0, 10)), null, 1));

  cdp.close();
  log('PROBE DONE');
}

main().catch(e => { console.error('[probe] FATAL:', e.message); process.exit(1); });
