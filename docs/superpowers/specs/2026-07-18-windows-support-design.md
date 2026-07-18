# Windows Support Design

Date: 2026-07-18

## Problem

DiffusionBee (this fork: `diffusion-sd-ui`) only truly works on macOS today. The Electron
main process assumes POSIX paths and a `python3`/`/tmp` environment, the bundled
Real-ESRGAN upscaler binary is macOS-only, the Python backend packaging pipeline
(`scripts/prepare_backend_for_packaging.sh`) only knows how to stage a macOS PyInstaller
build, and there is no CI. `electron_app/vue.config.js` already has a `win.NSIS`
electron-builder target block, so Windows packaging was anticipated but never finished.

Goal: fix the Windows-incompatible code paths, build out a real Windows packaging
pipeline for the Python backend, and add a GitHub Actions workflow that produces a
genuinely tested Windows NSIS installer on every push to `master`.

## Constraint that shapes this design

PyInstaller cannot cross-compile. The Windows `diffusionbee_backend.exe` can only be
built by running PyInstaller *on Windows*. There is no Windows machine or Wine
available in the environment this work is done in, so the Windows backend build and
the final NSIS packaging step must happen in CI (GitHub Actions `windows-latest`
runner), not locally. Local work is limited to code fixes, packaging scripts, and the
workflow definition itself; the workflow's first real run is the actual verification
that the pipeline works.

## Scope boundary

This does **not** touch any of the currently pending/uncommitted changes already in
the working tree (Vue components, docs, screenshots, etc. per `git status`). All new
work lands as additive edits or new files, kept in separate commits from any decision
about that pre-existing pending work.

This also does not attempt macOS-parity features that don't exist yet on Windows
upstream (e.g. GPU acceleration tuning) — the target is CPU/TensorFlow-standard
inference parity with what the current macOS build does, using the same
`tensorflow==2.10.0` backend already in `requirements.txt` (no CoreML/Metal-only code
exists today, so there's nothing OS-specific to port on the inference side itself).

## Components

### 1. Electron main-process cross-platform fixes

Files touched, each a targeted fix, not a rewrite:

- **`electron_app/src/bridge.js`** — `resolvePythonBin()`: add Windows venv candidates
  (`venv311\Scripts\python.exe`, `venv\Scripts\python.exe`, `.venv\Scripts\python.exe`)
  ahead of the POSIX ones, selected by `process.platform`; fallback command is `python`
  on Windows, `python3` elsewhere. Packaged-backend spawn (`backend_path`,
  `backend_path_nested`) tries the `.exe`-suffixed name first when
  `process.platform === 'win32'`.
- **`electron_app/src/native_functions.js`**:
  - `run_realesrgan()`: binary filename resolved by platform
    (`realesrgan_ncnn_macos` vs `realesrgan_ncnn_windows.exe`); `weights_path` built
    with `path.join(path.dirname(bin_path), 'models')` instead of string
    concatenation with a literal `/`; output path uses `path.join(os.tmpdir(), ...)`
    instead of hardcoded `/tmp/`.
  - `add_custom_pytorch_models()`: dev-mode spawn uses `python` on Windows / `python3`
    elsewhere; packaged fallback binary path tries `.exe` on Windows.
- **`electron_app/src/menu_template.js`** — `isMac` computed from
  `process.platform === 'darwin'` instead of hardcoded `true`.
- **`electron_app/src/utils.js`** — `toFileUrl()` recognizes Windows drive-letter
  absolute paths (`C:\...`, `C:/...`) in addition to POSIX absolute paths;
  `open_popup()` platform check uses `process.platform` (available via preload/main,
  already used elsewhere in the codebase) instead of sniffing `navigator.platform`
  for `"MAC"` only.
- **`electron_app/vue.config.js`** — Windows `icon` points at a real `.ico` (new file,
  generated from `build/Icon-1024.png`) instead of a `.png`; `win.target.arch` falls
  back the same way the mac block does:
  `process.env.BUILD_ARCH || process.arch || 'x64'`.

### 2. Python backend Windows packaging

New files:

- **`backends/stable_diffusion/diffusionbee_backend.spec`** — PyInstaller spec that
  produces a flat-directory Windows build (`diffusionbee_backend.exe` + its DLLs in
  one directory), mirroring the flat-layout requirement the macOS build already has
  (documented in the existing `.sh` script's comment about `libpython*.dylib`).
- **`scripts/prepare_backend_for_packaging.js`** — cross-platform (Node) equivalent of
  `prepare_backend_for_packaging.sh`, used by Windows CI. Stages
  `electron_app/.packaged-backend` from the PyInstaller output dir, using the same
  exclude list (`venv/`, `__pycache__/`, `*.pyc`, `.DS_Store`) via `fs`-based
  recursive copy (no external tool dependency, so it runs the same in CI and on a
  Windows dev machine). The existing `.sh` script is untouched and remains the
  macOS path.
- RealESRGAN Windows binary: not built from source — CI downloads the official
  prebuilt Windows release of `realesrgan-ncnn-vulkan` from its GitHub releases and
  stages it into the packaged core dir as `realesrgan_ncnn_windows.exe` alongside its
  `models/` folder, matching the existing macOS layout convention
  (`bin_path` + sibling `models/`).

### 3. Root script additions

`package.json` (root) gains, alongside the existing macOS scripts (unchanged):

```
"prepare:backend:win": "node scripts/prepare_backend_for_packaging.js",
"build:win": "npm run prepare:backend:win && cd electron_app && cross-env BACKEND_BUILD_PATH=../electron_app/.packaged-backend npm run electron:build -- --win"
```

`cross-env` is added as a root devDependency so the env var syntax works in CI's
`windows-latest` shell without needing POSIX `VAR=value` syntax. `BUILD_ARCH`/
`PYTHON_PATH` are not hardcoded for Windows — arch defaults via the `vue.config.js`
fallback above, and Python is resolved by `bridge.js`'s existing `resolvePythonBin`
logic / PATH `python` at PyInstaller-build time.

### 4. GitHub Actions workflow

New `.github/workflows/windows-build.yml`:

- **Trigger:** `push` to `master` (per your direction — no manual-dispatch-only gate).
- **Runner:** `windows-latest`.
- **Steps:**
  1. Checkout.
  2. Setup Python 3.11, `pip install -r backends/stable_diffusion/requirements.txt`.
  3. Run PyInstaller against `diffusionbee_backend.spec` → produces the `.exe` build
     output directory.
  4. Download + unpack the RealESRGAN Windows release into the PyInstaller output
     dir.
  5. Setup Node + pnpm, `pnpm install` in `electron_app`.
  6. `npm run prepare:backend:win` (root) to stage `.packaged-backend`.
  7. `npm run build:win` (root) → runs `vue-cli-service electron:build --win`,
     producing the NSIS installer via electron-builder.
  8. Upload the installer (`electron_app/dist_electron/*.exe`) as a workflow artifact.
- **Not in scope for this pass:** code signing (no Windows cert available) and
  auto-publishing to GitHub Releases — the artifact is uploaded for manual
  download/smoke-test first. Signing/release automation can be a follow-up once the
  pipeline is proven to work.

## Error handling

- If PyInstaller fails to find a dependency on Windows (common: hidden imports for
  `tensorflow`/`scipy`/`onnxruntime`), the spec file will need `hiddenimports`/
  `collect_submodules` entries — this is expected iteration during the first CI runs,
  not a design gap; the workflow will fail loudly (non-zero exit) rather than produce
  a silently broken installer.
- `resolvePythonBin`/binary-resolution fallbacks always end in a clearly logged
  `console.error` (matching existing behavior) rather than a silent no-op, so a
  missing binary on a user's Windows machine surfaces in the existing "Backend not
  found" error dialog path instead of hanging.

## Testing

- **Local (this machine, macOS):** existing macOS build/tests must remain unaffected
  — verify `npm run build` (mac path) still works after the shared-file edits
  (`native_functions.js`, `vue.config.js`), and existing Jest/lint if any pass.
- **Windows (CI only, since no Windows machine is available locally):** the workflow
  run itself is the test — a green run producing a downloadable NSIS `.exe` artifact
  is the acceptance bar for this design. Actually launching that installer and
  exercising a generation end-to-end needs a real Windows machine/VM, which is out of
  reach in this session — flagging this explicitly rather than claiming full
  verification.

## Out of scope

- Code signing the Windows installer.
- Auto-publishing releases.
- GPU-acceleration-specific Windows work (e.g. DirectML) beyond what plain
  `tensorflow` already provides — no such macOS-only acceleration code exists today
  to port.
- Touching any of the currently pending/uncommitted files unrelated to Windows
  support.
