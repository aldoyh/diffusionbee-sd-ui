# Context Brief — Gallery & Image Action Menu Recon (2026-08-11)

## Session

- **Topic**: The generation gallery + per-image action menu — the component stack `GenerationGallery → GalleryPane → GalleryImage`, the sectioned dropdown built by `image_menu_functions.js`, and the in-app lightbox in `utils.js`. Everything a user touches after "Generate".
- **Mode**: Explore (divergent) — **Autonomous** (no check-ins; deliver finished recon).
- **Output dir**: `recon/2026-08-11-gallery-action-menu/`
- **Final document**: `recon/2026-08-11-gallery-action-menu.md` (Synthesizer writes it in final round).
- **Session start**: 2026-08-11. Prior art: `recon/2026-08-04-app-ui-polish-batch-queue.md`, `recon/2026-08-02-app-ui-models-onboarding.md`, `recon/2026-07-31-app-ui-onboarding.md`.

## Project

DiffusionBee fork (owner: aldoyh; upstream: divamgupta/diffusionbee-stable-diffusion-ui). Stable Diffusion GUI for macOS (DMG) + Windows (NSIS). Vue 2.7 Electron renderer spawning a Python (TensorFlow) backend over stdin/stdout JSON. App ID `net.aldoy.diffusion-sd-ui`, v2.4.x. Arabic/RTL i18n (Tajawal) is a fork differentiator. Design tokens in `electron_app/src/assets/css/theme.css` + `docs/design_system.md`.

**IMPORTANT — working tree state**: a gallery redesign is UNCOMMITTED (in-progress). `git status` shows modified: `GenerationGallery.vue`, `GalleryImage.vue`, `GalleryPane.vue`, `image_menu_functions.js`, `History.vue`, `utils.js`, `init_vue_libs.js`, `App.vue`, etc. This recon is about THAT work — the redesigned gallery tiles + sectioned action menu + in-app lightbox. Verify claims against the working tree, not git HEAD.

## The gallery stack (working tree, verified)

### Data flow
- **`SDImageGenerationApplet.vue:50`** — `<GenerationGallery :app="app" ref="gallery">` (full menu, no skips).
- **`Homepage.vue:352`** — `<GenerationGallery :n_to_keep="10" :menu_items_skip="['use_params_current_page']" :compact="true" :fixed_col_size="280">` — compact carousel mode (flex row, scroll-snap, 280px tiles).
- **`PostProcessImage.vue:17`** — skips `use_params_current_page`, `n_to_keep=2`.
- **`History.vue`** — uses `GalleryPane` directly (not GenerationGallery), builds its own `menu_items` via `build_image_menu_items(['use_params_current_page'], isArabic)`, `always_fixed_col_size=300`.
- Groups arrive via `update_group(group)` (unshift + prune beyond `n_to_keep`); `image_data` array is replaced with a NEW reference on every progress tick (hence GalleryPane's watch is scoped to `n_imgs`/`img_w`/`img_h` only — ResizeObserver handles size).

### GalleryImage.vue (the tile)
- Rounded tile (`--radius-lg`), `box-shadow` on hover, `isolation: isolate` on `.gal_media` so the zooming `<img>` (transform = own stacking context) can never paint above the actions button.
- `.gal_main_img` hover zoom `scale(1.05)`, 350ms cubic-bezier; neutralizes global `theme.css` pane-level hover rules.
- Caption overlay: 2-line `-webkit-line-clamp`, gradient, `pointer-events: none` (click passes through to image → lightbox).
- Aux (controlnet) preview: top-left 30%, fades to 0.15 on tile hover, `pointer-events: none`.
- Pending slot: `aspect-ratio` placeholder + flicker animation; done_percentage → `CircleProgress`.
- **Actions button**: 32px circle, `rgba(16,16,16,.78)` bg, ellipsis-v icon, top-right, `z-index:10`, always visible. **Deliberately NO backdrop-filter** — Chromium/Electron drops backdrop-filter elements from paint while a sibling runs a transform animation (button vanished during hover zoom).
- Dropdown: `boundary="viewport"`, `right`, sections rendered via `b-dropdown-header`/`b-dropdown-item-button`/`b-dropdown-divider`, icons + text per item, RTL mirrored (`[dir="rtl"]` rules), `max-height: min(420px, 70vh)` scroll.

### image_menu_functions.js (the menu contract)
11 actions: `preview_image`, `save_image`, `upload_imgbb` (async, needs imgbb API key in settings), `send_img_2_img`, `send_outpaint`, `send_inpaint`, `send_img_2_img_with_params`, `use_params_current_page` (Txt2Img only), `copy_params`, `send_to_postprocess`, `generate_similar_images` (Txt2Img-only guard + toast).
- `MENU_GROUPS`: **Preview & Export** (preview/save/upload_imgbb) · **Send To** (img2img/outpaint/inpaint/img2img+params/upscaler) · **Parameters** (use params/copy params/similar images).
- `MENU_ICONS` per action; `MENU_TEXT_AR` Arabic labels; `build_image_menu_items(skip, isArabic)` filters by skip + locale.
- Menu is built reactively in `GenerationGallery.computed.menu_items` (re-evaluates when `isArabic` flips); `History.vue` duplicates the same computed.

### utils.js open_popup (the lightbox)
- In-app full-screen lightbox (plain DOM, not Vue): zoom (cursor-anchored wheel/+/−), pan (drag), prev/next across group (←/→, RTL-flipped), `0` reset, Open-in-default-viewer + Save for local files, Esc/backdrop close, full Arabic strings, `z-index: 2147483000`.
- `gallery_item_context(image_item_data)` walks `$parent.image_data` to build the group list for prev/next. **Fragile coupling**: it depends on GalleryImage's parent being a GalleryPane with `image_data`.

## Known issues / open seams (seed tensions for agents)

1. **`image_data` identity churn**: `update_group` replaces the array reference every progress tick; GalleryPane's watch was deliberately narrowed to avoid re-layout jank — but this is subtle and easy to regress.
2. **Fragile group-nav coupling**: `gallery_item_context` reaches into `$parent.image_data`; placeholder slots (`job_id: 'placeholder-i'`) are filtered by `image_url && !== 'ERROR'` — group nav across mixed done/pending groups could mis-index.
3. **Menu contract duplication**: `GenerationGallery` and `History` each build `menu_items`; `menu_items_skip` is ad-hoc (array of ids) — no single source of truth beyond `build_image_menu_items`.
4. **`use_params_current_page`** reaches into `app.$refs.router.$refs[cur_page_id][0].$refs.sd_applet.load_options` — deep ref plumbing, breaks on any page-structure change.
5. **Arabic**: labels are per-action; group labels bilingual via `label_ar`; lightbox reads `document.documentElement.lang` (non-reactive, but menu_items reference re-triggers the computed).
6. **Actions button affordance**: always-visible ellipsis on every tile = visual noise vs discoverability; no hover-reveal; no keyboard shortcut; `b-dropdown` focus management untested.
7. **Placeholder slots** in History (`always_fixed_col_size=300`) vs Homepage carousel (280) vs applet (auto) — three layout modes with different placeholder aspect handling.
8. **Dropdown clipping**: `boundary="viewport"` used; deep-scoped `>>>` selectors fight Bootstrap 5 `.dropdown-menu` (a prior recon fixed the same class conflict in ModelSelector with `display: block`).
9. **GalleryPane.on_resize** is imperative DOM math (grid-template strings built by hand, `getElementById` by random id) — legacy, jank-prone, tested only by eyeball.
10. **Homepage carousel** mode (`--compact`) reuses the same GalleryPane in a horizontal snap container — `n_row_max`/aspect math may not apply.

## Primary web sources (Explorer: fetch directly, no secondary coverage)

- https://getbootstrap.com/docs/5.3/components/dropdowns/ (b-dropdown / .dropdown-menu mechanics — clipping, boundary, focus)
- https://bootstrap-vue.org/docs/components/dropdown (b-dropdown API: right, boundary, toggle-class, deep-scope gotchas)
- https://v2.vuejs.org/v2/guide/reactivity.html (Vue 2 reactivity: array replacement, computed deps — menu_items rebuild, image_data churn)
- https://developer.mozilla.org/en-US/docs/Web/CSS/isolation and CSS transform stacking contexts (the zoom/button stacking fix)
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter (Chromium paint-bug context: element dropped during sibling transform)
- Competitor galleries for UX comparison: Stable Diffusion WebUI (A1111) image browser, ComfyUI, InvokeAI gallery, Midjourney web gallery, Krita AI Diffusion — action-menu patterns, hover affordances, multi-select.

## Round plan

- **R1**: 4 agents in parallel, wide net. Explorer (web: dropdown mechanics, gallery UX patterns, lightbox patterns); Associator (vault: connect gallery to other subsystems — SDManager, history, batch queue, uploads, settings); Critic (stress-test the working-tree redesign: the seams above); Synthesizer (refine themes, tensions).
- **R2**: deepen — Explorer reality-checks + fills Critic/Synthesizer gaps; others build on settled claims.
- **Final**: Synthesizer writes `recon/2026-08-11-gallery-action-menu.md` (Explore format: The Territory, competing framings, Tensions, Open Questions, Process Log).

## Rules for agents

- **Read-only on app code. Write ONLY your assigned report file** in `recon/2026-08-11-gallery-action-menu/`.
- Targeted reads (grep + line ranges); don't dump >500-line files unless essential.
- Cite repo file paths (with line numbers where possible); footnote web URLs.
- Match repo vocabulary (applet, b2py, sdbk, group_id, tdict, GalleryPane, menu_items_skip, isArabic).
- The working tree is the ground truth — run `git diff` on the gallery files if needed to see what changed vs HEAD.
