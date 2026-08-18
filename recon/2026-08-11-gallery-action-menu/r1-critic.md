# Round 1 — Critic Report

**Role:** Critic — stress-test the working-tree gallery redesign + menu against the vault seams.
**Session:** 2026-08-11 gallery & image action menu recon.

## What was verified in the working tree

- `GalleryImage.vue` (410-line rewrite vs HEAD): rounded tile, `.gal_media` clip layer with `isolation: isolate`, hover zoom `scale(1.05)`, caption clamp, always-visible ellipsis toggle, sectioned dropdown with `boundary="viewport"`, RTL mirrors, `max-height: min(420px, 70vh)`.
- `image_menu_functions.js`: 11 actions, `MENU_GROUPS` (Preview & Export / Send To / Parameters), `MENU_ICONS`, `MENU_TEXT_AR`, `build_image_menu_items(skip, isArabic)`.
- `GenerationGallery.vue` + `History.vue`: `menu_items` moved from `data()` to a reactive computed calling `build_image_menu_items`.
- `utils.js`: `open_popup` now an in-app lightbox with zoom/pan/prev-next/save/open, RTL-aware, `gallery_item_context` walking `$parent.image_data`.

## Stress tests (ordered by severity)

### CRIT-1. `gallery_item_context` couples the lightbox to GalleryImage's exact parent
`utils.js:195-199` reads `image_item_data.$parent.image_data`. Any re-parenting (e.g., a future wrapper for selection checkboxes, or rendering GalleryImage inside a transition group) silently breaks prev/next. The coupling is implicit and undocumented in the component contract. **Recommendation**: pass the group's image list explicitly (prop or context), or emit an event with the group payload.

### CRIT-2. Menu click handlers assume stable deep refs
`image_menu_functions.js:77` (`use_params_current_page`): `app.$refs.router.$refs[cur_page_id][0].$refs.sd_applet.load_options(...)`. `generate_similar_images` (line 116) hardcodes `router.$refs["Txt2Img"][0]`. Both break if page structure changes (PagesRouter refactor, lazy-load changes, page id rename). The `[0]` index is especially fragile — it depends on `$refs` returning an array for the current page. **Recommendation**: expose `app.functions.load_options_into_current_page(params)` / `app.functions.generate_similar_images(params)` from a stable owner (e.g., `App.vue` or `generation_broadcast.js`), so menu functions stop reaching into router internals.

### CRIT-3. No per-image delete; destructive actions absent from the menu
11 actions, zero destructive. History has group-level Delete; the generation gallery has no way to remove a bad image or a whole group (`delete_group` exists on the component but no UI calls it). Power-user expectations (A1111, Midjourney) put delete/save/archive in reach. Also `clear_old_groups` silently prunes groups beyond `n_to_keep` — images vanish with no user control over which groups survive.

### CRIT-4. `menu_items` computed duplication between GenerationGallery and History
Both recompute `build_image_menu_items(skip, isArabic)`. Drift risk: `menu_items_skip` differs (`['use_params_current_page']` on Homepage/PostProcess/History; full menu on Applet Txt2Img). If a third consumer appears (e.g., a future ModelStore sample gallery or a standalone lightbox action bar), the pattern will duplicate again. **Recommendation**: a single shared mixin or app-level computed; skip-lists could become a per-page declaration.

### CRIT-5. Placeholder slots + group nav indexing
`GalleryPane.image_data_with_extra` synthesizes `{job_id: 'placeholder-i'}` slots; `gallery_item_context` filters `image_url && !== 'ERROR'`. During generation, a group can contain done images + pending placeholders — prev/next skips placeholders (fine) but the counter (`1 / N`) is computed against the filtered list, so it can disagree with the visible grid position. Minor, but the mismatch is user-visible.

### CRIT-6. `image_data` identity churn + narrowed watches (regression risk)
`GenerationGallery.update_group` does `Vue.set(this.groups, i, JSON.parse(JSON.stringify(new_group_data)))` on every progress tick — new array reference every tick. GalleryPane deliberately watches only `n_imgs/img_w/img_h` (comment at lines 81-89) to avoid re-layout jank. This is a subtle correctness/performance balance: any future "watch image_data for re-render" temptation will reintroduce the jank; conversely, if `n_imgs` stops updating on partial progress the layout freezes. Needs a regression test or at least a comment-backed contract.

### CRIT-7. Dropdown deep-scope CSS vs Bootstrap `.dropdown-menu` base rule
Prior recon (08-04) found Bootstrap's `.dropdown-menu { display: none }` breaking ModelSelector (custom `v-if` without `.show`). Here b-dropdown DOES manage `.show` via its own JS, so the risk is lower — but the `>>>` overrides in `GalleryImage.vue` (`.gal_actions >>> .dropdown-menu`) fight theme.css's own `.dropdown-menu` overrides (theme.css:962/1531/1977). Two sources restyling the same class; specificity battles are only a matter of time. `boundary="viewport"` mitigates clipping but the CSS collision remains a maintenance hazard.

### CRIT-8. The actions toggle: always-visible vs hover-reveal, and touch
Always-visible ellipsis on every tile = visual noise in a dense grid (the gallery can show 6-10+ tiles). Industry pattern is hover-reveal for secondary actions. BUT: hover-reveal hurts discoverability and fails on touch — and this app is macOS/Windows desktop (mouse-first), so hover-reveal is viable with a persistent focus/selection fallback. The current choice (always visible) is defensible for discoverability but should be explicitly weighed.

### CRIT-9. `use_params_current_page` on non-Txt2Img pages is hidden but reachable states remain
`send_img_2_img_with_params` passes raw params to Img2Img; `generate_similar_images` guards `applet_name != "txt2img"`. The guards are toast-based (bilingual) — fine. But `copy_params` strips a hardcoded `remove_keys` list (utils-adjacent, `image_menu_functions.js:85-92`): any new param added to generation options that should be excluded will leak into the clipboard JSON silently. **Recommendation**: derive the strip list from the option schema, or at least document it.

### CRIT-10. Lightbox is plain DOM with injected CSS — escapes Vue's theming
`ensure_lightbox_style` injects a `<style>` block with hardcoded rgba colors (utils.js:130-180), not CSS variables. It will NOT follow the app's light/dark theme tokens (theme.css defines both; the app has a `prefers-color-scheme` light mode). The lightbox is permanently dark — a real theming gap, though it matches the current dark-only app shell.

### CRIT-11. `boundary="viewport"` + `max-height` scroll: keyboard/focus management untested
`b-dropdown` with `boundary="viewport"` and an internal scroll area (max-height 70vh) — arrow-key navigation within the menu, focus-return to the toggle after selection, and Esc handling are unverified. BootstrapVue 2 generally handles this, but the deep-scoped item buttons (`b-dropdown-item-button`) + FontAwesome icons should be sanity-checked for a11y (aria-expanded on toggle is present via sr-only text).

## What's solid

- `isolation: isolate` + `overflow: hidden` clip-layer approach for the hover zoom is correct and matches the Explorer's CSS findings.
- No backdrop-filter on the toggle matches known Chromium paint-drop behavior (issue 40175472) — the code comment documents this well.
- RTL support is thorough (menu labels, group labels, dropdown alignment, lightbox arrows/caption).
- Reactive `menu_items` computed is a clean improvement over the old non-reactive `data()` build.

## Priorities for R2

1. Deep-ref plumbing (CRIT-2) — highest fragility.
2. Lightbox ↔ gallery coupling (CRIT-1) + placeholder indexing (CRIT-5).
3. Missing destructive/multi-select capabilities (CRIT-3) vs menu already at 11 items (Associator: 5–7 ideal).
4. CSS class collision hygiene (CRIT-7) + lightbox theming (CRIT-10).
5. `image_data` churn contract (CRIT-6).
