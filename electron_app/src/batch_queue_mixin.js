// batch_queue_mixin.js
//
// Shared implementation of the "batch queue" feature for both surfaces that
// expose it: the Homepage quick-composer and the SDImageGenerationApplet
// form pages (Txt2Img / Img2Img / Inpainting). Previously each surface
// carried a near-identical copy of the polling/tracking state machine, which
// drifted (different item shapes, different persistence keys, one fixed bug
// not ported to the other). This mixin is the single source of truth for the
// mechanics; surfaces plug in three small hooks:
//
//   submitBatchItem(item, groupId)  — actually submit one item's job to the
//                                     SDManager (item shapes differ per page)
//   getBatchGallery()               — the GenerationGallery ref to poll
//   persistBatchQueue(queue)        — localStorage write for this surface
//
// Item states: pending → queued → running → done | error.

import { batchItemDone, batchItemHasError, groupIsInHistory } from "./batch_queue_store.js"
import { native_confirm } from "./native_functions_vue_bridge.js"
import { deleteEntry } from "./history_service.js"

export default {
    data() {
        return {
            batch_queue: [],
            is_batch_running: false,
            batch_poll_timer: null,
        };
    },

    computed: {
        batchPendingCount() {
            return this.batch_queue.filter(item => (item.state || 'pending') === 'pending').length;
        },
        batchHasActive() {
            return this.batch_queue.some(item => item.state === 'queued' || item.state === 'running');
        },
    },

    methods: {
        // Localized "n request(s)" label shared by the toasts.
        batchCountLabel(n) {
            const ar = !!(this.app && this.app.app_state && this.app.app_state.isArabic);
            if (ar) {
                return n === 1 ? 'طلب واحد' : (n <= 10 ? n + ' طلبات' : n + ' طلبًا');
            }
            return n === 1 ? '1 request' : n + ' requests';
        },

        // --- Run the collected requests sequentially ---
        runBatch() {
            if (this.is_batch_running) return;
            const items = this.batch_queue.filter(item => (item.state || 'pending') === 'pending');
            if (items.length === 0) return;

            // Guard: if the gallery ref is gone (user navigated away mid-run) the
            // SDManager cannot attach output groups, so abort cleanly instead of
            // submitting jobs that would be orphaned (and later mis-tracked).
            if (!this.getBatchGallery()) {
                if (this.app && this.app.show_toast) {
                    this.app.show_toast(this.app.app_state.isArabic
                        ? 'تعذر تشغيل الدفعة — ارجع إلى الصفحة ثم أعد المحاولة.'
                        : 'Cannot run batch — return to this page and try again.');
                }
                return;
            }

            this.is_batch_running = true;

            try {
                // The SDManager worker executes groups FIFO and waits for the
                // backend input gate between jobs, so requests run one at a time.
                // Each item gets its own group_id so the status poller can track
                // it to completion. State is set to 'queued' BEFORE submit so a
                // failure mid-loop can never leave an item as 'pending' (which
                // would re-submit it on the next run and double-generate).
                for (const item of items) {
                    const groupId = Math.random().toString();
                    item.group_id = groupId;
                    item.state = 'queued';
                    try {
                        this.submitBatchItem(item, groupId);
                    } catch (e) {
                        console.error('Batch submit failed for item', item.id, e);
                        item.state = 'error';
                    }
                }
            } finally {
                this.is_batch_running = false;
            }

            this.startBatchPolling();

            const n = items.length;
            if (this.app && this.app.show_toast) {
                this.app.show_toast(this.app.app_state.isArabic
                    ? ('تم إرسال ' + this.batchCountLabel(n) + ' إلى محرك التوليد — سيتم تنفيذها بالتسلسل.')
                    : (this.batchCountLabel(n) + ' submitted — running sequentially in the queue.'));
            }
        },

        removeFromBatch(id) {
            this.batch_queue = this.batch_queue.filter(item => item.id !== id);
        },

        clearBatch() {
            this.batch_queue = [];
            this.stopBatchPolling();
        },

        // --- Batch queue status tracking ---

        startBatchPolling() {
            if (this.batch_poll_timer) return;
            this.batch_poll_timer = setInterval(() => this.tickBatchQueue(), 600);
        },

        stopBatchPolling() {
            if (this.batch_poll_timer) {
                clearInterval(this.batch_poll_timer);
                this.batch_poll_timer = null;
            }
        },

        tickBatchQueue() {
            const manager = this.app && this.app.stable_diffusion_manager;
            const gallery = this.getBatchGallery();
            const items = this.batch_queue;
            if (!items || items.length === 0) {
                this.stopBatchPolling();
                return;
            }

            let active = 0;
            for (const item of items) {
                const state = item.state || 'pending';

                if (state === 'pending') {
                    // Re-attach an item that was already submitted before a
                    // remount/restart: if its gallery group is still alive we
                    // must not submit it again — just keep tracking it.
                    if (item.group_id && gallery && typeof gallery.get_group === 'function' && gallery.get_group(item.group_id)) {
                        item.state = 'queued';
                        active += 1;
                    }
                    continue;
                }

                if (state === 'queued' || state === 'running') {
                    const current = manager && manager.queue && manager.queue.current_group;
                    if (current && item.group_id && current.group_id === item.group_id && state !== 'running') {
                        item.state = 'running';
                    }

                    const groupAlive = !!item.group_id && !!gallery && typeof gallery.get_group === 'function' && !!gallery.get_group(item.group_id);
                    if (item.group_id && !groupAlive) {
                        // The gallery pruned this group (large batches). Fall back
                        // to the manager: if it's neither the current group nor
                        // still queued, check history for a positive completion
                        // record. Absence alone is NOT proof of completion — the
                        // group may never have materialized (e.g. submit failed).
                        const stillQueued = manager && manager.queue && manager.queue.groups_todo && manager.queue.groups_todo.some(g => g.group_id === item.group_id);
                        const isCurrent = current && item.group_id === current.group_id;
                        if (!stillQueued && !isCurrent) {
                            if (groupIsInHistory(this.app, item.group_id)) {
                                item.state = 'done';
                            } else {
                                // Neither the queue, the current group, nor
                                // history knows this group — treat as error
                                // rather than a false 'done'.
                                item.state = 'error';
                            }
                            continue;
                        }
                    }

                    if (item.group_id && batchItemHasError(gallery, item.group_id)) {
                        item.state = 'error';
                    } else if (item.group_id && batchItemDone(gallery, item.group_id)) {
                        item.state = 'done';
                    } else {
                        active += 1;
                    }
                }
            }

            if (active === 0) {
                this.stopBatchPolling();
                const allDone = items.length > 0 && items.every(it => (it.state || 'pending') === 'done' || (it.state || 'pending') === 'error');
                if (allDone && this.app && this.app.show_toast) {
                    this.app.show_toast(this.app.app_state.isArabic ? 'اكتملت الدفعة.' : 'Batch complete.');
                }
            }
        },

        // ── Gallery multi-select actions (Ctrl/Cmd+Click selection) ────────
        // The GenerationGallery emits these with its resolved selection; each
        // surface maps images to its own batch-item shape via the
        // `buildBatchItemFromImage` hook below.

        onGallerySelectionAction(action, images) {
            if (action === 'rerun') return this.batchSelectedImages(images);
            if (action === 'export') return this.exportSelectedImages(images);
            if (action === 'delete') return this.deleteSelectedImages(images);
            return null;
        },

        // Re-run selected images: snapshot each image's stored generation
        // params into the existing batch queue (the user then presses Run
        // Batch, and the FIFO SDManager executes them sequentially). Seeds are
        // preserved so a re-run reproduces the original generation.
        batchSelectedImages(images) {
            if (this.is_batch_running) {
                if (this.app && this.app.show_toast) {
                    this.app.show_toast(this.app.app_state.isArabic
                        ? 'انتظر حتى تنتهي الدفعة الحالية قبل إضافة المزيد.'
                        : 'Wait for the current batch to finish before adding more.');
                }
                return 0;
            }
            if (!this.getBatchGallery()) {
                if (this.app && this.app.show_toast) {
                    this.app.show_toast(this.app.app_state.isArabic
                        ? 'تعذر إضافة الصور إلى الدفعة — ارجع إلى الصفحة ثم أعد المحاولة.'
                        : 'Cannot add images to batch — return to this page and try again.');
                }
                return 0;
            }

            let added = 0;
            let skipped = 0;
            for (const img of (images || [])) {
                if (!img || !img.params || img.image_url === 'ERROR') {
                    skipped += 1;
                    continue;
                }
                const item = this.buildBatchItemFromImage(img);
                if (!item) {
                    skipped += 1;
                    continue;
                }
                this.batch_queue.push(item);
                added += 1;
            }

            if (this.app && this.app.show_toast) {
                const ar = !!this.app.app_state.isArabic;
                let msg;
                if (added > 0 && skipped > 0) {
                    msg = ar
                        ? ('أُضيف ' + this.batchCountLabel(added) + ' إلى الدفعة (' + skipped + ' بدون معاملات). اضغط "تشغيل الدفعة" للتوليد بالتسلسل.')
                        : (this.batchCountLabel(added) + ' added to batch (' + skipped + ' without params). Press "Run Batch" to generate sequentially.');
                } else if (added > 0) {
                    msg = ar
                        ? ('أُضيف ' + this.batchCountLabel(added) + ' إلى الدفعة. اضغط "تشغيل الدفعة" للتوليد بالتسلسل.')
                        : (this.batchCountLabel(added) + ' added to batch. Press "Run Batch" to generate sequentially.');
                } else {
                    msg = ar
                        ? 'لا توجد صور قابلة لإعادة التوليد في هذا التحديد.'
                        : 'None of the selected images can be re-run on this page.';
                }
                this.app.show_toast(msg);
            }
            return added;
        },

        // Batch export: pick a destination folder once, then copy each
        // selected image there with a readable "<prompt>_<seed>" name.
        exportSelectedImages(images) {
            const valid = (images || []).filter(im => im && im.image_url && im.image_url !== 'ERROR');
            if (valid.length === 0) return 0;

            const folder = window.ipcRenderer.sendSync('file_dialog', 'folder');
            if (!folder || folder === 'NULL') return 0;

            const baseDir = String(folder).replace(/[\\/]+$/, '');
            let exported = 0;
            for (const img of valid) {
                const org = String(img.image_url || '').replace(/^file:\/\//, '');
                if (!org) continue;
                const params = img.params || {};
                const seed = params.seed;
                let base = String(img.description || params.prompt || 'Image')
                    .substring(0, 80)
                    .replace(/[\\/:*?"<>|\r\n]+/g, '_')
                    .trim() || 'Image';
                const extMatch = /\.(\w+)$/.exec(org);
                const ext = extMatch ? extMatch[1] : 'png';
                let dest = baseDir + '/' + base + (seed !== undefined ? '_' + seed : '') + '.' + ext;
                let n = 2;
                while (window.ipcRenderer.sendSync('file_exists', dest)) {
                    dest = baseDir + '/' + base + (seed !== undefined ? '_' + seed : '') + '_' + n + '.' + ext;
                    n += 1;
                }
                window.ipcRenderer.sendSync('save_file', org + '||' + dest);
                exported += 1;
            }

            if (exported > 0 && this.app && this.app.show_toast) {
                const ar = !!this.app.app_state.isArabic;
                this.app.show_toast(ar
                    ? ('تم تصدير ' + exported + ' صورة إلى ' + baseDir)
                    : ('Exported ' + exported + ' image(s) to ' + baseDir));
            }
            return exported;
        },

        // Batch delete: remove from the live gallery groups and from the
        // history manifest when a whole group empties. Disk files stay in
        // place (matches the History page's manifest-only delete semantics).
        deleteSelectedImages(images) {
            const gallery = this.getBatchGallery();
            if (!gallery || typeof gallery.remove_images !== 'function') return 0;
            const keys = (images || []).map(im => im && im.image_key).filter(Boolean);
            if (keys.length === 0) return 0;

            // Images in groups that are still generating cannot be removed
            // yet — the running job addresses slots by index. Ask with the
            // count that will actually be deleted so the confirm is honest.
            const removable = (typeof gallery.count_removable === 'function')
                ? gallery.count_removable(keys)
                : keys.length;
            if (removable === 0) {
                if (this.app && this.app.show_toast) {
                    this.app.show_toast(this.app.app_state && this.app.app_state.isArabic
                        ? 'لا يمكن حذف الصور المحددة الآن — لا تزال قيد التوليد.'
                        : 'The selected images are still generating — wait for them to finish before deleting.');
                }
                return 0;
            }

            const ar = !!(this.app && this.app.app_state && this.app.app_state.isArabic);
            const confirmMsg = removable < keys.length
                ? (ar
                    ? ('حذف ' + removable + ' من أصل ' + keys.length + ' صورة من المعرض والسجل؟ ستبقى الملفات على القرص.')
                    : ('Delete ' + removable + ' of ' + keys.length + ' image(s) from the gallery and history? Files stay on disk.'))
                : (ar
                    ? ('حذف ' + removable + ' صورة من المعرض والسجل؟ ستبقى الملفات على القرص.')
                    : ('Delete ' + removable + ' image(s) from the gallery and history? Files stay on disk.'));
            const confirmed = native_confirm(confirmMsg);
            if (!confirmed) return 0;

            const result = gallery.remove_images(keys);
            for (const gid of (result.emptyGroupIds || [])) {
                try {
                    deleteEntry(gid);
                } catch (e) {
                    console.error('Batch delete: failed to remove history entry', gid, e);
                }
            }

            const deleted = (result.removed || []).length;
            const skipped = keys.length - deleted;
            if (this.app && this.app.show_toast) {
                let msg;
                if (deleted > 0 && skipped > 0) {
                    msg = ar
                        ? ('حُذفت ' + deleted + ' صورة (' + skipped + ' قيد التوليد).')
                        : ('Deleted ' + deleted + ' image(s) (' + skipped + ' still generating).');
                } else if (deleted > 0) {
                    msg = ar ? ('حُذفت ' + deleted + ' صورة.') : ('Deleted ' + deleted + ' image(s).');
                } else {
                msg = ar
                    ? 'لم يُحذف شيء — الصور المحددة قيد التوليد.'
                    : 'Nothing deleted — the selected images are still generating.';
                }
                this.app.show_toast(msg);
            }
            return deleted;
        },

        stateLabel(state) {
            const ar = !!(this.app && this.app.app_state && this.app.app_state.isArabic);
            switch (state) {
                case 'queued': return ar ? 'في الانتظار' : 'Queued';
                case 'running': return ar ? '⏳ توليد' : '⏳ Generating';
                case 'done': return ar ? '✓ تم' : '✓ Done';
                case 'error': return ar ? '⚠ خطأ' : '⚠ Error';
                default: return ar ? 'معلق' : 'Pending';
            }
        },

        // Hooks overridden per surface:

        // eslint-disable-next-line no-unused-vars
        submitBatchItem(item, groupId) {
            throw new Error('submitBatchItem must be implemented by the batch mixin consumer');
        },

        // Builds a batch item from a selected gallery image's stored params.
        // Item shape differs per surface (Homepage snapshots the quick
        // composer; applet forms snapshot gen_options), so surfaces override
        // this. Returning null skips the image (e.g. missing params).
        // eslint-disable-next-line no-unused-vars
        buildBatchItemFromImage(image) {
            throw new Error('buildBatchItemFromImage must be implemented by the batch mixin consumer');
        },

        getBatchGallery() {
            return null;
        },

        // eslint-disable-next-line no-unused-vars
        persistBatchQueue(queue) {
            // no-op by default; surfaces wire their localStorage key here
        },
    },

    watch: {
        batch_queue: {
            handler: function () {
                this.persistBatchQueue(this.batch_queue);
            },
            deep: true,
        },
    },
};
