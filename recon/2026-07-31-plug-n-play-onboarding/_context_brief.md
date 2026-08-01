# Context Brief — Plug-n-Play Onboarding Recon (2026-07-31)

## Session

- **Topic**: Make the DiffusionBee Electron app's first-run experience as plug-n-play as feasible — what the user feels from "I double-clicked the app" to "I generated my first image" should be ≤3 clicks, ≤1 minute of waiting, no surprise errors.
- **Mode**: Focus (sharpened) — convergent on the strongest framing, ends with Next Steps.
- **Pacing**: Autonomous (no check-ins between rounds).
- **Target**: Electron app first-run (macOS DMG + Windows NSIS installer). Source-mode is out of scope.
- **Output dir**: `recon/2026-07-31-plug-n-play-onboarding/`
- **Final document**: `recon/2026-07-31-plug-n-play-onboarding/2026-07-31-plug-n-play-onboarding.md`

## Project Overview

DiffusionBee — Stable Diffusion GUI for macOS (DMG) + Windows (NSIS). Vue 2.7 Electron app spawning a Python Stable Diffusion backend over stdin/stdout JSON.

- **Frontend**: `electron_app/src/` — Vue 2.7, Bootstrap 5 + Bootstrap-Vue, custom CSS theme (`assets/css/theme.css`). 8px base, dark/light themes, Inter + Tajawal (Arabic).
- **Backend**: `backends/stable_diffusion/diffusionbee_backend.py` (TensorFlow 2.10). Communicates via `b2py` (renderer→py) and `py2b` (py→renderer) prefixed lines.
- **IPC**: `electron_app/src/bridge.js` spawns `diffusionbee_backend` (or via `venv311/bin/python3`).
- **Runtime data**: `~/.diffusionbee/` (downloaded_assets, imported_models, images, downloaded_assets.json).
- **Model catalog**: `https://models.diffusionbee.com/list_models?user_id=local` + FLUX.2 merged locally.

## Key Files (already read)

| File | Purpose |
|------|---------|
| `electron_app/src/App.vue` (~1465 lines) | Monolithic shell: splash, onboarding, routing, generation modal. Holds `show_model_setup`, `model_to_download`, `fetch_models_list()`, `start_model_download()`, `launchOnboarding()`, `completeOnboarding()`, `offerOptionalDownloads()`, `verifyModelsHardwareCompatibility()`. |
| `electron_app/src/pages/Homepage.vue` (~2643 lines) | New welcome screen: chat-style prompt input, mode pills, inspiration carousel, Arabic support. Has `needsOnboarding` (onboarding banner) and `startOnboarding()`. |
| `electron_app/src/utils/model_selection.js` | `getMachineProfile()`, `pickOptimalOnboardingModel()`, `scoreFlux2Model()`, `scoreStableDiffusionModel()`. Hardware-aware selection (RAM, Apple Silicon). |
| `electron_app/src/utils/flux2_catalog.js` | Hardcoded FLUX.2 catalog (Klein 4B/9B, Dev) merged at runtime; HF token gating; min_ram_gb requirements. |
| `electron_app/src/utils/hf_auth.js` | `getHfTokenSync()` — token shown nowhere in UI. |
| `electron_app/src/AssetsManager.vue` | `download_file()`, `all_avail_assets`, `scan_disk_models()`. |
| `electron_app/src/pages/ModelStore.vue` | Browse all models (current Model Store page). |
| `scripts/lib/fixtures.py` | `DEFAULT_SD15`, `REQUIRED_CATALOG_MODEL_IDS`, `OPTIONAL_CATALOG_MODEL_IDS`. Server-side catalog. |
| `scripts/setup_models.py` | CLI: download Default_SD1.5, DreamShaper, CyberRealistic (+optional FLUX.1, +FLUX.2 with HF_TOKEN). |
| `recon/2026-07-24-diffusionbee-ui-redesign-recon.md` | Prior 4-round recon. Much overlap. Use as R1 settled claims. |

## Settled Claims (from 2026-07-24 recon — DO NOT RESTATE)

1. **Architecture**: Electron main → bridge.js → Python backend over stdin/stdout. Poll-based progress (300ms).
2. **Onboarding flow**: App mount → seed bundled models → `check_and_prompt_model_download()` → if no models → fetch from `models.diffusionbee.com/list_models` → `pickOptimalOnboardingModel()` → modal → download → optional downloads → dismiss.
3. **Model selection**: `pickOptimalOnboardingModel()` uses RAM/Apple Silicon. Prefers FLUX.2 if `preferFlux2` true.
4. **Design system**: `docs/design_system.md` defines tokens (Inter, Tajawal, 8px scale, dark/light). NOT implemented in `App.vue` (hardcoded colors).
5. **Visual: app lags 2025-26 standards**: blocking LoaderModal, plain `<select>` for model, cramped onboarding modal.
6. **Onboarding modal UX problems**: no hardware compatibility badge for users, no model thumbnails, no ETA, no cancel-individual, no retry, no model comparison.
7. **Vue 2.7 lock**: limits Composition API, `<script setup>`, Teleport, Fragments.
8. **App.vue monolithic**: ~1465 lines holding shell, onboarding, splash, generation modal, model setup, settings.

## What This Recon Must Answer (Focus)

The 2026-07-24 recon covered *what's broken*. The user wants **plug-n-play** — meaning the gap between "user clicks the app" and "user sees their first image" should be as small as possible. The new question is:

**What is the minimum set of frontend changes that makes the first-run experience feel literally plug-n-play — and what's the actual model installation path?**

Specific asks:

1. **Bundling default models** — The Windows installer ships with SD 1.5 bundled. The macOS DMG does not (or does it?). Should macOS also ship with a bundled model so the first generation is instant? What are the size trade-offs (DMG size, download size, model size)?
2. **Onboarding interactivity** — Currently the splash screen waits for backend to be ready, then `check_and_prompt_model_download()` runs. Can the user start typing a prompt *before* the model is downloaded? What's the failure mode?
3. **Failure paths** — What happens if `models.diffusionbee.com` is unreachable? If the user has no HF token and FLUX.2 is the best pick? If their RAM is too low for any model? If the download fails midway?
4. **Silent install vs explicit consent** — Apple's macOS Gatekeeper and 2026 user expectations: do users want a "Download & Get Started" button, or should the app just download without prompting? (Note: this is morally questionable for ML model weights — likely still needs consent.)
5. **Merge overlap with prior recon** — The 2026-07-24 recon already proposed a 3-phase roadmap. What's left *un-said* in that roadmap that this recon should add?

## Constraints

- **Focus mode**: Single argument, not a brainstorm. The Synthesizer picks the strongest framing and commits.
- **No editing code yet**: This is a recon. The build/test/cleanup steps are separate.
- **Build/test/cleanup follow**: After this recon, the user wants to build, test, and then cleanup root path. The cleanup should be informed by this recon's "Next Steps" (e.g., remove stale fixtures, dev artifacts).

## Source Material — Primary URLs to Explore

DiffusionBee's own catalog server responds with `application/json` — agents can fetch a sample:
- https://models.diffusionbee.com/list_models?user_id=local

External references mentioned in prior recon:
- Midjourney UX patterns (AdamFard.com)
- AI UX Design Trends 2026 (YUJ Designs)
- ComfyUI workflow patterns
- Civitai model browsing
- HuggingFace model gating UX

## Round Plan

- **R1**: 4 agents (Explorer, Associator, Critic, Synthesizer). Cast wide. **CRITICAL**: Each agent must read `recon/2026-07-24-diffusionbee-ui-redesign-recon.md` first to absorb settled claims.
- **R2**: 4 agents. Focus on the unanswered questions above. Explorer does reality check; others deepen.
- **R3 (optional)**: Only if Synthesizer recommends.
- **Final**: Synthesizer writes the finished document to `recon/2026-07-31-plug-n-play-onboarding/2026-07-31-plug-n-play-onboarding.md` using the template format from prior recon.

## Files to be Served as Context to Every Agent

1. `recon/2026-07-24-diffusionbee-ui-redesign-recon.md` (prior recon)
2. `electron_app/src/App.vue` (lines 1-150, 460-720 — the onboarding/model code)
3. `electron_app/src/utils/model_selection.js` (full)
4. `electron_app/src/utils/flux2_catalog.js` (full)
5. `scripts/setup_models.py` (CLI counterpart)
6. `scripts/lib/fixtures.py` (catalog source-of-truth)
7. `scripts/lib/fixtures.py` `REQUIRED_CATALOG_MODEL_IDS` — keep in sync with `App.vue` onboarding

## Anti-Repetition Note

The 2026-07-24 recon already proposed:
- Replace `<select>` with rich ModelSelector cards
- Inline GenerationProgress instead of LoaderModal
- Full-page onboarding with hardware display
- Hardware compatibility badges

**This new recon must NOT re-validate these.** It should assume the visual redesign is happening and focus on what's **architecturally missing** to make plug-n-play work: bundled default model, silent install with consent, failure-path UX, backend pre-warming, what's the actual install matrix on macOS vs Windows.
