---
title: "R2 Explorer — FLUX.2 / Optional Models Onboarding (vault reality-check)"
date: 2026-08-09
agent: explorer
mode: explore — gap-filling + operational reality check
topic: backend FLUX capability, macOS bundling, env inheritance, hardware pre-flight, hf_hub usage
---

# R2 Explorer — Vault Reality-Check

## (A) Backend FLUX capability verdict

- **No FLUX/flux2/flow-matching code anywhere in the fork's own backend**: zero matches for `flux_generator|flux2|flux_nnc|flow_matching` in `scripts/` (only the FLUX.2 install scripts themselves), zero in `backends/model_converter/`, zero in `backends/stable_diffusion_tf_models/`.
- `test_all_models.py:729` states "SDXL and FLUX models require separate backends."
- The only place a `flux_generator` was ever claimed is the **upstream packaged binary** (reused from `/Applications/DiffusionBee.app` via `scripts/prepare_backend_for_packaging.sh`), per prior recon — **still unverified in the current state**. The fork's dev backend (TF 2.10) cannot run FLUX.2.
- **Verdict: the fork's own backend has no FLUX capability. The FLUX trap cannot be fixed renderer-side by 'invoking a flux_generator' unless the packaged upstream binary is confirmed to contain one (open question for R3/final).**

## (B) macOS bundling verdict — CONFIRMED: macOS builds are model-free

- Root `package.json`:
  - `"build": "npm run prepare:backend && cd electron_app && ... npm run electron:build"` — **no `bundle:models`**.
  - `"build:dir"`, `"build:install"` — same, no bundling.
  - `"bundle:models": "node scripts/bundle_default_models.js"` — standalone, opt-in.
  - `"build:win:full": "npm run bundle:models && npm run build:win"` — **only Windows chains bundling**.
- `electron_app/vue.config.js`: `extraResources` only embeds `.bundled-models/` **when the directory exists** (`fs.existsSync` guard, lines 12-14, 33-34) — opt-in staging.
- `electron_app/scripts/tests/bundled_models.test.js:12`: "SKIPPED — no .bundled-models/ staged (bundling is opt-in; CI builds are model-free)".
- **Verdict: macOS DMG is always model-free → FLUX trap fires on macOS first-run. Windows `build:win:full` seeds bundled SD1.5 → `existing.length > 0` → onboarding skipped → trap avoided on Windows. Platform-conditional confirmed.**

## (C) macOS env inheritance / LSEnvironment — CONFIRMED: nothing

- Zero matches for `LSEnvironment|launchctl|setenv|Info.plist` in `electron_app/`. No launchd plist, no Info.plist env injection.
- **Verdict: `get_hf_token` reads `process.env` only; a Finder-launched DMG app inherits launchd env, not the user's shell → `HF_TOKEN` is empty for real installed users. The gated-model tier is dead-on-arrival in the shipped product.**

## (D) Hardware pre-flight — CONFIRMED: none in backend

- Zero matches for `getSystemMemoryInfo|freeMemGB|psutil` in `backends/`.
- **Verdict: no backend memory checks. `min_ram_gb` is renderer-selection-only, vs `totalMemGB`.**

## (E) hf_hub / HF cache in Electron main — CONFIRMED: none

- Zero matches for `hf_hub_download|HF_HUB_CACHE|huggingface_hub` in `electron_app/`. The Python `huggingface_hub` usage lives only in `install_hf_model.py` (CLI/dev).
- **Verdict: a Python-subprocess downloader would be the first huggingface_hub integration in the Electron product — and packaged apps ship no `python3` to spawn (PyInstaller-frozen binary only), per the R2 Critic.**

## Other facts

- `scripts/build-windows.js` builds the backend with PyInstaller (`--bundle default generation model` flag exists per prior recon).
- `scripts/prepare_backend_for_packaging.sh` reuses `/Applications/DiffusionBee.app` core when present (official PyInstaller binary, `libpython3.9.dylib` must sit flat).
