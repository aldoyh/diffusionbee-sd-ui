# AGENTS.md

Repo-specific notes for OpenCode sessions working in this repository. Prioritize what's hard to infer from filenames.

## What this is

DiffusionBee — a Stable Diffusion GUI for macOS (DMG) and Windows (NSIS .exe). Vue 2.7 Electron app that spawns a Python Stable Diffusion backend over stdin/stdout JSON.

Two top-level entry points: root `package.json` (build pipelines, root scripts) and `electron_app/package.json` (renderer + Electron).

## Architecture (verified)

- **Electron main**: `electron_app/src/background.js` → registers `app://` scheme, opens the window, blocks Cmd/Ctrl+R and F5 (`before-input-event`).
- **Bridge**: `electron_app/src/bridge.js` spawns the Python backend. Order of resolution: `process.env.BIN_PATH` → packaged `core/diffusionbee_backend[.exe]` → packaged `core/stable_diffusion/diffusionbee_backend.py` → dev `backends/stable_diffusion/diffusionbee_backend.py`. The venv lookup (`resolvePythonBin`) checks `venv311/`, `venv/`, `.venv/` in that order.
- **IPC**: `electron_app/src/preload.js` exposes `ipcRenderer`, `ipcRenderer_on`, `bind_ipc_renderer_on` on `window`. The Python ↔ renderer protocol uses 4-letter line prefixes:
  - `py2b …` (lines from Python to renderer), then `utds` (state update), `sdbk` (stable diffusion state), `alrt` (alert)
  - `b2py …` (renderer → Python, sent via `to_python_sync` channel)
  - `adlg …` (raw Python log echo to renderer's `logs` field)
  - See `py_vue_bridge.js` for the dispatcher.
- **Renderer**: `electron_app/src/main.js` mounts `App.vue`. `PagesRouter.vue` lazy-loads pages; `pageMeta.js` is the single source of truth for sidebar/navigation metadata — add new pages there and to the `components:` map.
- **Backend**: `backends/stable_diffusion/diffusionbee_backend.py` (TensorFlow 2.10). The legacy `backends/stable_diffusion/venv` and the active `backends/stable_diffusion/venv311` both exist; **current code and the Electron bridge prefer `venv311` (Python 3.11)**. `docs/Running_from_source.md` is stale (still recommends conda + Python 3.9.10) — ignore it.

## Working directories

- `~/.diffusionbee/` — runtime data: `downloaded_assets/`, `imported_models/`, `images/`, `downloaded_assets.json`. Created by the app and tests; do not commit.
- `electron_app/.packaged-backend/` — staged backend for `electron-builder` `extraResources` (filter excludes `venv*`, `.venv`, `__pycache__`, `*.pyc`).
- `electron_app/.bundled-models/` — OPTIONAL default model staging, only present when a developer ran `npm run bundle:models`. CI/installers are built **model-free**; the app downloads models on first run. `vue.config.js` only embeds this dir into `extraResources` when it exists.
- `electron_app/dist/` and `electron_app/dist_electron/` — build outputs (gitignored).

## Setup (developer machine, macOS)

```bash
# 1. Frontend deps — use pnpm via the root install script (electron_app pins pnpm-workspace.yaml)
npm install            # root runs: cd electron_app && pnpm install

# 2. Python backend
cd backends/stable_diffusion
python3.11 -m venv venv311
source venv311/bin/activate
pip install -r requirements.txt

# 3. Models (one-time, populates ~/.diffusionbee)
cd ../..
npm run setup:models            # required: Default_SD1.5, DreamShaper, CyberRealistic
# add: --include-optional (FLUX.1), --include-flux2 (FLUX.2 Klein from HF, needs HF_TOKEN)
```

`backends/stable_diffusion/venv` (Python 3.9 conda legacy) is kept for reference; do not install into it.

## Run / dev

```bash
# Dev (Electron + dev-server with DevTools)
npm run serve
# or
cd electron_app && npm run electron:serve

# Dev without DevTools (used by screenshot/capture scripts)
IS_TEST=1 npm run electron:serve

# Demo UI only (browser, no backend) — useful for UI work
cd electron_app && npm run serve:ui        # dev
cd electron_app && npm run build:ui        # production bundle (no Electron)
```

The `electron:serve` script intentionally runs `node ./scripts/normalize-electron-path.js` first (trims trailing whitespace in `electron/path.txt` — pnpm occasionally leaves it dirty and breaks Electron's binary lookup).

## Build

```bash
# macOS DMG (root-level recipe wraps prepare:backend → electron:build with arm64 + python path)
npm run build             # arm64 DMG
npm run build:dir         # unpacked .app (faster, for local install)
npm run build:install     # .app + copy to /Applications

# Windows NSIS — PyInstaller cannot cross-compile from macOS
# Use GitHub Actions (push to master → .github/workflows/windows-build.yml)
# Or AppVeyor (appveyor.yml, builds on tag like v2.4.0-win, can attach to GitHub Releases)
# Or on a Windows host:
node scripts/build-windows.js                # full pipeline (model-free installer; app downloads models on first run)
```

The official PyInstaller binary at `/Applications/DiffusionBee.app/Contents/Resources/core` is reused by `scripts/prepare_backend_for_packaging.sh` if present. Critical: `libpython3.9.dylib` and friends **must be flat next to** `diffusionbee_backend` — subfolders break `dlopen` and the backend exits silently.

The Windows builder renames the upstream Real-ESRGAN exe to `realesrgan_ncnn_windows.exe` (see `prepare_backend_for_packaging.js`).

## Testing

**Lint:**
```bash
cd electron_app && npm run lint        # CI flag: --no-fix
cd electron_app && npm run lint:fix
```

**Backend smoke (single image, ~40s, no Electron):**
```bash
backends/stable_diffusion/venv311/bin/python3 test_generation.py
```

**Backend full harness:**
```bash
backends/stable_diffusion/venv311/bin/python3 test_backend.py
```

**Full prompt generation tests (preferred — composes welcome assets too):**
```bash
bash scripts/run_setup_and_tests.sh           # smoke: 2 prompts, 512x512
bash scripts/run_setup_and_tests.sh full      # full: 12 prompts, 1024x576 landscape
# or directly:
python3 scripts/test_prompt_generation.py
python3 scripts/test_prompt_generation.py --full
```

**Standalone Node assertion tests** (no test framework — just `node` and `assert`):
```bash
node electron_app/scripts/tests/resolve_python_bin.test.js
node electron_app/scripts/tests/bundled_models.test.js
node electron_app/scripts/tests/convert_model_spawn.test.js
node electron_app/scripts/tests/realesrgan_paths.test.js
node electron_app/scripts/tests/to_file_url.test.js
node electron_app/scripts/tests/win_icon.test.js
node electron_app/scripts/tests/batch_queue_store.test.js
node electron_app/scripts/tests/download_resume.test.js
```
These mirror logic in `bridge.js` and the build scripts and run without Electron.

**Documentation screenshots** (real generated image composited into UI shots; **fails on placeholder content**):
```bash
./scripts/ensure_doc_screenshots.sh
# Requires: Electron running, cliclick (brew install cliclick), populated ~/.diffusionbee
```

**Installed-app UI smoke test** (launches `/Applications/diffusion-sd-ui.app`, generates an Arabic prompt, captures proof):
```bash
bash scripts/verify_installed_app_ui.sh
```

**Recommended order before opening a PR:** `lint` → `build:ui` → `test_prompt_generation.py` (smoke).

## Conventions

- **Vue 2.7**, Bootstrap 5 + Bootstrap-Vue 2, FontAwesome, custom CSS in `electron_app/src/assets/css/theme.css` (8px base, dark/light themes). Design system tokens: `docs/design_system.md`.
- **i18n**: `electron_app/src/i18n.js` + `app_state.isArabic` flag. Arabic strings use the **Tajawal** font and `dir="rtl"`. `vue.config.js` explicitly silences the `ResizeObserver` overlay in dev.
- **Eager vs lazy pages**: `Homepage` and `History` are eagerly imported in `PagesRouter.vue` so the welcome assets and history persistence are ready on first paint. Everything else is `() => import(...)`.
- **Model setup dialog** lives inline in `App.vue`; the inline "First-run Model Setup" overlay must be kept in sync with `scripts/lib/fixtures.py` (the catalog is the source of truth for required model IDs).
- **Standalone node assertion tests** are the project convention (no Jest/Mocha). When adding a new helper to `bridge.js` or build scripts, mirror it in `electron_app/scripts/tests/`.
- **No TypeScript.** ESLint via `@vue/cli-plugin-eslint` with `plugin:vue/essential` + `eslint:recommended` (`electron_app/.eslintrc.js`).
- **Node engine**: `>=26.0.0`, npm `>=10.0.0` (declared in `electron_app/package.json`).
- **pnpm workspace** is hoisted (`shamefullyHoist: true`, `publicHoistPattern: ["*"]`) — see `electron_app/pnpm-workspace.yaml`. Build-only deps are explicitly allow-listed.
- **macOS code signing**: `build/entitlements.mac.plist` + `afterSignHook.js`. App ID: `net.aldoy.diffusion-sd-ui`.

## Things that bite

- `IS_TEST=1` env var disables DevTools auto-open (`background.js:113`) and Vue Devtools install (`background.js:142`). Required for any headless capture script.
- `ELECTRON_RUN_AS_NODE` is unset by `electron:serve` (`env -u ELECTRON_RUN_AS_NODE sh -c ...`) — required to prevent vue-cli-plugin-electron-builder from spawning Electron as plain Node.
- `backends/stable_diffusion/venv` and `backends/stable_diffusion/venv311` both exist; the bridge only auto-discovers `venv311`. Other locations need `process.env.BIN_PATH`.
- `tensorflow==2.10.0` in `backends/stable_diffusion/requirements.txt` is **not** Python 3.11 compatible. The CI pins `numpy<2` and `scipy<1.14` first (see `appveyor.yml`); on macOS dev, `venv311` is used but tensor generation tests are slow/limited.
- The Python backend is fragile to relative `sys.path` manipulation (see top of `diffusionbee_backend.py`) — the dev launcher must be called with the script's actual CWD.
- `electron_app/.DS_Store` files are ignored by `extraResources` filters but the filter list (`vue.config.js`) is the authoritative whitelist — keep it in sync if adding new backend artifact directories.
- `node_modules/` and `package-lock.json` are present at the **root** even though `electron_app` uses pnpm. The root `package.json` is for build orchestration only; don't `npm install` new deps at the root.
- **keyv is pinned to 4.5.4** via `overrides` in `electron_app/pnpm-workspace.yaml` — do NOT unpin or bump it. keyv@6.0.0 (published 2026-08-04 from the compromised maintainer account) shipped a malicious preinstall worm (SNYK-JS-KEYV-18515941); keyv comes in transitively via `eslint → file-entry-cache → flat-cache` and `electron → @electron/get → got → cacheable-request`, both through `^4.x` ranges. The pin keeps future installs from resolving a malicious 4.x. (Note: keyv 5.x would break flat-cache 3.x — `new Keyv()` vs named-only exports.)
- **pnpm v11+ ignores the `"pnpm"` field in `electron_app/package.json`** (settings moved to `pnpm-workspace.yaml`); pnpm prints a warning listing ignored keys. Put overrides/settings in `pnpm-workspace.yaml`, not package.json.
- `ai-image-studio.html` (root) is a standalone browser-only UI mock — not part of the build.

## Source-of-truth files

- Commands and lifecycle: `package.json` (root) + `electron_app/package.json`
- Build pipeline: `electron_app/vue.config.js` (electron-builder config) + `electron_app/scripts/normalize-electron-path.js`
- IPC protocol: `electron_app/src/bridge.js`, `electron_app/src/py_vue_bridge.js`, `electron_app/src/preload.js`
- Test conventions: `electron_app/scripts/tests/`, `scripts/lib/`, `scripts/test_prompt_generation.py`
- Windows build: `.github/workflows/windows-build.yml`, `appveyor.yml`, `scripts/build-windows.js`
- Recon/design context (read-only references): `recon/_context_brief.md`, `docs/design_system.md`, `docs/design/inspiration-hub-mockup.html`
