#!/usr/bin/env node
/* Probe v5 — why is the page blank after clean-locale reload?
 * attach -> wait boot -> clear locale -> Page.reload -> capture console + DOM + gating flags */
const fs = require('fs');
const log = (...a) => console.log('[p5]', ...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function connectWS(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map(); let seq = 0; const msgs = [];
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res2, rej2) => {
        const id = ++seq; pending.set(id, { res2, rej2 });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => ws.close(), msgs,
    });
    ws.onerror = () => reject(new Error('WS error'));
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const t = msg.params.type;
        const a = (msg.params.args || []).map(x => x.value !== undefined ? String(x.value) : (x.description || '')).join(' ');
        msgs.push(`[${t}] ${a.slice(0, 220)}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        msgs.push(`[exception] ${((d.exception && d.exception.description) || d.text || '?').slice(0, 220)}`);
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
async function main() {
  const target = await findTarget(parseInt(process.argv[2] || '9222'));
  if (!target) { console.error('[p5] no target'); process.exit(2); }
  const cdp = await connectWS(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const evaluate = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || '?').slice(0, 300));
    return r.result.value;
  };
  for (let i = 0; i < 60; i++) {
    try { if (await evaluate('!!(window.app && window.app.app_state)')) break; } catch (e) {}
    await sleep(1000);
  }
  for (let i = 0; i < 90; i++) {
    try { if (await evaluate('!document.querySelector(".splash_screen") && !!document.querySelector(".chat-input")')) break; } catch (e) {}
    await sleep(1000);
  }
  log('boot ok. clearing locale + reload');
  cdp.msgs.length = 0;
  await evaluate(`localStorage.removeItem('diffusionbee_locale')`);
  await cdp.send('Page.reload');
  // poll DOM + flags for 40s
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    let st; try {
      st = await evaluate(`({
        appMounted: !!(window.app && window.app.app_state),
        splash: !!document.querySelector('.splash_screen'),
        chat: !!document.querySelector('.chat-input'),
        appChildren: (document.getElementById('app')||{children:[]}).children.length,
        appHtmlLen: ((document.getElementById('app')||{}).innerHTML||'').length,
        frozen: window.app ? window.app.app_state.is_screen_frozen : null,
        pagesReady: window.app ? window.app.app_state.all_pages_ready : null,
        tab: window.app ? window.app.app_state.current_selected_tab : null,
        bodyCls: document.body.className
      })`);
    } catch (e) { continue; }
    if (i % 2 === 0 || st.chat) log(`t+${i}s`, JSON.stringify(st));
    if (st.chat) break;
  }
  log('console during/after reload:', cdp.msgs.length ? JSON.stringify(cdp.msgs.slice(-20), null, 1) : 'NONE');
  log('DONE');
  cdp.close();
}
main().catch(e => { console.error('[p5] FATAL', e); process.exit(1); });
