// batch_queue_store.js
//
// Shared persistence + completion helpers for the batch queue feature.
// The queue must survive app restarts, so it is mirrored to localStorage
// every time it changes. Item states:
//   pending  — collected, not yet submitted to the SD manager
//   queued   — submitted, waiting in the manager's FIFO queue
//   running  — the manager is currently generating this item's group
//   done     — every image of the item's gallery group has an output
//   error    — at least one image of the group failed
//
// On a fresh session (app restart) only `pending` items are restored —
// completed/failed items already live in the gallery + history, and
// mid-flight items lost their manager queue when the process exited.

const APPLET_KEY = 'batch_queue_applet_v1'
const HOMEPAGE_KEY = 'batch_queue_homepage_v1'

function read(key) {
    try {
        const raw = window.localStorage.getItem(key)
        const arr = raw ? JSON.parse(raw) : []
        return Array.isArray(arr) ? arr : []
    } catch (e) {
        return []
    }
}

function write(key, queue) {
    try {
        window.localStorage.setItem(key, JSON.stringify(queue))
    } catch (e) {
        // storage unavailable — the queue simply won't survive restarts
    }
}

function normalize(items) {
    // Only un-submitted requests survive a restart. Completed/failed items
    // already live in the gallery + history, and mid-flight items lost their
    // manager queue when the process exited — so keep only 'pending'.
    return (items || []).filter((it) => it && (it.state || 'pending') === 'pending')
}

export function loadAppletBatch() {
    return normalize(read(APPLET_KEY))
}

export function saveAppletBatch(queue) {
    write(APPLET_KEY, queue)
}

export function loadHomepageBatch() {
    return normalize(read(HOMEPAGE_KEY))
}

export function saveHomepageBatch(queue) {
    write(HOMEPAGE_KEY, queue)
}

// True when the gallery group has every image slot filled (real output or ERROR).
export function batchItemDone(gallery, groupId) {
    if (!gallery || typeof gallery.get_group !== 'function') return false
    const g = gallery.get_group(groupId)
    if (!g) return false
    const imgs = g.imgs || []
    return imgs.length > 0 && imgs.every((im) => im.image_url)
}

// True when at least one image of the group failed.
export function batchItemHasError(gallery, groupId) {
    if (!gallery || typeof gallery.get_group !== 'function') return false
    const g = gallery.get_group(groupId)
    if (!g) return false
    const imgs = g.imgs || []
    return imgs.some((im) => im.image_url === 'ERROR')
}

// Positive completion check: SDManager.finish_current_job records finished
// groups into the app-wide history store (history_service.js `historyStore`,
// persisted to history.json) keyed by group_id. This is the authoritative
// record — `app_state.app_data.history` is a separate legacy store that is
// NOT written on normal generation, so batch status must consult the real
// history store (falling back to the legacy path for safety).
export function groupIsInHistory(app, groupId) {
    if (!groupId) return false
    try {
        // Authoritative store: history_service.js `historyStore.entries`.
        const { getHistory } = require('./history_service.js')
        const hist = getHistory()
        if (hist && hist[groupId]) return true
    } catch (e) {
        // history_service unavailable (e.g. odd bundling) — fall through
    }
    // Legacy fallback: app_data_2.json history path.
    try {
        const appData = app && app.app_state && app.app_state.app_data
        if (appData && appData.history && appData.history[groupId]) return true
    } catch (e) { /* ignore */ }
    return false
}
