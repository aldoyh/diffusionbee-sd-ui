# Round 2 — Critic Report

**Role:** Critic — operational reality-check of the R1 tensions against the actual code.
**Session:** 2026-08-11 gallery & image action menu recon.

## Reality-check 1: the deep-ref plumbing (CRIT-2 from R1) — CONFIRMED fragile, but a fix exists in-repo

Verified in `PagesRouter.vue`:
```html
<div v-for="page_id in Object.keys(always_on_pages)" :key="page_id" ...>
    <component :app="app" :is="page_id" :ref="page_id"></component>
</div>
```
- Pages are rendered in a `v-for`, so `this.$refs[cur_page_id]` is an **array** — the `[0]` in `image_menu_functions.js:77` and `:116` is required, not paranoid. The page id comes from `router.current_open_page_id` (a data property).
- **The good news**: `generation_broadcast.js` already establishes the registry pattern (`app.functions._registered_galleries`, `register_gallery`, `unregister_gallery`, `getTxt2ImgGallery(app)`, `subscribe_generation`, `broadcast_gallery_group`, `on_generation_complete`). PagesRouter itself uses `getTxt2ImgGallery(app)` at `switch_page` (line 87-93).
- **The gap**: `use_params_current_page` and `generate_similar_images` do NOT use this registry — they reach through `router.$refs` directly. The app already has the mechanism to fix this: register an app-level action (e.g., `app.functions.use_params_in_current_page(params)` and `app.functions.generate_similar_images(params)`), wired by Txt2Img/Applet pages at mount, exactly like `send_to_img2img`/`send_to_outpaint`/`send_to_inpaint` are registered by their pages (`Img2Img.vue:22`, `Inpainting.vue:100`, `PostProcessImage.vue:34`).
- **Verdict**: R1 CRIT-2 is real and cheap to fix using the existing pattern. Menu functions should call `app.functions.*` exclusively (all 11 actions already do, EXCEPT the two that take params). This is the single highest-value engineering fix.

## Reality-check 2: delete/lifecycle (CRIT-3 + T5)

- `delete_group(group_id)` exists on GenerationGallery (line 198) and IS called by `SDManager.stop_all()` (SDManager.vue:328) to clear queued groups. It is NOT wired to any UI control.
- `clear_old_groups(n_to_keep)` (GenerationGallery:164) prunes old finished groups beyond `n_to_keep` (default 10) silently.
- `History.vue` group-level Delete → `deleteEntry(k)` → removes from `historyStore.entries` (persisted `history.json`).
- **Desync risk confirmed**: a group can exist in `historyStore` but be pruned from the live gallery, or vice versa (`SDManager.finish_current_job` writes to history via `app.functions.add_to_history`; gallery pruning is purely visual). Any new "delete from gallery" feature must decide whether it also deletes history + disk files. The app has no trash/recoverable-delete (unlike Midjourney's trash-with-restore).
- **Verdict**: per-image delete is feasible (component method exists; History delete pattern exists) but the history/files side-effect contract must be designed first. R1 T5 is the right tension.

## Reality-check 3: lightbox theming (CRIT-10) — confirmed

`utils.js` `ensure_lightbox_style()` injects hardcoded dark rgba colors (lines 130-180). theme.css defines a full light mode via `@media (prefers-color-scheme: light)` (theme.css:126+). The lightbox ignores it. Confirmed gap: if light mode is ever activated, the lightbox stays dark.

## Reality-check 4: `image_data` churn (CRIT-6) — confirmed as documented behavior

`GenerationGallery.update_group` → `Vue.set(this.groups, i, JSON.parse(JSON.stringify(new_group_data)))` — full deep copy + array-element replacement every progress tick. GalleryPane's watch is intentionally limited to `n_imgs`/`img_w`/`img_h` with a detailed comment (GalleryPane.vue:78-92). The `image_data_with_extra` computed re-runs every tick (dependency on `image_data`), but layout (`on_resize`) only fires on the narrowed watches + ResizeObserver. This is correct but subtle; a regression test or contract comment is warranted.

## Reality-check 5: imgbb size limit — actionable

imgbb free tier caps at 32 MB. Upscaler outputs (PostProcessImage allows up to 2048×2048, page line 94) can approach this. `upload_imgbb` (image_menu_functions.js:126) does no size pre-check; the upload just fails with a toast. Cheap fix: stat the file (IPC `save_file`-adjacent or `fetch` HEAD) before uploading and warn.

## New finding: `copy_params` strip-list drift (CRIT-9 refined)

`image_menu_functions.js:85-92` hardcodes `remove_keys` (generated_img, done_percentage, prompt_tokens, job_state, job_id, raw_form_options, negative_prompt_tokens, input_image_with_mask, model_tdict_path, controlnet_tdict_path, controlnet_inp_img_preprocesser_model_path, aux_output_img). Any future param that should not be copied must be added manually. Recommend deriving from the option schema or at minimum a comment with the source (BasicSDApplet option definitions).

## Priority ranking (updated after reality-check)

1. **Route menu actions through `app.functions` registry** (fixes the two deep-ref actions; pattern exists in-repo). Low effort, high robustness.
2. **Explicit group-context for the lightbox** (fixes `$parent` coupling + placeholder indexing). Medium effort.
3. **Design the delete contract** (gallery vs history vs disk; recoverable?). Feature-level decision, needs product input.
4. **Lightbox token theming** + imgbb size pre-check. Low effort polish.
5. **`copy_params` strip-list hygiene**. Trivial.
