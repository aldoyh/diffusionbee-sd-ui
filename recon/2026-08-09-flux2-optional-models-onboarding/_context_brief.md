# Context Brief — FLUX.2 / Optional Models Onboarding Recon (2026-08-09)

## Session

- **Topic**: FLUX.2 / optional models onboarding — how FLUX.2 should be discovered, downloaded, gated, and surfaced in the Model Store / onboarding flow.
- **Mode**: Explore (divergent) — Autonomous (no check-ins between rounds; deliver finished recon).
- **Output dir**: `recon/2026-08-09-flux2-optional-models-onboarding/`
- **Final document**: `recon/2026-08-09-flux2-optional-models-onboarding.md`
- **Session start**: 2026-08-09 (vault scan done; R1 dispatch follows).

## Project Overview

DiffusionBee — Stable Diffusion GUI for macOS (DMG) + Windows (NSIS). Vue 2.7 Electron app spawning a Python Stable Diffusion backend over stdin/stdout JSON (TensorFlow 2.10).

- **Renderer**: `electron_app/src/` — Vue 2.7, Bootstrap 5, theme.css. Arabic i18n (`app_state.isArabic`, Tajawal).
- **Backend**: `backends/stable_diffusion/diffusionbee_backend.py` (TF 2.10) — supports SD 1.x/2.x end-to-end; **no FLUX.2 inference** (per `test_all_models.py:729`: "SDXL and FLUX models require separate backends").
- **Model catalog**: `https://models.diffusionbee.com/list_models?user_id=local` (server-side, ~26 entries, no FLUX.2, no size_bytes). FLUX.2 catalog is **hardcoded in the renderer** (`electron_app/src/utils/flux2_catalog.js`).
- **Runtime data**: `~/.diffusionbee/` — `downloaded_assets.json`, `imported_models/`, `downloaded_assets/`.

## The FLUX.2 catalog (renderer-hardcoded, `flux2_catalog.js`)

| Model | HF repo | Size | min_ram_gb | HF token | Onboarding |
|---|---|---|---|---|---|
| FLUX.2-klein-4B | black-forest-labs/FLUX.2-klein-4B | 7,751,105,712 B (~7.2 GiB) | 13 | NO (Apache 2.0) | recommended_for_onboarding: true |
| FLUX.2-klein-9B | black-forest-labs/FLUX.2-klein-9B | ~19 GB | 20 | YES (gated) | false |
| FLUX.2-dev | black-forest-labs/FLUX.2-dev | ~54 GB | 28 | YES (gated) | false |

- `enrichFlux2Model()` returns **null for gated models when no HF token** → Klein-9B/Dev **silently vanish** from ModelStore + onboarding for every normal user.
- Merged into the app catalog at runtime via `mergeFlux2IntoCatalog(models, hfToken)`; unshifted to front.
- `model_meta_data.type = 'flux2_model'`, family 'flux2', float bfloat16.
- `skip_checksum: true` on the download path (no MD5 verification).
- FLUX.2 files ship as **raw safetensors** (no `.tdict` conversion) — `install_hf_model.py --flux2` copies the file into `~/.diffusionbee/downloaded_assets/` and registers it.

## The "FLUX trap" (confirmed live, 2026-08-09)

1. `pickOptimalOnboardingModel(..., { preferFlux2: true })` — any machine with ≥13 GB RAM gets **FLUX.2-klein-4B (7.75 GB download)** as the recommended first model (`scoreFlux2Model` base 120+80=200; SD1.5 scores ~72-96).
2. User downloads 7.75 GB through the setup modal → lands on Homepage → types a prompt → `generatePrompt` **hard-refuses**: `isFlux2Model(selectedAsset)` → toast "FLUX.2 is downloaded, but the current generation backend supports Stable Diffusion models only. Pick an SD model..." (`Homepage.vue:902-905`, and `1204-1207` in the batch path).
3. The catalog labels FLUX.2 generatable (`GENERATABLE_MODEL_TYPES` includes `flux2_model`), the picker prefers it, and the generator blocks it. The user's only path forward is picking an SD model they haven't downloaded yet — so first-run requires TWO downloads.

## Download pipeline

- `AssetsManager.download_asset()` → `window.ipcRenderer.send('download-file', url, dest, downloadId, options)` → `native_functions.js` `ipcMain.on('download-file')`: `request.get()` stream to disk with **no resume** (`Range:`), no `.partial` file, timeout 0 for HF (no timeout), 20 s otherwise; MD5 computed incrementally; `rejectUnauthorized: false`.
- HF auth: `downloadOptions.hf_auth` → `Authorization: Bearer <token>` from `resolve_hf_token()` (env `HF_TOKEN` / `HUGGINGFACE_API_KEY` / `HF_API_KEY`), exposed to renderer via `get_hf_token` sync IPC (`native_functions.js`). **No in-app UI to enter/save the token** — Settings.vue has no field; token only comes from process env.
- `install_hf_model.py` (Python CLI) is the parallel path: `hf_hub_download` with built-in resume, writes to `downloaded_assets.json`. UI path does NOT use it.
- `huggingface_hub` pip-installed on demand by the CLI; not bundled.

## Onboarding flow (current)

1. Splash → `check_and_prompt_model_download()` → if no models, Homepage shows `needsOnboarding` banner ("Install one model to start generating" — **mentions FLUX.2 Klein**).
2. Banner → `downloadDefaultModel` → `launchOnboarding(true)` → `fetch_models_list()` (catalog + FLUX.2 merge) → `pickOptimalOnboardingModel` → setup modal shows recommended model → "Download & Get Started" (or Skip).
3. `start_model_download()` polls `downloading[asset_id].progress` every 300 ms.
4. Success → "Model ready!" → "Get more models (optional)" → `offerOptionalDownloads()` → curated list: DreamShaper_6_baked_vae, CyberRealistic__v3.1, Juggernaut_X, **FLUX.2-klein-4B** → checkboxes → `startOptionalDownloads()` (parallel, 300 ms poll).
5. `verifyModelsHardwareCompatibility()` — **console-only**, never surfaced to UI.
6. `onboarding_completed` / `optional_downloads_offered` flags in `app_data_2.json`.

## Key files

| File | Role |
|---|---|
| `electron_app/src/utils/flux2_catalog.js` | Hardcoded FLUX.2 catalog + merge + gating |
| `electron_app/src/utils/hf_auth.js` | `getHfTokenSync()` (env via IPC, in-memory cache) |
| `electron_app/src/utils/model_selection.js` | `pickOptimalOnboardingModel`, `scoreFlux2Model` (prefers FLUX.2) |
| `electron_app/src/App.vue` | Setup modal, `fetch_models_list`, `start_model_download`, `offerOptionalDownloads`, `verifyModelsHardwareCompatibility` |
| `electron_app/src/AssetsManager.vue` | `download_asset`, registry writes |
| `electron_app/src/native_functions.js` | `download-file` IPC (no resume), `get_hf_token`, `seed_bundled_models` |
| `electron_app/src/pages/Homepage.vue` | `needsOnboarding` banner, `generatePrompt` FLUX refusal (902, 1204) |
| `electron_app/src/pages/ModelStore.vue` | Browse + download models; merges FLUX.2; `canDownloadModel` → `isModelDownloadAllowed` (neutered to `!!(id && url)`) |
| `install_hf_model.py` | Python CLI install (hf_hub_download, resume) |
| `scripts/install_flux2_models.py` | Wrapper CLI over presets |
| `scripts/setup_models.py` | `--include-optional` (FLUX.1) / `--include-flux2` |
| `scripts/lib/fixtures.py` | `OPTIONAL_CATALOG_MODEL_IDS`, `OPTIONAL_FLUX2_PRESET_IDS` |
| `scripts/bundle_default_models.js` | Bundles Default_SD1.5 (2.27 GB) for installers |

## Settled claims from prior recons (DO NOT RESTATE — build on / challenge)

1. **FLUX trap**: onboarding prefers FLUX.2 (`preferFlux2: true`), Homepage refuses to generate with it, backend can't run it — the renderer is ahead of its own backend (2026-07-31 r1-explorer; re-verified live 2026-08-09).
2. **HF gating is doubly invisible**: token only from process env; gated models silently vanish; no Settings field, no in-app login (2026-07-31).
3. **No download resumption** anywhere in the UI path; 54 GB dev download = unrecoverable on drop (r1-critic 07-31).
4. **Bifurcated catalog**: server catalog (models.diffusionbee.com, developer-pushed) vs FLUX.2 hardcoded in source (needs code commit + app release to add a model); different trust + update cadence (r1-critic).
5. **Dual install path, one registry**: `install_hf_model.py` (huggingface_hub) + `AssetsManager` (request+MD5) both write `downloaded_assets.json`; apt/dpkg analogy; trust split: closed ecosystem content-hash vs open ecosystem bearer-auth (r1-associator).
6. **`.tdict` proprietary format bifurcation**: FLUX.2 ships raw safetensors; .tdict was an MPS-era optimization being obsoleted (r1-critic).
7. **min_ram_gb is only consulted in `isSelectableOnboardingModel`** — not enforced at download or load; a 16 GB M2 picking Klein-9B (20 GB min) will OOM mid-inference (r1-critic).
8. **Bundled SD1.5 exists** (`.bundled-models/`, 2.27 GB, seeded via `seed_bundled_models` IPC, Windows ships it) but `pickOptimalOnboardingModel` **de-ranks it in favor of FLUX.2** — the only zero-download model is never chosen (07-31 r1-explorer).
9. **macOS bundling**: root `package.json` has `bundle:models` (`node scripts/bundle_default_models.js`) and `build:win:full` chains it; **uncertain whether the macOS `npm run build` chain bundles models** — open verification item.
10. **ModelStore** is a flat list; no search/ratings/version-graph; optional-downloads UI cramped inside setup dialog; "a dedicated page like ModelStore would scale better" (open question, 08-02).

## Primary source URLs (Explorer must fetch, not rely on secondary coverage)

- https://huggingface.co/black-forest-labs/FLUX.2-klein-4B (repo page, file sizes, license)
- https://huggingface.co/black-forest-labs/FLUX.2-klein-9B (gating status)
- https://huggingface.co/black-forest-labs/FLUX.2-dev (gating status, 54 GB)
- https://huggingface.co/docs/hub/en/models-gated (HF gating UX, EU restriction flag)
- https://models.diffusionbee.com/list_models?user_id=local (live catalog)
- https://huggingface.co/docs/huggingface_hub/guides/download (resume behavior)
- https://github.com/black-forest-labs/flux (official FLUX repo — does FLUX.2 exist there?)

## Round plan

- **R1**: 4 agents in parallel — Explorer (web: FLUX.2 ecosystem + competitor onboarding UX), Associator (web/vault connections), Critic (stress-test the FLUX trap + download/auth pipeline), Synthesizer (refine themes, tensions).
- **R2**: deepen — Explorer reality-checks (backend FLUX support reality, macOS bundling, HF API facts), others build on settled claims.
- **Final**: Synthesizer writes the finished document to `recon/2026-08-09-flux2-optional-models-onboarding.md`.
