import Vue from 'vue'
import { migrate_history_only_once } from './utils'

export const historyStore = Vue.observable({
    entries: {},
    initialized: false,
})

function initHistory() {
    if (historyStore.initialized) {
        return historyStore.entries
    }

    let hist = window.ipcRenderer.sendSync('load_data', 'history.json')
    let loaded = (hist && hist.history) ? hist.history : {}

    try {
        let new_items = migrate_history_only_once(loaded)
        for (let k in new_items) {
            loaded[k] = new_items[k]
        }
    } catch (error) {
        console.error('History migration failed:', error)
    }

    for (let k of Object.keys(historyStore.entries)) {
        Vue.delete(historyStore.entries, k)
    }
    for (let k of Object.keys(loaded)) {
        Vue.set(historyStore.entries, k, loaded[k])
    }

    historyStore.initialized = true
    return historyStore.entries
}

function getHistory() {
    return initHistory()
}

function persistHistory() {
    window.ipcRenderer.sendSync('save_data', { history: historyStore.entries }, 'history.json')
}

function addToHistory(k, history_vals) {
    initHistory()
    history_vals = JSON.parse(JSON.stringify(history_vals))
    if (!history_vals.imgs || history_vals.imgs.length === 0) {
        return
    }
    history_vals.params = history_vals.imgs[0].params
    history_vals.key = k
    history_vals.prompt = history_vals.params.prompt
    Vue.set(historyStore.entries, k, history_vals)
    persistHistory()
}

function deleteEntry(k) {
    initHistory()
    Vue.delete(historyStore.entries, k)
    persistHistory()
}

function clearHistory() {
    initHistory()
    for (let k of Object.keys(historyStore.entries)) {
        Vue.delete(historyStore.entries, k)
    }
    persistHistory()
}

function bindHistoryToApp(app) {
    initHistory()
    app.functions.add_to_history = addToHistory
}

export {
    initHistory,
    getHistory,
    addToHistory,
    deleteEntry,
    clearHistory,
    bindHistoryToApp,
    persistHistory,
}