# Context Brief: Full UI/UX + Models Onboarding Overhaul (Focus)

## Session
- **Date**: 2026-08-18
- **Mode**: Autonomous (no check-ins)
- **Intention**: Focus (convergent — commit to a thesis, end with a concrete action plan / Next Steps)
- **Topic**: "the entire full UI/UX and the models onboarding functionality — improved dramatically"
- **Scope**: vault (codebase + prior recon) + web
- **Output dir**: `recon/2026-08-18-full-uiux-models-onboarding/` (agent reports)
- **Final doc**: `recon/2026-08-18-full-uiux-models-onboarding.md` (written by final Synthesizer)

## Project
DiffusionBee — a macOS (DMG) / Windows (NSIS) Stable Diffusion GUI. Vue 2.7 Electron
renderer + a Python TensorFlow backend over stdin/stdout JSON (4-letter line prefixes
`py2b`/`b2py`/`sdbk`/`utds`/`alrt`/`adlg`). Full architecture in `AGENTS.md` and
`recon/_context_brief.md`. RTL/Arabic (Tajawal) is a first-class feature.

## Prior recon — 8 sessions (build on these; do NOT re-derive settled claims)
1. `recon/2026-07-24-diffusionbee-ui-redesign-recon.md` — original 4-round **Focus** recon; thesis "functional → delightful"; 3-phase roadmap (theme tokens → inline generation progress → immersive onboarding).
2. `recon/2026-07-31-app-ui-onboarding.md` — onboarding journeys; discovered the **FLUX trap**.
3. `recon/2026-07-31-plug-n-play-onboarding.md` — Focus session on plug-n-play first-run.
4. `recon/2026-08-02-app-ui-models-onboarding.md` — fixed NaN% splash, restart gallery hydration, button offset; whole-app review.
5. `recon/2026-08-04-app-ui-polish-batch-queue.md` — fixed model dropdown, Open-button alignment, demo splash, ModelStore crash, batch-queue corruption/false-done.
6. `recon/2026-08-05-full-app-audit-blocking-loops.md` — audited every `setInterval`/`setTimeout`; user reported "unable to simply click and type — something running the entire time".
7. `recon/2026-08-09-flux2-optional-models-onboarding.md` — FLUX.2 catalog/picker/generator mismatch; **binary audit** proved no reachable FLUX path → "gate FLUX.2 out until a real backend exists"; download-resume + HF-token + safeStorage plan.
8. `recon/2026-08-11-gallery-action-menu.md` — gallery component stack + action menu + lightbox; "structure right, access poor" (no quick actions, no delete, no metadata, no PNG infotext).

## Settled claims (established; DO NOT RESTATE — build on, challenge, or move past)
1. **FLUX.2 trap is real and structural**: catalog labels FLUX.2 generatable (`GENERATABLE_MODEL_TYPES`), `pickOptimalOnboardingModel(..., { preferFlux2: true })` scores klein-4B ~200 vs SD1.5's ~72–96, the Homepage banner advertises FLUX.2 — but `generatePrompt` hard-refuses (`Homepage.vue`). Binary audit: no reachable FLUX inference in the shipped product. Fix = **one exported allowlist constant** gating onboarding to `['sd_model','sd_model_inpaint']`, plus banner/catalog copy fixes.
2. **Model downloads are fragile**: no `Range:` resume, no abort IPC, no LFS ETag verification. A multi-GB download that dies at 90% restarts from zero. Single most user-hostile assumption.
3. **HF token UX**: read from env, never persisted in-app; gated models hidden without a token. Plan: Settings field + Electron `safeStorage` (no keytar).
4. **Hardware compatibility is console-only** — not surfaced to users during model selection/download.
5. **Onboarding optional-downloads UI is cramped** inside the setup modal; ModelStore is the better home.
6. **Model selection is inconsistent**: Homepage uses the ARIA-listbox `ModelSelector`; Txt2Img/Img2Img/Inpainting still use a native `<select>` via `BasicSDApplet`.
7. **Generation is a blocking modal** (`LoaderModal`); no inline progress, no streaming/preview; queue (`SDManager`) is invisible to users.
8. **Gallery/history gaps**: no per-image delete, no multi-select, no metadata viewer, no PNG infotext (provenance lost on export); lightbox hardcodes dark colors (ignores light-mode token set).
9. **Design system partially implemented**: `theme.css` + `docs/design_system.md` define full tokens incl. light mode, but light mode never ships; hardcoded dark values remain in places.
10. **Batch queue is page-bound and duplicated** (Homepage + `SDImageGenerationApplet` parallel implementations); navigating away stops the poller while SDManager keeps processing.

## Current code state (2026-08-18, working tree)
- **Uncommitted** (the 08-11 gallery redesign): `App.vue`, `AssetsManager.vue`, `GenerationGallery.vue`, `SDImageGenerationApplet.vue`, `image_menu_functions.js`, `GalleryImage.vue`, `GalleryPane.vue`, `init_vue_libs.js`, `native_functions.js`, `History.vue`, `Homepage.vue`, `preload.js`, `utils.js`, `flux2_catalog.js`.
- Pages: `Homepage, Txt2Img, Img2Img, Inpainting, PostProcessImage, History, ModelStore, PromptLibrary, Training, Settings, Logs, ContactUs, BlankPage` + `pageMeta.js`.
- Components: `AppletPage, BasicSDApplet, DownloadButton, GenerationGallery, image_menu_functions, MainToolbar, ModelSelector, PagesRouter, SDImageGenerationApplet`.
- components_bare: `ApplicationFrame, CircleProgress, Form, GalleryImage, GalleryPane, icon_library, ImageCanvas, inputform, LoaderModal, SplashScreen, TwoColAppletLayout`.
- utils: `model_selection.js, flux2_catalog.js, hf_auth.js, imgbb_upload.js, ollama_prompt_service.js, controlnet_frontend_utils.js, in_out_paint_utils.js, app_version.js`.

## Raw material — open questions/gaps carried forward
- Should non-Home pages adopt `ModelSelector` (unify the picker)?
- How to surface hardware compatibility + disk-space economics during selection/download?
- Optional-downloads UX: inline vs ModelStore vs dedicated page.
- Gated-tier UX (hidden vs locked-with-login) and licensing guardrails (Non-Commercial vs Apache 2.0).
- First-run recommendation on a 16 GB Mac in 2026 (klein-4B once a backend exists vs SDXL vs DreamShaper).
- Batch lifecycle structural fix (move status tracking into SDManager, kill the duplicate).
- Delete contract, multi-select scope, metadata surface, PNG infotext, light-mode shipping decision.
- Backend-dependent items (streaming/preview, queue reordering) vs frontend-only wins.

## Primary source URLs (pass to Explorer; fetch directly, don't rely on secondary coverage)
- https://diffusionbee.com (product site)
- https://models.diffusionbee.com/list_models (live model catalog API)
- https://github.com/divamgupta/diffusionbee-stable-diffusion-ui (upstream repo — README, releases, issues)
- https://huggingface.co (model source)
- Competitors for benchmarking: ComfyUI, AUTOMATIC1111/Forge, InvokeAI, LM Studio, Midjourney, Leonardo AI, KREA, Civitai.

## Key files (vault)
`electron_app/src/App.vue` (monolithic shell + onboarding) · `electron_app/src/AssetsManager.vue` ·
`electron_app/src/utils/model_selection.js` · `electron_app/src/utils/flux2_catalog.js` ·
`electron_app/src/utils/hf_auth.js` · `electron_app/src/components/ModelSelector.vue` ·
`electron_app/src/pages/Homepage.vue` · `electron_app/src/pages/ModelStore.vue` ·
`electron_app/src/pages/Settings.vue` · `electron_app/src/components_bare/LoaderModal.vue` ·
`electron_app/src/components_bare/SplashScreen.vue` · `electron_app/src/components_bare/ApplicationFrame.vue` ·
`electron_app/src/SDManager.vue` · `electron_app/src/StableDiffusion.vue` ·
`electron_app/src/batch_queue_store.js` · `electron_app/src/generation_broadcast.js` ·
`electron_app/src/history_service.js` · `docs/design_system.md` · `docs/design/inspiration-hub-mockup.html`.
