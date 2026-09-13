#!/usr/bin/env node
/* CDP probe v4 — clean-state visual + interaction forensics.
 * C1 clean localStorage -> reload -> default-English launch timeline + homepage shot
 * C2 geometry dump of homepage elements (below-fold detection) + hit tests
 * C3 type + Enter-key submit (real-user path) -> loader timeline -> post-gen state + shot
 * C4 Arabic via real click on lang-toggle (with scroll check) -> RTL geometry + shot
 * C5 small window LTR + RTL
 * Console errors captured throughout. */
const fs = require('fs');
const log = (...a) => console.log('[p4]', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (cdp, name) => {
  const s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`/tmp/p4-${name}.png`, Buffer.from(s.data, 'base64'));
  return `/tmp/p4-${name}.png`;
};

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map(); let seq = 0; const consoleMsgs = [];
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res2, rej2) => {
        const id = ++seq; pending.set(id, { res2, rej2 });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => ws.close(), consoleMsgs,
    });
    ws.onerror = () => reject(new Error('WS error'));
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const t = msg.params.type;
        const a = (msg.params.args || []).map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ');
        if (t === 'error') consoleMsgs.push(`[${t}] ${a.slice(0, 160)}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        consoleMsgs.push(`[exception] ${((d.exception && d.exception.description) || d.text || '?').slice(0, 160)}`);
      }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id); pending.delete(msg.id);
        if (msg.error) p.rej2(new Error(msg.error.message || 'CDP error')); else p.res2(msg.result);
      }
    };
  });
}

async function findTarget(port, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const ts = await res.json();
      const t = ts.find(t => t.type === 'page' && !/devtools/i.test(t.url));
      if (t) return t;
    } catch (e) {}
    await sleep(1000);
  }
  return null;
}

const GEOM_JS = `(() => {
  const sels = ['.welcome-title', '.mode-switcher', '.chat-box', '.chat-input', '.chat-actions', '.chat-submit', '.lang-toggle', '.gallery-section', '.prompt-token-counter', '.recent-prompts-dropdown'];
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out[s] = { box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      belowFold: r.y >= innerHeight, pe: cs.pointerEvents, disp: cs.display, vis: cs.visibility, ta: cs.textAlign };
  }
  const hit = (s) => { const el = document.querySelector(s); if (!el) return 'MISSING';
    const r = el.getBoundingClientRect();
    if (r.x + r.width/2 < 0 || r.x + r.width/2 >= innerWidth || r.y + r.height/2 < 0 || r.y + r.height/2 >= innerHeight) return 'OFFSCREEN';
    const h = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
    return (el.contains(h) || h === el) ? 'HIT' : 'BLOCKED:' + (h ? String(h.className).slice(0, 30) : 'null'); };
  out._hits = {}; for (const s of sels) out._hits[s] = hit(s);
  out._viewport = { w: innerWidth, h: innerHeight };
  out._docHeight = document.documentElement.scrollHeight;
  return out;
})()`;

async function main() {
  const port = parseInt(process.argv[2] || '9222');
  const target = await findTarget(port);
  if (!target) { console.error('[p4] FAIL no target'); process.exit(2); }
  const cdp = await connectWS(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '?').slice(0, 300));
    return r.result.value;
  };

  // wait for app boot
  for (let i = 0; i < 60; i++) {
    try { if (await evaluate('!!(window.app && window.app.app_state)')) break; } catch (e) {}
    await sleep(1000);
  }
  // wait for splash to clear
  for (let i = 0; i < 90; i++) {
    try { if (await evaluate('!document.querySelector(".splash_screen") && !!document.querySelector(".chat-input")')) break; } catch (e) {}
    await sleep(1000);
  }
  log('boot complete (state was dirty from prior runs)');

  // ---- C1: clean state -> reload -> default launch ----
  await evaluate(`(() => { localStorage.removeItem('diffusionbee_locale'); return localStorage.getItem('diffusionbee_locale'); })()`);
  await cdp.send('Page.reload');
  await sleep(1500);
  const t0 = Date.now(); const timeline = []; let splashSeen = false;
  for (let i = 0; i < 120; i++) {
    let st; try {
      st = await evaluate('({ splash: !!document.querySelector(".splash_screen"), chat: !!document.querySelector(".chat-input"), dir: getComputedStyle(document.body).direction, status: (document.querySelector(".progress_status")||{}).textContent || null })');
    } catch (e) { await sleep(1000); continue; }
    const rel = ((Date.now() - t0) / 1000).toFixed(1);
    if (st.splash && !splashSeen) { splashSeen = true; timeline.push(`${rel}s splash UP (${st.status || '?'})`); }
    if (splashSeen && !st.splash) { timeline.push(`${rel}s splash DOWN dir=${st.dir}`); break; }
    if (!splashSeen && st.chat) { timeline.push(`${rel}s no-splash chat present dir=${st.dir}`); break; }
    await sleep(500);
  }
  log('C1 clean-launch timeline:', JSON.stringify(timeline));
  await sleep(1500);
  const dir1 = await evaluate('getComputedStyle(document.body).direction');
  log('C1 default direction:', dir1);
  await shot(cdp, '01-default-launch');
  const geom1 = await evaluate(GEOM_JS);
  log('C2 geometry (default):', JSON.stringify(geom1, null, 1));

  // ---- C3: type + Enter submit ----
  await evaluate(`(() => {
    const ta = document.querySelector('.chat-input');
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value');
    ta.focus(); d.set.call(ta, 'a serene mountain lake at dawn, oil painting');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(700);
  const preSubmit = await evaluate(`({ v: document.querySelector('.chat-input').value.slice(0,20), counter: (document.querySelector('.prompt-token-counter')||{}).textContent, submitDisabled: document.querySelector('.chat-submit') ? document.querySelector('.chat-submit').disabled : null })`);
  log('C3 pre-submit:', JSON.stringify(preSubmit));
  // Enter key via CDP
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(1200);
  const postSubmit = await evaluate(`({ cleared: document.querySelector('.chat-input').value === '', loader: !!document.querySelector('.loader_overlay') || !!document.querySelector('[class*="loader"]'), loaderCls: [...document.querySelectorAll('[class*="loader"]')].map(e => e.className.toString().slice(0, 40)).slice(0, 4) })`);
  log('C3 post-Enter:', JSON.stringify(postSubmit));

  // loader timeline
  let loaderSeenAt = null, goneAt = null; const lt0 = Date.now();
  let imageFile = null;
  for (let i = 0; i < 150; i++) {
    let st; try { st = await evaluate(`({ loader: !!document.querySelector('[class*="loader_overlay"], [class*="loader-modal"], .loader'), body: document.body.textContent.includes('Generating') || document.body.textContent.includes('جارٍ') })`); } catch (e) { st = {}; }
    if (st.loader && !loaderSeenAt) { loaderSeenAt = ((Date.now() - lt0) / 1000).toFixed(1); log(`C3 loader visible at +${loaderSeenAt}s`); }
    if (loaderSeenAt && !st.loader && goneAt === null) { goneAt = ((Date.now() - lt0) / 1000).toFixed(1); log(`C3 loader gone at +${goneAt}s`); break; }
    await sleep(1000);
  }
  // wait a bit for image write
  await sleep(3000);
  await shot(cdp, '02-post-generation');
  const postGen = await evaluate(`(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => i.src.includes('app://') || i.src.includes('file')).length;
    return { dir: getComputedStyle(document.body).direction, appImgs: imgs,
      chatVal: document.querySelector('.chat-input') ? document.querySelector('.chat-input').value.slice(0, 20) : null,
      galleryImgs: document.querySelectorAll('.gallery-section img, [class*="gallery"] img').length };
  })()`);
  log('C3 post-gen state:', JSON.stringify(postGen));

  // ---- C4: Arabic via real click on lang-toggle ----
  const langClick = await evaluate(`(() => {
    const b = document.querySelector('.lang-toggle'); if (!b) return { err: 'missing' };
    const r = b.getBoundingClientRect();
    const offscreen = r.y >= innerHeight || r.y + r.height < 0;
    if (offscreen) b.scrollIntoView({ block: 'center' });
    const r2 = b.getBoundingClientRect();
    const cx = r2.x + r2.width/2, cy = r2.y + r2.height/2;
    const hit = document.elementFromPoint(cx, cy);
    const clickable = hit && (b.contains(hit) || hit === b);
    if (clickable) b.click();
    return { wasOffscreen: offscreen, clickable, clicked: clickable };
  })()`);
  await sleep(900);
  const arabicState = await evaluate(`({ dir: getComputedStyle(document.body).direction, ta: getComputedStyle(document.querySelector('.chat-input')).textAlign, ph: document.querySelector('.chat-input').placeholder, stored: localStorage.getItem('diffusionbee_locale'), htmlLang: document.documentElement.getAttribute('lang') })`);
  log('C4 lang-click:', JSON.stringify(langClick), '->', JSON.stringify(arabicState));
  await shot(cdp, '03-arabic');
  const geomAr = await evaluate(GEOM_JS);
  log('C4 RTL geometry:', JSON.stringify(geomAr, null, 1));

  // ---- C5: small window both modes ----
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 620, deviceScaleFactor: 1, mobile: false });
  await sleep(1000);
  const smallAr = await evaluate(GEOM_JS);
  log('C5 small-window RTL geometry:', JSON.stringify({ hits: smallAr._hits, viewport: smallAr._viewport, chat: smallAr['.chat-box'], submit: smallAr['.chat-submit'] }));
  await shot(cdp, '04-small-rtl');
  await evaluate(`document.querySelector('.lang-toggle').click()`);
  await sleep(700);
  const smallEn = await evaluate(GEOM_JS);
  log('C5 small-window LTR geometry:', JSON.stringify({ hits: smallEn._hits, chat: smallEn['.chat-box'], submit: smallEn['.chat-submit'] }));
  await shot(cdp, '05-small-ltr');
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await sleep(600);

  // back to English for next user of this profile
  await evaluate(`(() => { const b = document.querySelector('.lang-toggle'); if (b) { const r = b.getBoundingClientRect(); if (r.y >= innerHeight) b.scrollIntoView({ block: 'center' }); b.click(); } return localStorage.getItem('diffusionbee_locale'); })()`);
  await sleep(500);

  log('C6 console errors:', cdp.consoleMsgs.length ? JSON.stringify(cdp.consoleMsgs) : 'NONE');
  log('DONE');
  cdp.close();
}

main().catch(e => { console.error('[p4] FATAL', e); process.exit(1); });
