



// Suppress the benign ResizeObserver loop limit error that webpack-dev-server overlays in dev mode
// This is a known browser/V8 engine quirk that doesn't affect functionality
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
Vue.config.performance = true

// setup the vue libs 
import {} from "./init_vue_libs.js"


// include the py vue bridge 
import {} from "./py_vue_bridge.js"

import App from './App.vue'
new Vue({
    render: h => h(App),
}).$mount('#app')