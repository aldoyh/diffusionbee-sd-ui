# Round 1 — Associator Report

**Role:** Associator — connect the gallery/menu to the rest of the app and to industry patterns.
**Session:** 2026-08-11 gallery & image action menu recon.

## 1. Competitor per-image action menu organization (web)

- **Single ellipsis dropdown vs visible buttons vs right-click**: mature tools mix these — Midjourney web uses quick action icons (Upscale, Variation, Download) PLUS a "More actions" (…) dropdown; A1111 exposes flat icon button rows; InvokeAI uses hover-reveal floating toolbar; ComfyUI leans right-click + floating preview. No tool uses a single crowded dropdown as the ONLY access path.
- **Grouping by intent**: export/save + destructive separated from send-to-other-modes; parameters/metadata (copy prompt/seed) usually get their own cluster or a metadata viewer (InvokeAI). The working tree's three groups (Preview & Export / Send To / Parameters) map cleanly onto this — **the grouping is defensible**; the gap is that everything sits behind one ellipsis with no direct-action escape hatch.
- **Right-click context menus**: best practice is dual-access — never lock functionality exclusively behind right-click (touch/a11y); 5–7 verb-first items, destructive separated at the bottom, inline shortcut hints. The current menu has 11 items across 3 groups — near the upper bound; destructive actions don't exist yet (no delete in menu!).
- **Multi-select/batch**: critical, non-negotiable for power users (ComfyUI-Gallery, Eleken bulk UX). Current app has **zero** batch image ops — single-image actions only.

## 2. imgbb integration (web + vault)

- **API facts**: endpoint `https://api.imgbb.com/1/upload`, POST preferred, API key required (query param or form field), free tier 32 MB per image, rate limits on free tier (batch uploads need throttling), response returns `data.url` (direct image URL) + `delete_url`.
- **Vault wiring** (verified): `utils/imgbb_upload.js` — `IMGBB_ENDPOINT`, `uploadToImgbb(apiKey)`, `getImgbbApiKey(app)` reads `app_state.app_data.settings.imgbb_api_key`; `Settings.vue:27-87` has the API key field; `image_menu_functions.js:126-156` `upload_imgbb` action: missing key → toast (Arabic-aware), success → copy URL to clipboard + toast.
- **UX seams**: entry point is inside the menu only (no toolbar share button); no upload progress state; no failure retry; key gating is a one-time toast (good) but no deep-link into Settings; 32 MB free-tier limit means generated images (usually <10 MB) are fine, but upscaler outputs can approach it — no size pre-check.
- **Alignment with patterns**: the "copy URL to clipboard + toast" flow matches desktop app conventions (Dropzone imgbb action). Missing: drag-and-drop zone, progress indicator, expiration options (not relevant for this app).

## 3. Keyboard shortcuts / power-user patterns (web)

- Navigation: arrows/vim keys over grid; Enter/Space to inspect; Cmd/Ctrl+C copy prompt; F favorite; Delete with confirmation.
- Discoverability: shortcuts inline in menu labels; cheat-sheet overlay; remapping.
- **Vault reality check**: the lightbox already has a strong keyboard set (Esc, ←/→ RTL-aware, +/−, 0). The gallery itself has **zero** keyboard shortcuts and **no right-click menu**. The ellipsis button is the sole access path to 11 actions.
- **Delete is missing entirely** from the per-image menu (History has a group-level Delete button; gallery has no per-image or per-group delete). A1111 and Midjourney both treat delete as core.

## 4. Vault subsystem connections (seams & reuse)

| Subsystem | Connection | Seam / risk |
|---|---|---|
| `history_service.js` (historyStore) | History.vue gallery renders persisted groups; `add_to_history` via SDManager | History builds its own `menu_items` computed — duplicates GenerationGallery's |
| `batch_queue_store.js` / `batch_queue_mixin.js` | Batch panel lives on Homepage/Applet, not per-image | Batch ops operate on queued prompts, not gallery selections — no link between selected images and batch |
| `SDManager.vue` | Group lifecycle (`current_group`, `finish_current_job → add_to_history`) | Gallery group pruning (`clear_old_groups`) can drop groups the menu/batch still reference |
| `Settings.vue` imgbb key | `upload_imgbb` action reads it | No deep-link from menu → Settings when key missing |
| `generation_broadcast.js` | `register_gallery`/`unregister_gallery`; PagesRouter registers Txt2Img gallery | `use_params_current_page` + `generate_similar_images` reach into `router.$refs["Txt2Img"][0].$refs.sd_applet` — deep ref plumbing that breaks on page-structure change; `generate_similar_images` also has `applet_name != "txt2img"` guard but Txt2Img page id is hardcoded |
| `show_toast` (App.vue:493) | All menu feedback paths | Toast pattern is consistent + bilingual — good foundation |
| `open_popup` lightbox (utils.js) | Clicking image + `preview_image` menu item both open it | `gallery_item_context` walks `$parent.image_data` — fragile if GalleryImage is ever re-parented |

## 5. Synthesis for Round 2

1. The 3-group menu structure matches industry intent-grouping, but **a single ellipsis as the only access path** diverges from mature tools that pair quick icons with a "more" menu.
2. **Missing power-user features**: per-image delete, multi-select/batch, right-click menu, keyboard shortcuts, metadata viewer — all standard in competitors.
3. **`use_params_current_page` / `generate_similar_images` deep-ref plumbing** into `router.$refs["Txt2Img"]` is the most fragile connection — worth an event-bus/registry refactor.
4. imgbb path is well-wired; the gap is entry-point discoverability + size pre-check + progress feedback.
5. History.vue and GenerationGallery duplicate the menu-building computed — a shared mixin or a single `menu_items` provider (e.g., app-level) would remove drift.

## Sources
- https://icons8.com/blog/articles/the-ux-dilemma-hotkeys-vs-context-menus/ — hotkeys vs context menus, dual access
- https://www.eleken.co/blog-posts/bulk-actions-ux — bulk action UX, sticky action bars
- https://uxdesign.cc/the-bulk-experience-7fcca8080f82 — multi-select trade-offs
- https://github.com/PanicTitan/ComfyUI-Gallery — real gallery with Ctrl/Cmd+Click multi-select + batch zip
- https://api.imgbb.com/ — imgbb API docs (endpoint, key, limits)
- https://aptonic.com/blog/imgbb-action-released-for-dropzone-4 — desktop imgbb UX pattern
