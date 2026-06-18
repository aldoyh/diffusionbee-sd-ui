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

import AppDemoUI from './AppDemoUI.vue'


new Vue({
  render: h => h(AppDemoUI),
}).$mount('#app')
