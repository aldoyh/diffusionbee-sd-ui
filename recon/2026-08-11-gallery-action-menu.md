---
title: "DiffusionBee — Gallery & Image Action Menu: Structure Right, Access Poor"
date: 2026-08-11
status: wrapped
type: recon
mode: explore (autonomous)
topic: the generation gallery component stack (GenerationGallery → GalleryPane → GalleryImage), the sectioned per-image action menu, and the in-app lightbox
---

# DiffusionBee: Gallery & Image Action Menu — Structure Right, Access Poor

> [!info] Process log
> Session started 2026-08-11, **explore mode, autonomous**. Two rounds of four
> agents each against the **working tree** (the gallery redesign is uncommitted —
> `git status` shows `GalleryImage.vue`, `GalleryPane.vue`, `GenerationGallery.vue`,
> `image_menu_functions.js`, `History.vue`, `utils.js` modified). Round 1 cast a
> wide net (Explorer: web research on dropdown mechanics, competitor gallery UX,
> lightbox conventions, Chromium CSS bugs; Associator: imgbb + power-user patterns;
> Critic: 11 stress tests on the vault seams; Synthesizer: themes + tensions).
> Round 2 reality-checked the top tensions against the actual code (PagesRouter,
> SDManager, generation_broadcast, history_service) and filled the metadata/delete
> gaps on the web. Agent reports: `recon/2026-08-11-gallery-action-menu/r1-*.md`
> and `r2-*.md`; metrics in `_metrics.md`. Prior art: `recon/2026-08-04-app-ui-polish-batch-queue.md`.

## The Territory

The gallery is the second-most-touched surface in DiffusionBee after the prompt box:
every generation lands there, every history session renders through it, and every
"what do I do with this image" decision starts at a three-dot button. This session
mapped that surface — the component stack, the action menu contract, and the
lightbox — against how mature AI image tools do the same job, and against the
app's own architectural patterns.

**What the working tree already got right.** The redesign is not cosmetic noise —
it embeds real engineering decisions that hold up under scrutiny. The hover-zoom
lives inside a clipped `.gal_media` layer with `isolation: isolate`, which traps the
zooming `<img>`'s stacking context so it can never paint above the actions button
(`GalleryImage.vue`); the actions toggle deliberately avoids `backdrop-filter`
because Chromium/Electron drops backdrop-filtered elements from paint while a
sibling runs a transform animation — a real compositor bug, not a superstition[^chromium]. The
sectioned menu — **Preview & Export / Send To / Parameters** — maps onto how the
industry groups actions: A1111's "Send to txt2img/img2img/inpaint" is the same
Send To concept, InvokeAI's "Use Prompt / Use Seed / Use All" is the same
Parameters cluster, and every tool reviewed separates export from
send-to-workflows[^a1111][^invokeai]. The bilingual support (per-action `text_ar`,
per-group `label_ar`, RTL-mirrored dropdown and lightbox) is thorough and is a
genuine fork differentiator. The reactive `menu_items` computed (rebuilt when
`isArabic` flips) is a clean improvement over the old non-reactive `data()` build.

**Where it falls short.** Three gaps dominate. First, **access**: a single
always-visible ellipsis is the *only* path to eleven actions — no quick-action
icons, no right-click menu, no keyboard shortcuts, no selection mode. Every
competitor pairs a "more" menu with direct access to the frequent actions.
Second, **power-user capabilities are absent**: there is no per-image delete
anywhere in the app, no multi-select/batch operations, no metadata viewer (params
are invisible until copied as JSON), and no PNG infotext embedding — an image
exported from DiffusionBee carries no provenance once it leaves the app. Third,
**fragility in the plumbing**: two of the eleven menu actions reach through deep
`router.$refs[cur_page_id][0].$refs.sd_applet` chains, and the lightbox's prev/next
walks `$parent.image_data` — both break silently on any page-structure change.

## Competing framings

**Framing A — "The menu is right; the access model is wrong."** The 3-group
structure is validated by every competitor; the problem is that all of it sits
behind one ellipsis. The fix is additive: promote 2–4 frequent actions to direct
icons (Send to Img2Img, Save, Preview, Delete) and keep the rest in the dropdown.
This is the Midjourney model (quick icons + "More actions"). Lowest risk, largest
perceived improvement, and it degrades gracefully — icons can be added one at a
time without restructuring the menu contract.

**Framing B — "The gallery needs set operations, not more buttons."** The single
biggest capability gap is acting on images *as a group*. The app already owns a
FIFO batch engine (`SDManager` + `batch_queue_store`) — it's just wired to the
prompt form, not the gallery. Multi-select (Ctrl/Cmd+Click, per ComfyUI-Gallery[^comfy])
feeding batch re-run, batch export, batch delete, or batch upscale is the natural
next feature, and it rides on existing `group_id` plumbing. Under this framing,
the per-image menu shrinks (selection handles the bulk), not grows.

**Framing C — "Stabilize the spine before adding features."** The two deep-ref
menu actions are the outliers in an app that already has the fix: everything else
registers on `app.functions` (`send_to_img2img`, `switch_page`, `register_gallery`,
`add_to_history` — all set at page mount in `generation_broadcast.js`,
`PagesRouter.vue`, `Img2Img.vue`, `history_service.js`). Routing
`use_params_current_page` and `generate_similar_images` through the same registry
(an app-level `app.functions.use_params_in_current_page(params)`) is cheap, in-pattern,
and removes the only two places where menu code reaches into router internals. Add
the explicit group-context handoff to the lightbox (replacing the `$parent` walk)
and the gallery's core is safe to build on.

**Framing D — "The metadata story is the differentiator."** DiffusionBee stores
full params per image but only exposes them as a JSON blob. Competitors surface
params as a *viewer*: InvokeAI's gallery panel with remix/use-prompt/use-seed,
ComfyUI-Gallery's per-value click-to-copy chips, A1111's PNG Info tab[^invokeai][^comfy][^a1111].
A lightweight metadata popover (copyable chips for prompt/seed/steps/CFG/model)
would convert the app's richest asset — its provenance data — into user value, and
a "Copy prompt" one-liner (`params.prompt` to clipboard) beats copying whole JSON
for the common workflow.

## Tensions

**T1 — Discoverability vs. density.** Always-visible ellipsis (current), hover-reveal
(InvokeAI-style), or quick icons + more menu (Midjourney-style). The app is
desktop/mouse-first, so hover-reveal is viable — but 11 actions can't all be
icons. The real question is which 2–4 actions are frequent enough to deserve a
persistent button. This is a product call, not a research finding.

**T2 — Menu breadth vs. selection.** Eleven items is at the upper bound of the 5–7
item context-menu ideal[^icons8]. Multi-select + a floating action bar (the Eleken
pattern[^eleken]) slims the per-image menu *and* unlocks batch ops. The two moves
are complementary, but they should be designed together — adding selection mode
without rebalancing the menu leaves both half-done.

**T3 — The delete contract.** No per-image delete exists. Three stores are in
play: live gallery groups (visual, pruned by `clear_old_groups` beyond
`n_to_keep`), the `historyStore` manifest (`history.json`), and disk files in
`~/.diffusionbee/images/`. Deleting from one must not desync the others.
Midjourney's trash-with-restore is the recoverable pattern[^midjourney]; at minimum
a native confirm (as History's group delete uses) plus explicit store semantics.
`SDManager.stop_all()` already calls `gallery.delete_group()` — the method exists,
it's just not wired to UI.

**T4 — Light mode vs. the permanently dark lightbox.** The lightbox injects
hardcoded dark rgba colors (`utils.js`), ignoring theme.css's full
`prefers-color-scheme: light` token set. If light mode is ever activated app-wide,
the viewer stays dark. Low-cost fix (CSS variables), but it surfaces a bigger
question: is light mode actually shipping?

## Open Questions

1. **Delete contract**: manifest-only, trash-with-restore, or full disk removal? Who owns image lifecycle — the transient gallery or the persistent History page?
2. **Batch-from-selection scope**: should gallery multi-select feed the existing batch panel (re-run selected prompts) or get its own selection action bar (export/delete/upscale)? Both ride the existing FIFO plumbing.
3. **Access model**: quick icons + more menu, or hover-reveal? Which actions earn direct access?
4. **Metadata**: full viewer (InvokeAI-style panel), per-value copy chips (ComfyUI-Gallery), or just a "Copy prompt" action?
5. **PNG infotext**: should the app embed A1111-compatible params into saved PNGs so provenance survives outside the app?
6. **Light mode**: is it shipping? (Blocks the lightbox theming decision.)

## Recommended next step (converging on the cheapest, highest-value fix)

Regardless of which framing wins, one change is uncontroversial, cheap, and
de-risks everything else: **route `use_params_current_page` and
`generate_similar_images` through the existing `app.functions` registry** (Framing C),
and replace the lightbox's `$parent.image_data` walk with an explicit group-context
handoff. The app already has the pattern; the two menu actions are the only
violations. Everything else (icons, selection, delete, metadata) builds more safely
on that spine.

## Sources

[^chromium]: https://issues.chromium.org/40175472 — backdrop-filter dropped from paint during sibling transform animation (Chromium/Electron)
[^a1111]: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/features — PNG Info tab, send-to buttons
[^invokeai]: https://invoke.ai/features/gallery/ — gallery panel, remix / use-prompt / use-seed actions
[^comfy]: https://github.com/PanicTitan/ComfyUI-Gallery — per-value metadata copy, Ctrl/Cmd+Click multi-select, batch delete
[^midjourney]: https://docs.midjourney.com/hc/en-us/articles/33329462451469-Organizing-Your-Creations — trash + restore
[^icons8]: https://icons8.com/blog/articles/the-ux-dilemma-hotkeys-vs-context-menus/ — hotkeys vs context menus, dual access
[^eleken]: https://www.eleken.co/blog-posts/bulk-actions-ux — bulk action UX, sticky action bars
[^imgbb]: https://api.imgbb.com/ — imgbb API (endpoint, key, 32 MB free-tier limit)

*Vault references: `electron_app/src/components_bare/GalleryImage.vue`,
`electron_app/src/components_bare/GalleryPane.vue`,
`electron_app/src/components/GenerationGallery.vue`,
`electron_app/src/components/image_menu_functions.js`,
`electron_app/src/pages/History.vue`, `electron_app/src/utils.js`,
`electron_app/src/components/PagesRouter.vue`,
`electron_app/src/generation_broadcast.js`, `electron_app/src/SDManager.vue`,
`electron_app/src/history_service.js`, `electron_app/src/pages/Settings.vue`.*
