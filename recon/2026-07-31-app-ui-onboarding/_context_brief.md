# Context Brief — App, UI & Onboarding Recon (2026-07-31)

## Session

- **Topic**: Recon of THE ENTIRE DiffusionBee application — its UI and onboarding. Broader than prior sessions (2026-07-24 UI redesign; 2026-07-31 plug-n-play onboarding).
- **Mode**: Explore (divergent) + Autonomous. Ends with open questions and competing framings.
- **Output dir**: `recon/2026-07-31-app-ui-onboarding/`
- **Final document**: `recon/2026-07-31-app-ui-onboarding.md` (Synthesizer writes it in the final round)

## Project

DiffusionBee fork (owner: aldoyh; upstream: divamgupta/diffusionbee-stable-diffusion-ui). Stable Diffusion GUI for macOS (DMG) + Windows (NSIS). Vue 2.7 Electron renderer spawning a Python (TensorFlow) backend over stdin/stdout JSON. App ID `net.aldoy.diffusion-sd-ui`, version 2.4.0 (upstream official app: 2.5.3). Arabic/RTL i18n (Tajawal font) is a fork differentiator.

## Must-read files for every agent (in order)

1. `AGENTS.md` — verified architecture, commands, conventions, traps.
2. `recon/_context_brief.md` — 2026-07-24 brief: UI structure, generation flow, known issues list.
3. `recon/2026-07-24-diffusionbee-ui-redesign-recon.md` — prior 4-round Focus recon (settled claims + 3-phase roadmap).
4. `recon/2026-07-31-plug-n-play-onboarding/_context_brief.md` — today's earlier session brief (first-run focus).
5. `electron_app/src/pages/pageMeta.js` — navigation source of truth.
6. Skim `electron_app/src/App.vue` (1465 lines: shell, splash, first-run model setup overlay) and `electron_app/src/pages/Homepage.vue` (2643 lines: welcome screen, chat-style prompt, mode pills, inspiration carousel).

## Settled claims (DO NOT RESTATE — build on, challenge, or move past)

1. **Architecture**: Electron main (`background.js`) → `bridge.js` → Python backend over stdin/stdout. Protocol: `b2py` (renderer→py), `py2b`/`sdbk`/`alrt`/`adlg` (py→renderer). Poll-based progress (300ms). Message codes: `inrd` (ready), `t2im`, `rapp`, `strt`, `dnpr` (progress), `nwim` (new image).
2. **Onboarding flow**: mount → seed bundled models → `check_and_prompt_model_download()` → catalog `https://models.diffusionbee.com/list_models` → `pickOptimalOnboardingModel()` (RAM/Apple-Silicon aware, `utils/model_selection.js`) → modal → download (Electron IPC, 300ms polling, no resume) → optional downloads → dismiss. FLUX.2 catalog merged locally (`utils/flux2_catalog.js`); HF token gating (`utils/hf_auth.js`) is invisible in the UI.
3. **Prior proposals (assume known, don't re-validate)**: rich ModelSelector replacing `<select>`; inline GenerationProgress replacing blocking LoaderModal; full-page onboarding with hardware display; hardware compat badges; theme.css token adoption; light mode (defined, unimplemented); responsive breakpoints (defined, nonfunctional).
4. **Design system**: `docs/design_system.md` tokens; `electron_app/src/assets/css/theme.css` (2063 lines) + legacy class mappings; Inter + Tajawal fonts; dark default `#0a0a0a`, primary `#3E7BFA`.
5. **Backend envs**: bridge resolution order `BIN_PATH` → packaged `core/diffusionbee_backend` → packaged `.py` → dev `backends/stable_diffusion/diffusionbee_backend.py`; venv lookup prefers `venv311` (Python 3.11; TF 2.10 is NOT py3.11-compatible — tests are slow/limited). Runtime data in `~/.diffusionbee/`.

## NEW TODAY (2026-07-31) — not in any prior recon

**The packaged backend binary diverges from this repo's source.** `scripts/prepare_backend_for_packaging.sh` copies `/Applications/DiffusionBee.app/Contents/Resources/core` verbatim when present (MD5-verified identical). That PyInstaller binary is built from a *private, newer* upstream tree and contains modules absent from the repo: `stable_diffusion.utils.safety_checker` (OpenNSFW onnxruntime classifier + `open-nsfw.onnx`), `stable_diffusion.plugins.prompt_enhancer` (style presets), `applets.deforum`, `applets.lora_training`.

Verified by PYZ extraction + xdis disassembly of the frozen engine (`stable_diffusion.stable_diffusion.generate`): **every** decoded image is scored by `OpenNSFWInferenceRunner` (`[SD] safety_score` logged unconditionally); if `safety_score > 0.8` **and** `sd_run.allow_nsfw` is falsy, the image array is zeroed and stamped via cv2.putText: "NSFW content detected" / "Change settings to enable NSFW content". The repo's renderer never sent `allow_nsfw` — the alert references a setting no UI exposes.

**Fix applied today (uncommitted, by the orchestrator)**: `StableDiffusion.vue` `text_to_img()` and `run_applet()` now inject `allow_nsfw: true` into outgoing params. Source backends drop the unknown key safely (`get_sd_run_from_dict` filters to `SDRun` dataclass fields). Also removed the `['uncensored', 8]` / `['uncensored', 4]` penalties from recommendation scoring in `utils/model_selection.js` and `utils/ollama_prompt_service.js`. `build:ui` passes; scoped eslint passes. **Note**: the installed `/Applications/diffusion-sd-ui.app` still has the old renderer until rebuilt + reinstalled.

## The app's surface (inventory to map)

- **Pages** (`electron_app/src/pages/`): Homepage (welcome hub), Txt2Img, Img2Img, Inpainting, PostProcessImage (upscale), ModelStore, PromptLibrary, Training, History, Logs, Settings, ContactUs, BlankPage. `PagesRouter.vue` lazy-loads; Homepage + History eager.
- **Shell**: App.vue monolith; `MainToolbar.vue`; `components_bare/` generic widgets (`Form.vue` schema form renderer, `LoaderModal.vue`, `SplashScreen.vue`, `ApplicationFrame.vue`, `GalleryPane.vue`).
- **State/comms**: `StableDiffusion.vue` (generation state machine), `SDManager.vue` (queue), `AssetsManager.vue` (model downloads), `history_service.js`, `generation_broadcast.js`, `prompt_library.js`, `native_functions*.js`.
- **Dual form schema**: `backends/stable_diffusion/applets/options.py` (346-line JSON string) ↔ `electron_app/src/forms/sd_options_adv.json` — migration in progress.
- **Demo surfaces**: `serve:ui`/`AppDemoUI.vue` (browser-only), `ai-image-studio.html` (standalone modern-design mock, not in build), `docs/design/inspiration-hub-mockup.html`.
- **Tests**: standalone node assertion tests in `electron_app/scripts/tests/`; `test_generation.py` / `scripts/test_prompt_generation.py` backend smoke; `scripts/verify_installed_app_ui.sh` installed-app UI test (Arabic prompt).

## Primary web sources (Explorer: fetch directly, no secondary coverage)

- https://diffusionbee.com (product site)
- https://github.com/divamgupta/diffusionbee-stable-diffusion-ui (upstream repo: README, releases, issues)
- https://models.diffusionbee.com/list_models?user_id=local (live model catalog JSON)

## Round plan

- **R1** (this round): 4 agents, wide net. Read this brief + must-reads. Respect settled claims.
- **R2**: deepening — Explorer fills gaps + operational reality check; Associator connects; Critic stress-tests strongest ideas; Synthesizer refines.
- **R3**: only if Synthesizer recommends.
- **Final**: Synthesizer writes `recon/2026-07-31-app-ui-onboarding.md` (Explore format: The Territory, competing framings, Tensions, Open Questions, Process Log).

## Rules for agents

- Read-only on app code. Write ONLY your assigned report file in `recon/2026-07-31-app-ui-onboarding/`.
- Targeted reads (grep + line ranges); don't dump entire >500-line files unless essential.
- Cite repo file paths (with line numbers where possible); footnote web URLs.
- Match the repo's vocabulary (applet, tdict, b2py, sdbk, page, onboarding, catalog).
