#!/usr/bin/env node
/* CDP probe round 2: counter settle, Arabic RTL alignment, negative-prompt toggle,
 * generation progress UI visibility. Attaches to already-running app on :9222. */
const fs = require('fs');

const log = (...a) => console.log('[probe2]', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let sendSeq = 0;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res2, rej2) => {
        const id = ++sendSeq;
        pending.set(id, { res2, rej2 });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onerror = () => reject(new Error('WS error'));
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.rej2(new Error(msg.error.message || 'CDP error')); else p.res2(msg.result);
      }
    };
  });
}

async function main() {
  let target = null;
  for (let i = 0; i < 45; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const targets = await res.json();
      target = targets.find(t => t.type === 'page' && !/devtools/i.test(t.url));
      if (target) break;
    } catch (e) {}
    await sleep(1000);
  }
  if (!target) { console.error('[probe2] FAIL: no target'); process.exit(2); }
  const cdp = await connectWS(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '?').slice(0, 250));
    return r.result.value;
  };

  // wait for prompt box
  for (let i = 0; i < 60; i++) {
    try { if (await evaluate('!!document.querySelector(".chat-input")')) break; } catch (e) {}
    await sleep(1000);
  }
  log('attached, prompt box present');

  // ---- T1: counter after settle (English) ----
  await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value');
    ta.focus();
    d.set.call(ta, 'a serene mountain lake at dawn, oil painting');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(600);
  const t1 = await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    const counter = document.querySelector('.prompt-token-counter span');
    const cls = document.querySelector('.prompt-token-counter');
    return { value: ta.value, counterText: counter ? counter.textContent : null, counterClass: cls ? cls.className : null };
  })()`);
  log('T1 counter-after-settle:', JSON.stringify(t1));

  // ---- T2: negative prompt toggle ----
  const t2 = await evaluate(`(() => {
    const btns = [...document.querySelectorAll('.chat-actions .chat-action-btn')];
    const negBtn = btns.find(b => (b.title || '').match(/negative/i) || (b.title || '').includes('السلبي'));
    if (!negBtn) return { error: 'negative toggle not found', titles: btns.map(b => b.title) };
    negBtn.click();
    return { clicked: true };
  })()`);
  await sleep(400);
  const t2b = await evaluate(`(() => {
    const neg = document.querySelector('.neg-input');
    return { negVisible: !!neg, negPlaceholder: neg ? neg.placeholder : null };
  })()`);
  log('T2 negative-toggle:', JSON.stringify({ ...t2, ...t2b }));

  // ---- T3: Arabic mode via real click on lang toggle ----
  await evaluate(`(() => { const ta = document.querySelector('.chat-input'); ta.blur(); })()`);
  const t3 = await evaluate(`(() => {
    const btn = document.querySelector('.lang-toggle');
    if (!btn) return { error: 'no lang toggle' };
    btn.click();
    return { clicked: true, label: btn.textContent.trim() };
  })()`);
  await sleep(700);
  const t3b = await evaluate(`(() => {
    const box = document.querySelector('.chat-box');
    const ta = document.querySelector('.chat-input');
    const st = getComputedStyle(ta);
    const bodyDir = getComputedStyle(document.body).direction;
    // type Arabic text and re-check counter
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value');
    ta.focus();
    d.set.call(ta, 'منظر جميل لإطلالة على البحر عند الغروب');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return { boxDirAttr: box.getAttribute('dir'), taDirCss: st.direction, taTextAlign: st.textAlign, bodyDir, placeholder: ta.placeholder };
  })()`);
  await sleep(600);
  const t3c = await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    const counter = document.querySelector('.prompt-token-counter span');
    const r = ta.getBoundingClientRect();
    const st = getComputedStyle(ta);
    return { value: ta.value.slice(0, 30), counterText: counter ? counter.textContent : null, rect: { x: Math.round(r.x), w: Math.round(r.width) }, textAlign: st.textAlign };
  })()`);
  log('T3 arabic:', JSON.stringify({ ...t3, ...t3b, counter: t3c.counterText, typed: t3c.value, textAlign: t3c.textAlign }));
  try { const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/probe2-arabic.png', Buffer.from(s.data, 'base64')); log('saved /tmp/probe2-arabic.png'); } catch (e) {}

  // alignment audit in Arabic mode
  const t3d = await evaluate(`(() => {
    const sels = ['.chat-box', '.chat-input', '.chat-actions', '.inspiration-text', '.welcome-sample-label', '.prompt-modifiers', '.lang-toggle', '.recent-prompts-dropdown'];
    return sels.map(s => {
      const el = document.querySelector(s);
      if (!el) return { sel: s, missing: true };
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { sel: s, dir: st.direction, textAlign: st.textAlign, x: Math.round(r.x), w: Math.round(r.width) };
    });
  })()`);
  log('T3d arabic alignment audit:', JSON.stringify(t3d, null, 1));

  // ---- T4: submit Arabic prompt, poll progress UI every 1s ----
  const imgDir = require('os').homedir() + '/.diffusionbee/images';
  const before = new Set(require('fs').readdirSync(imgDir).filter(f => f.endsWith('.png')));
  const t4 = await evaluate(`(() => {
    const btn = document.querySelector('.chat-submit');
    const r = btn.getBoundingClientRect();
    btn.click();
    return { clicked: true, disabled: btn.disabled };
  })()`);
  log('T4 submit:', JSON.stringify(t4));
  let sawProgressUI = [];
  let generated = null;
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    await sleep(1000);
    const st = await evaluate(`(() => {
      const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const loader = [...document.querySelectorAll('[class*="loader" i],[class*="LoaderModal"]')].filter(vis);
      const progressEls = [...document.querySelectorAll('[class*="progress" i]')].filter(vis);
      const pendingTiles = [...document.querySelectorAll('[class*="pending" i],[class*="placeholder" i]')].filter(vis);
      const negArea = !!document.querySelector('.negative-prompt-area');
      return {
        loaders: loader.map(e => e.className.toString().slice(0, 40)),
        progress: progressEls.length,
        pendingTiles: pendingTiles.length,
        promptVal: (document.querySelector('.chat-input') || {}).value,
      };
    })()`);
    const key = JSON.stringify(st.loaders) + '|' + st.progress + '|' + st.pendingTiles;
    if (!sawProgressUI.length || sawProgressUI[sawProgressUI.length - 1].k !== key) {
      sawProgressUI.push({ t: Math.round((Date.now() - (deadline - 150000)) / 1000), k: key, ...st });
    }
    const now = (() => { try { return new Set(require('fs').readdirSync(imgDir).filter(f => f.endsWith('.png'))); } catch { return before; } })();
    const fresh = [...now].filter(f => !before.has(f));
    if (fresh.length) { generated = fresh; break; }
  }
  log('T4 progress-UI timeline:');
  for (const p of sawProgressUI) log('  t=' + p.t + 's', JSON.stringify({ loaders: p.loaders, progress: p.progress, pending: p.pendingTiles, prompt: (p.promptVal || '').slice(0, 20) }));
  log('T4 generated:', generated ? JSON.stringify(generated) : 'NOTHING');
  if (sawProgressUI.length) {
    try { const s = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('/tmp/probe2-final.png', Buffer.from(s.data, 'base64')); log('saved /tmp/probe2-final.png'); } catch (e) {}
  }

  cdp.close();
  log('PROBE2 DONE');
}

main().catch(e => { console.error('[probe2] FATAL:', e.message); process.exit(1); });
