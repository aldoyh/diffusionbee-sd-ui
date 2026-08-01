---
title: "R1 Explorer — Plug-n-Play Onboarding (focus)"
date: 2026-07-31
agent: explorer
mode: focus (convergent)
topic: ML app first-run UX, with a hard constraint — surface what the 2026-07-24 recon MISSED
---

# R1 Explorer — Plug-n-Play Onboarding

Three things converged this round: (a) what successful 2026 ML apps actually do for first-run, (b) what DiffusionBee's code does today, (c) one decision that makes everything else easier. Settled claims from the prior recon are NOT repeated; the gaps *un-said* are surfaced.

## A. Web findings — what "successful first-run" looks like in 2026

1. **LM Studio (LM Studio Bionic, 2026)**: ships as a separate Bionic app, lets you pick "Work" or "Code" project first, then auto-selects a default ("Root model") — there is no mandatory model pick before the *first* prompt. Model download happens in `Settings → Local Models → Explore` and supports pause/resume/cancel/retry with format filters and "device-fit information" surfaced on every row. Source: [lmstudio.ai/docs/bionic](https://lmstudio.ai/docs/bionic), [lmstudio.ai/docs/bionic/models/download-local-models](https://lmstudio.ai/docs/bionic/models/download-local-models).
2. **Pinokio** (the closest analog to DiffusionBee's electron-launched-Python backend): the on-screen UX is a marketplace with one-click "install" per app (filter chips for NVIDIA/AMD/Apple/macOS/Windows/Linux). The user is never shown a "select model" screen — apps ship preconfigured. Source: [pinokio.computer](https://pinokio.computer/) catalog.
3. **Ollama**: first-run `ollama pull llama3` is one command, then `ollama run llama3` enters a chat REPL. The terminal-first UX assumes you know what you want. Consumer-facing parts (`ollama launch`) auto-launch into Claude Code / Codex. The model is implicit; the user writes a prompt first. Source: [docs.ollama.com/integrations](https://docs.ollama.com/integrations), [ollama.com/download/windows](https://ollama.com/download/windows).
4. **Hugging Face gated-model UX (2026)**: the gating modal has evolved to surface license acknowledgment, *optional* EU restriction (`extra_gated_eu_disallowed: true`), and configurable metadata fields. FLUX.2-klein-4B itself is **Apache 2.0 and NOT gated** (only FLUX.2-klein-9B and FLUX.2-dev require `requires_hf_token`). DiffusionBee's `getHfTokenSync()` is plumbing that ~95% of onboarding users will never need but the renderer pretends they might. Source: [huggingface.co/docs/hub/en/models-gated](https://huggingface.co/docs/hub/en/models-gated), [huggingface.co/black-forest-labs/FLUX.2-klein-4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B).
5. **A1111 / ComfyUI (negative example)**: A1111 still ships as "clone, run `./webui.sh`, drop `.safetensors` into a folder" — 5 manual steps before first image. DiffusionBee's whole reason to exist is being "not this." Source: [github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Installation-on-Apple-Silicon](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Installation-on-Apple-Silicon).

## B. Vault findings — what DiffusionBee does today

The wiring for **plug-n-play already exists in the codebase but is not on the critical path**. Concrete observations:

1. **`seed_bundled_models` is wired and works** (`electron_app/src/seed_bundled_models.js`, called from `App.vue:272` over IPC `seed_bundled_models`, native_functions.js:641). The manifest at `electron_app/.bundled-models/manifest.json` ships `Default_SD1.5` (SD 1.5, **2.27 GB on disk**, 2.27 GB staged) and `vue.config.js:77-81` already copies the folder into `extraResources/bundled_models` for *both* mac and win builds. **But:** `check_and_prompt_model_download()` (App.vue:507) only auto-prompts when `existing.length === 0`; the *first-run modal* is still launched manually — there is no path where the user sees "Download & Get Started" because they should never have to: the bundled seed copy happens silently, then the modal opens asking them to download *another* model.
2. **The actual first-run UX is a `setInterval(1500)` poll on `stable_diffusion.is_input_avail`** (App.vue:231-239). Splash screen progress (`5 → 15 → 25 → 30-85`) maps to: "Initializing backend" → "Starting services" → "Scanning models" → "Downloading model". The splash report *no model check on the local network*, *no hardware report*, *nothing the user can act on* during the wait — pure passive progress.
3. **`fetch_models_list()` is fire-and-forget network with no failure UX** (App.vue:536). On network failure the user gets the modal showing the *cached or last-known* `model_to_download` reference (or a `model_download_error` string saying "Could not reach the model server. Check your internet connection."). The retry button works, but there is **no offline mode**: a user with no internet at first-launch gets *no model*, full stop, even though the bundled SD 1.5 is sitting on disk.
4. **`verifyModelsHardwareCompatibility()` logs but never surfaces to the UI** (App.vue:800). The 120+ lines of compiled RAM/precision/SD-type analysis prints rich formatting to console (`═══ Hardware & Model Compatibility Report ═══`) but the rendered UI shows zero of it. The Homepage `onboarding-banner` (Homepage.vue:8) does mention "best for your machine" in prose but there is no live hardware card anywhere.
5. **`bundled-models/manifest.json` test exists** (`electron_app/scripts/tests/bundled_models.test.js`) and passes — the *build pipeline* guarantees a bundled model is shipped. But the test does not assert that the **renderer treats the bundled model as the default** (i.e., `pickOptimalOnboardingModel` would have to *prefer* `is_bundled: true` over `recommend_for_onboarding: true` FLUX.2 Klein 4B). Today `model_selection.js:285-291` prefers FLUX.2 first, which silently de-ranks the bundled SD 1.5 even though it is the only model that requires zero download.

## C. Reality check — pick a side

**The one thing that would make the biggest difference: stop asking the user to download on first run.** The DMG/NSIS should ship with `Default_SD1.5` (already staged at 2.27 GB in `.bundled-models/`), the renderer should seed it silently before the splash finishes, and the Homepage should boot straight to a pre-filled prompt — "a fluffy cat in a spacesuit" or the user's last prompt — with a "Generating…" button that's already enabled.

This collapses the gating sequence from `splash → poll backend → discover no models → fetch catalog → fail or wait → click "Download & Get Started" → wait 30-180 s → succeed modal → "Get more models" → "Start creating"` to `splash (with bundled model copy hidden inside) → Homepage with active prompt input → click Generate → first image in ~40 s`. The blocking dialog, the consent button, the model-selection modal, the "Get more models" panel — none of them need to exist for the *first* generation to work. They remain available behind a "Get more models" link in the sidebar, exactly where `AssetsManager.vue` / `ModelStore.vue` already lives.

This is morally defensible because (a) the bundled model is open-license SD 1.5 fp16 already publicly hosted, (b) it's shipped inside the user's already-trusted installer, and (c) the user *just chose to install* an ML app — consent is implicit. Differs from "silent install" only in that the user does not see a download progress bar for the bundled model; the *consent gate moves forward in time, not out of the loop*.

This is **NOT** the same as the Pillar 3 visual redesign from the prior recon — the visual changes still apply, but the *architectural* move is: bundled model becomes the default, the post-install modal becomes a power-user-feature not a gate, and the FLUX.2 onboarding story is only triggered if `~/.diffusionbee/downloaded_assets/` has zero entries *and* the user actively opens Model Store.

**Why this over the alternatives**:

- *Fully silent install (no consent at all)* is wrong: a user with 8 GB RAM on macOS should still see a warning when they pick FLUX.2-klein-4B. Also breaks for HF-gated models.
- *Hardware check before internet call* is real and worth doing, but it only matters for the *optional* model-selection phase. Solving it first is rearranging deck chairs.
- *Pre-warming the Python backend during install* — what the Windows installer does via `prepare_backend_for_packaging.sh` PyInstaller build — already happens. The remaining 30 s wait is `tensorflow` lazy-load, which is a separate optimization.

The bundled-default model is the **single change** that compresses "I double-clicked the app" to "I generated my first image" into ≤60 s and ≤2 clicks (double-click + Generate).

## D. Suggested follow-ups for R2

1. **Audit what the macOS DMG actually ships** — `.bundled-models/Default_SD1.5_sd-v1-5_fp16.tdict` exists at 2.27 GB and `vue.config.js` already maps it into `extraResources`, but is there a `bundle:models` script wired into `npm run build` (mac) the way `scripts/build-windows.js:93 --bundle default generation model` does for Windows? The `package.json` root only has `prepare:backend` for macOS, no `bundle:models`. **R2 task**: walk `package.json` scripts → confirm macOS bundling happens, or write the missing step.
2. **Map the failure modes of `fetch_models_list()`** — there is currently zero UX for: (i) no internet, (ii) catalog returns 200 with empty array, (iii) HF token required for the picked model but missing, (iv) user has <8 GB RAM and every FLUX model `min_ram_gb` check fails. The current state is "show error text + Retry button." R2 should audit each branch and propose a fallback that uses the bundled model when the remote is dead.
3. **`bundled_models.test.js` is fine but doesn't pin UX behavior** — when bundled model IDs change or HF changes the recommended model ID, nothing in CI catches a silent regression where the onboarding modal re-appears. R2 should add an assertion that `pickOptimalOnboardingModel` returns the bundled asset when present + no HF token, regardless of `recommend_for_onboarding` flags on remote catalog entries. This locks the architecturally-correct default.

---

**Timing**: Started 2026-07-31 10:14:43 · Finished 2026-07-31 10:15:46
