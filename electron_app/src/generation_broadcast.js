import Vue from 'vue'
import { getHistory } from './history_service.js'

const LIVE_GALLERY_LIMIT = 10

export function cloneGalleryGroup(group) {
    return JSON.parse(JSON.stringify(group))
}

function hasDisplayableImage(group) {
    return group && group.imgs && group.imgs.some((img) => img.image_url && img.image_url !== 'ERROR')
}

function upsertLiveGroup(app, group) {
    const snapshot = cloneGalleryGroup(group)
    if (!snapshot.group_id) {
        snapshot.group_id = Math.random().toString()
    }

    const live = (app.app_state.live_gallery_groups || []).slice()
    const idx = live.findIndex((g) => g.group_id === snapshot.group_id)
    if (idx >= 0) {
        Vue.set(live, idx, snapshot)
    } else {
        live.unshift(snapshot)
    }

    while (live.length > LIVE_GALLERY_LIMIT) {
        live.pop()
    }

    Vue.set(app.app_state, 'live_gallery_groups', live)

    if (hasDisplayableImage(snapshot)) {
        Vue.set(app.app_state, 'last_gallery_group', snapshot)
    }

    return snapshot
}

export function syncGalleryGroup(targetGallery, group, sourceGallery) {
    if (!targetGallery || !group || targetGallery === sourceGallery) {
        return
    }
    const snapshot = cloneGalleryGroup(group)
    const existing = targetGallery.get_group(snapshot.group_id)
    if (existing) {
        targetGallery.update_group(snapshot)
    } else {
        targetGallery.add_group(snapshot)
    }
    targetGallery.scroll_to_top()
}

export function broadcastGalleryGroup(app, group, sourceGallery) {
    if (!group) {
        return
    }

    const snapshot = upsertLiveGroup(app, group)
    const galleries = app.functions._registered_galleries || []

    for (const gallery of galleries) {
        if (gallery && gallery !== sourceGallery) {
            syncGalleryGroup(gallery, snapshot, null)
        }
    }
}

export function registerGallery(app, gallery) {
    app.functions._registered_galleries = app.functions._registered_galleries || []
    if (!app.functions._registered_galleries.includes(gallery)) {
        app.functions._registered_galleries.push(gallery)
    }

    const live = app.app_state.live_gallery_groups || []
    for (const group of live) {
        syncGalleryGroup(gallery, group, null)
    }
}

export function unregisterGallery(app, gallery) {
    if (!app.functions._registered_galleries) {
        return
    }
    app.functions._registered_galleries = app.functions._registered_galleries.filter((g) => g !== gallery)
}

export function getTxt2ImgGallery(app) {
    const router = app.$refs && app.$refs.router
    if (!router || !router.$refs || !router.$refs.Txt2Img) {
        return null
    }
    const pageRef = router.$refs.Txt2Img
    const page = Array.isArray(pageRef) ? pageRef[0] : pageRef
    return page && page.$refs && page.$refs.sd_applet
        ? page.$refs.sd_applet.$refs.gallery
        : null
}

function hydrateFromHistory(app) {
    const hist = getHistory()
    const keys = Object.keys(hist)
    if (keys.length === 0) {
        return
    }

    // History keys are stored in insertion order (newest appended last), so walk
    // backwards to collect the most recent groups with displayable images. This
    // keeps the Homepage "recent" gallery populated after a restart instead of
    // showing only the single latest generation.
    const groups = []
    for (let i = keys.length - 1; i >= 0 && groups.length < LIVE_GALLERY_LIMIT; i--) {
        const entry = hist[keys[i]]
        if (!hasDisplayableImage(entry)) {
            continue
        }
        const group = cloneGalleryGroup(entry)
        group.group_id = group.group_id || keys[i]
        groups.push(group)
    }

    if (groups.length === 0) {
        return
    }

    // Replace the live list with the hydrated groups (newest first).
    Vue.set(app.app_state, 'live_gallery_groups', groups)
    Vue.set(app.app_state, 'last_gallery_group', groups[0])

    // Sync into any galleries that are already registered (e.g. the eagerly
    // mounted Homepage gallery). Galleries that mount later are covered by
    // registerGallery(), which replays live_gallery_groups on registration.
    const galleries = app.functions._registered_galleries || []
    for (const gallery of galleries) {
        for (const group of groups) {
            syncGalleryGroup(gallery, group, null)
        }
    }
}

export function registerGenerationBroadcast(app) {
    app.functions._generation_listeners = app.functions._generation_listeners || []
    app.functions._registered_galleries = app.functions._registered_galleries || []

    if (!app.app_state.live_gallery_groups) {
        Vue.set(app.app_state, 'live_gallery_groups', [])
    }

    app.functions.register_gallery = (gallery) => registerGallery(app, gallery)
    app.functions.unregister_gallery = (gallery) => unregisterGallery(app, gallery)
    app.functions.broadcast_gallery_group = (group, sourceGallery) => broadcastGalleryGroup(app, group, sourceGallery)

    app.functions.subscribe_generation = (listener) => {
        if (typeof listener === 'function') {
            app.functions._generation_listeners.push(listener)
        }
    }

    app.functions.on_generation_complete = (group) => {
        if (!hasDisplayableImage(group)) {
            return
        }
        broadcastGalleryGroup(app, group, null)
        if (typeof app.show_toast === 'function') {
            app.show_toast(app.app_state.isArabic
                ? 'اكتمل التوليد — الصورة في المعرض.'
                : 'Generation complete — your image is in the gallery.')
        }
        for (const listener of app.functions._generation_listeners) {
            try {
                listener(group)
            } catch (err) {
                console.warn('generation listener failed', err)
            }
        }
    }

    hydrateFromHistory(app)

    Vue.nextTick(() => {
        const txt2imgGallery = getTxt2ImgGallery(app)
        if (txt2imgGallery) {
            registerGallery(app, txt2imgGallery)
        }
    })
}