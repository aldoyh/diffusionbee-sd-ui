# Round 2 — Associator Report

**Role:** Associator — connect R1 findings: batch queue ↔ gallery selection, settings deep-linking, power-user patterns.
**Session:** 2026-08-11 gallery & image action menu recon.

## Connection A: The batch queue system and gallery selection are disjoint — and that's the opportunity

Verified (working tree + prior recon 08-04):
- `batch_queue_mixin.js` + `batch_queue_store.js` power batch panels on **Homepage** (`Homepage.vue` "📋 Add to batch / ▶ Run Batch (n) / 🗑 clear") and **Applet pages** (`SDImageGenerationApplet.vue`).
- Batch items are **prompts/params**, not images: `Add to batch` captures the current form state; `runBatch` submits each via `SDManager.add_job(gen_options, raw_form_options, gallery, group_id)`.
- Status is poll-based (`tickBatchQueue`, 600 ms) inspecting `manager.queue.current_group`, gallery `get_group()`, and `groupIsInHistory`.
- Persistence keeps only `pending` items (queued/running lost on restart — by design).

**The seam**: a user staring at a gallery of 12 generated images has **no way to act on them as a set** — no select-all, no "re-run these prompts," no "export all," no "send all to upscaler." The batch machinery (FIFO SDManager queue, group_id tracking, poll status) already exists — it's just wired to the form, not the gallery. **The natural R3 feature**: gallery multi-select feeding either (a) the existing batch panel as "Add selected images' params to batch", or (b) a new per-selection action bar (batch download/delete/upscale). The plumbing (SDManager FIFO, group_id) is already batch-shaped.

## Connection B: Settings deep-linking for imgbb

`Settings.vue:27-87` has the imgbb API key field bound to `app_state.app_data.settings.imgbb_api_key`. The `upload_imgbb` action toasts "Please add an imgbb API key in Settings first" when absent (image_menu_functions.js:133-134) — but gives no button to jump there. `app.functions.switch_page('Settings')` is already the app-wide page-switcher (PagesRouter registers it; MainToolbar uses it). **Trivial, high-value**: add a "Go to Settings" action to the toast (or a two-line action: `switch_page('Settings')`).

## Connection C: `copy_params` → paste-into-settings/prompt workflows

`copy_params` strips the internal keys and copies pretty JSON. Competitors copy **prompt text** and **seed** with one click (A1111 send-to buttons; ComfyUI-Gallery per-value copy). The app already has `form_params_to_readable_dict` / `form_params_to_text` in utils.js (used by History's `get_box_params_str`). A "Copy prompt" action (just `params.prompt` to clipboard) is one line and matches muscle memory better than copying the whole JSON.

## Connection D: The `app.functions` registry is the convergence point

Every subsystem registers on `app.functions`:
- `switch_page` (PagesRouter:61)
- `register_gallery` / `unregister_gallery` / `broadcast_gallery_group` / `subscribe_generation` / `on_generation_complete` (generation_broadcast.js:150-160)
- `send_to_img2img` / `send_to_outpaint` / `send_to_inpaint` / `send_to_postprocess` (page mounts)
- `add_to_history` (history_service.js:74, History.vue:114)
- `getTxt2ImgGallery` (generation_broadcast.js — pure helper)

The two menu actions that bypass it (`use_params_current_page`, `generate_similar_images`) are the outliers. **All future menu actions should be registered functions.** This is the architectural spine the R2 Critic identified — Associator agrees: it's not just a fix, it's the pattern that makes future features (batch-from-selection, delete, share) pluggable.

## Connection E: delete semantics across stores

`deleteEntry(k)` (history_service.js:60) removes from historyStore only — disk files in `~/.diffusionbee/images/` are untouched (likely intentional: history is a manifest; files persist). `SDManager.stop_all()` calls `gallery.delete_group` (visual only). Any per-image delete must pick a contract: (a) remove from history manifest only, (b) move files to a trash dir, (c) delete files. Midjourney's trash-with-restore is the pattern if (b). Note `History.vue` already offers group-level Delete with a native confirm — per-image delete in the gallery should reuse the same confirmation + store semantics.

## Sources
- https://icons8.com/blog/articles/the-ux-dilemma-hotkeys-vs-context-menus/ — dual access, shortcut discoverability
- https://github.com/PanicTitan/ComfyUI-Gallery — Ctrl/Cmd+Click multi-select, batch ops
- https://docs.midjourney.com/hc/en-us/articles/33329462451469-Organizing-Your-Creations — trash/restore pattern
