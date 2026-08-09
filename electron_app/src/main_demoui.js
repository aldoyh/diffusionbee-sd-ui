// Suppress the benign ResizeObserver loop limit error that webpack-dev-server overlays in dev mode
const _origOnError = window.onerror
window.onerror = function (msg, url, line, col, error) {
	if (typeof msg === 'string' && msg.includes('ResizeObserver')) return true
	return _origOnError ? _origOnError(msg, url, line, col, error) : false
}
window.addEventListener('error', (e) => {
	if (e.message && e.message.includes('ResizeObserver')) {
		e.stopImmediatePropagation()
	}
}, true)

import Vue from 'vue'

Vue.config.productionTip = false

// setup the vue libs 
import {} from "./init_vue_libs.js"

// Lightweight ipcRenderer shim so the full UI can be reviewed in a plain
// browser (`npm run serve:ui`). Real Electron builds use the real preload
// bridge and are unaffected by this demo-only mock.
if (!window.ipcRenderer) {
    // The real preload (preload.js) calls the registered handler for every
    // "to_renderer" message from the main process. In the browser there is no
    // main process, so provide a stub so downstream code that checks
    // `typeof window.bind_ipc_renderer_on === 'function'` (py_vue_bridge)
    // can register; the ready handshake itself is driven below after mount.
    window.bind_ipc_renderer_on = () => {};
    window.ipcRenderer = {
        sendSync: (channel, fname) => {
            // Demo-only: seed a couple of fake history entries so the Homepage
            // "recent" gallery can be reviewed in the browser.
            const fakeHistory = {
                'hist-demo-1': {
                    group_id: 'hist-demo-1',
                    num_imgs: 1,
                    img_width: 512,
                    img_height: 512,
                    prompt: 'Aurora over a fjord, cinematic wide shot',
                    params: { prompt: 'Aurora over a fjord, cinematic wide shot' },
                    imgs: [{ job_id: 'hist-demo-1-img', image_url: 'https://picsum.photos/seed/11/512/512', description: 'Aurora over a fjord, cinematic wide shot' }],
                },
                'hist-demo-2': {
                    group_id: 'hist-demo-2',
                    num_imgs: 1,
                    img_width: 512,
                    img_height: 512,
                    prompt: 'Cyberpunk city at night, neon rain',
                    params: { prompt: 'Cyberpunk city at night, neon rain' },
                    imgs: [{ job_id: 'hist-demo-2-img', image_url: 'https://picsum.photos/seed/22/512/512', description: 'Cyberpunk city at night, neon rain' }],
                },
            };
            // Demo-only: seed a fake downloaded model so the form validation
            // and batch queue flow can be exercised in the browser demo.
            const fakeDownloadedAssets = {
                'Demo_SD15': {
                    id: 'Demo_SD15',
                    title: 'Default SD 1.5 (demo)',
                    filename: 'sd-v1-5_fp16.tdict',
                    asset_path: '/tmp/demo/Demo_SD15_sd-v1-5_fp16.tdict',
                    status: 'done',
                    model_meta_data: { type: 'sd_model', sd_type: 'sd_1x', float_type: 'float16' },
                },
            };
            if (channel === 'load_data' && fname === 'downloaded_assets.json') {
                return fakeDownloadedAssets;
            }
            if (channel === 'load_data' && fname === 'history.json') {
                return { history: fakeHistory };
            }
            switch (channel) {
                case 'load_data': return {};              // empty localStorage
                case 'get_instance_id': return 'browser-demo';
                case 'get_assets_dir':
                case 'get_homedir': return '';
                case 'scan_disk_for_models':
                case 'seed_bundled_models': return [];
                case 'save_data':
                case 'delete_file':
                case 'unfreeze_win':
                case 'freeze_win':
                case 'dont_show_dialog_on_quit':
                case 'open_url':
                case 'to_python_sync': return 'ok';
                default: return '';
            }
        },
        send: () => {},
        on: () => {},
        invoke: () => Promise.resolve(''),
    }
    window.ipcRenderer_on = () => {}
    window.bind_ipc_download_on = () => {}
    window.unbind_ipc_download_on = () => {}
}

import AppDemoUI from './AppDemoUI.vue'


new Vue({
  render: h => h(AppDemoUI),
}).$mount('#app')

// Simulate the Python backend reporting loaded + input-ready a moment after
// boot (mirrors diffusionbee_backend.py's `sdbk mdld` / `sdbk inrd` startup
// prints). Without this the splash screen would never dismiss and the whole
// demo UI would be unreachable. Driving the real state machine (instead of
// synthesizing messages) keeps the exact code path the Electron app uses.
setTimeout(() => {
    const sd = window.app && window.app.stable_diffusion
    if (sd && !sd.is_input_avail) {
        sd.state_msg('mdld') // backend loaded
        sd.state_msg('inrd') // input available -> dismisses splash
    }
}, 1800)
