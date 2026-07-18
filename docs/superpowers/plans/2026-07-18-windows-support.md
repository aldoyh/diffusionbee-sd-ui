# Windows Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every Windows-incompatible code path in the Electron app and Python backend, then add a GitHub Actions workflow that builds and packages a real, working Windows NSIS installer on every push to `master`.

**Architecture:** Small, targeted edits to the Electron main-process files that currently assume POSIX paths/binaries/commands, a new cross-platform Node staging script for the packaged backend, a new PyInstaller spec for the Windows backend build, and a `windows-latest` GitHub Actions job that chains: build Python backend `.exe` → stage it → build the Vue app → run electron-builder for NSIS.

**Tech Stack:** Electron 28, Vue 2 / vue-cli-plugin-electron-builder, Node.js, Python 3.11 + PyInstaller, GitHub Actions (`windows-latest` runner).

## Global Constraints

- Do not touch any of the files currently pending/uncommitted in the working tree beyond what each task explicitly names (per repo owner's direction — verify with `git status` before committing each task; if a target file already has unrelated uncommitted changes, edit around them, never revert them).
- No PyInstaller cross-compilation exists — the Windows backend `.exe` can only be built and verified inside the `windows-latest` CI job (see Task 10). Nothing before that task can be verified end-to-end locally; each earlier task's own "Test" step is the achievable local verification.
- No new heavy JS test framework (no existing jest/mocha in this repo) — verification scripts use only Node's built-in `assert` module, run directly with `node`.
- `electron_app/src/native_functions.js`, `electron_app/vue.config.js`, and `electron_app/package.json` already carry unrelated uncommitted changes (HF-token download support, package rename, artifact-name change). Tasks 2, 3, and 6 add to these files without touching those unrelated hunks.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `electron_app/src/bridge.js` | Modify | Spawns the Python backend process — needs Windows venv/python/`.exe` resolution |
| `electron_app/src/native_functions.js` | Modify | `run_realesrgan()` and `add_custom_pytorch_models()` spawn platform-specific binaries |
| `electron_app/src/menu_template.js` | Modify | App menu — `isMac` must reflect the real OS |
| `electron_app/src/utils.js` | Modify | `toFileUrl()` must produce valid `file://` URLs for Windows drive-letter paths |
| `electron_app/build/Icon.ico` | Create | Windows NSIS icon (electron-builder requires `.ico`, not `.png`, for `win.icon`) |
| `electron_app/vue.config.js` | Modify | `win` electron-builder target block — icon path + arch fallback |
| `backends/stable_diffusion/diffusionbee_backend.spec` | Create | PyInstaller spec producing a flat-directory Windows build of the backend |
| `scripts/prepare_backend_for_packaging.js` | Create | Cross-platform (Node) equivalent of the existing macOS-only `.sh` stager, used by Windows CI |
| `package.json` (root) | Modify | Add `prepare:backend:win` / `build:win` scripts + `cross-env` devDependency |
| `.github/workflows/windows-build.yml` | Create | CI job: build Python backend `.exe`, stage it, build NSIS installer, upload artifact |

---

### Task 1: `bridge.js` — cross-platform Python/backend process resolution

**Files:**
- Modify: `electron_app/src/bridge.js:20-33` (the `resolvePythonBin` function) and `electron_app/src/bridge.js:43-63` (the spawn branches in `start_bridge`)
- Test: `electron_app/scripts/tests/resolve_python_bin.test.js` (new)

**Interfaces:**
- Produces: `resolvePythonBin(scriptDir)` keeps its existing signature/behavior for macOS/Linux, gains Windows support. No other task depends on this function's internals, only that spawning succeeds on Windows.

This file runs in the Electron **main process** (`require('electron')` at the top), so `process.platform`, `path`, and `fs` are all fully available at runtime — no renderer/contextIsolation concerns here.

- [ ] **Step 1: Write the failing test**

Create `electron_app/scripts/tests/resolve_python_bin.test.js`:

```js
// Standalone assertion test (no framework needed) — run with: node electron_app/scripts/tests/resolve_python_bin.test.js
const assert = require('assert');
const path = require('path');

// Mirrors the venv-candidate selection logic in bridge.js's resolvePythonBin,
// parameterized by platform so both branches can be verified without an
// actual Electron runtime (bridge.js requires('electron') at module scope,
// which throws outside Electron, so we test the algorithm directly here).
function venvCandidates(scriptDir, platform) {
    if (platform === 'win32') {
        return [
            path.join(scriptDir, 'venv311', 'Scripts', 'python.exe'),
            path.join(scriptDir, 'venv', 'Scripts', 'python.exe'),
            path.join(scriptDir, '.venv', 'Scripts', 'python.exe'),
        ];
    }
    return [
        path.join(scriptDir, 'venv311', 'bin', 'python3'),
        path.join(scriptDir, 'venv', 'bin', 'python3'),
        path.join(scriptDir, '.venv', 'bin', 'python3'),
    ];
}

function fallbackCommand(platform) {
    return platform === 'win32' ? 'python' : 'python3';
}

assert.strictEqual(
    venvCandidates('/scripts', 'win32')[0],
    path.join('/scripts', 'venv311', 'Scripts', 'python.exe')
);
assert.strictEqual(
    venvCandidates('/scripts', 'darwin')[0],
    path.join('/scripts', 'venv311', 'bin', 'python3')
);
assert.strictEqual(fallbackCommand('win32'), 'python');
assert.strictEqual(fallbackCommand('darwin'), 'python3');

console.log('resolve_python_bin.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node electron_app/scripts/tests/resolve_python_bin.test.js`

Expected: passes already (this test only checks the standalone helper functions defined in the test file itself, which don't exist in `bridge.js` yet — this is a spec-first check of the *algorithm*, not the real file). Confirm it prints `resolve_python_bin.test.js: all assertions passed` before moving on — this locks in the exact behavior Step 3 must replicate inside `bridge.js`.

- [ ] **Step 3: Implement the fix in `bridge.js`**

Replace the current `resolvePythonBin` function (lines 20-33):

```js
    // Helper: if a .venv or venv dir exists next to a Python script, use its Python binary
    function resolvePythonBin(scriptDir) {
        let isWin = process.platform === 'win32';
        let venvCandidates = isWin ? [
            path.join(scriptDir, 'venv311', 'Scripts', 'python.exe'),
            path.join(scriptDir, 'venv', 'Scripts', 'python.exe'),
            path.join(scriptDir, '.venv', 'Scripts', 'python.exe'),
        ] : [
            path.join(scriptDir, 'venv311', 'bin', 'python3'),
            path.join(scriptDir, 'venv', 'bin', 'python3'),
            path.join(scriptDir, '.venv', 'bin', 'python3'),
        ];
        for (let candidate of venvCandidates) {
            if (fs.existsSync(candidate)) {
                console.log('Using venv Python:', candidate);
                return candidate;
            }
        }
        return isWin ? 'python' : 'python3'; // fallback to system interpreter
    }
```

Then, in `start_bridge`, replace lines 35-63 (backend path resolution + spawn branches) so the packaged `.exe` is tried on Windows before the extension-less name:

```js
    let bin_path = process.env.BIN_PATH;
    let core_root = path.join(path.dirname(__dirname), 'core');
    let isWin = process.platform === 'win32';
    let backend_names = isWin ? ['diffusionbee_backend.exe', 'diffusionbee_backend'] : ['diffusionbee_backend'];
    let backend_path = backend_names.map(n => path.join(core_root, n)).find(p => fs.existsSync(p))
        || path.join(core_root, backend_names[0]);
    let backend_path_nested = backend_names.map(n => path.join(core_root, 'stable_diffusion', n)).find(p => fs.existsSync(p))
        || path.join(core_root, 'stable_diffusion', backend_names[0]);
    let backend_script_path = path.join(core_root, 'stable_diffusion', 'diffusionbee_backend.py');
    let dev_script_path = process.env.PY_SCRIPT
        || path.resolve(__dirname, '..', '..', 'backends', 'stable_diffusion', 'diffusionbee_backend.py');

    if (bin_path && fs.existsSync(bin_path)) {
        python = require('child_process').spawn(bin_path);
    } else if (app.isPackaged) {
        if (fs.existsSync(backend_path)) {
            python = require('child_process').spawn(backend_path);
        } else if (fs.existsSync(backend_path_nested)) {
            python = require('child_process').spawn(backend_path_nested);
        } else if (fs.existsSync(backend_script_path)) {
            let pythonBin = resolvePythonBin(path.dirname(backend_script_path));
            python = require('child_process').spawn(pythonBin, [backend_script_path]);
        } else {
            console.error("Backend not found in packaged core at: " + backend_path);
        }
    } else if (fs.existsSync(dev_script_path)) {
        let pythonBin = resolvePythonBin(path.dirname(dev_script_path));
        python = require('child_process').spawn(pythonBin, [dev_script_path]);
    } else if (fs.existsSync(backend_path)) {
        python = require('child_process').spawn(backend_path);
    } else {
        console.error("Backend not found at: " + dev_script_path);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node electron_app/scripts/tests/resolve_python_bin.test.js`

Expected: `resolve_python_bin.test.js: all assertions passed` (unchanged — this test locks the algorithm; the real regression check is that `electron_app/src/bridge.js` now contains the identical branching logic, confirmed by code review in Step 5).

- [ ] **Step 5: Verify `bridge.js` still parses and the macOS path is unaffected**

Run: `node --check electron_app/src/bridge.js`

Expected: no output (syntax OK). Also run `git diff electron_app/src/bridge.js` and confirm the only changes are within `resolvePythonBin` and the backend-path/spawn block — nothing else in the file moved.

- [ ] **Step 6: Commit**

```bash
git add electron_app/src/bridge.js electron_app/scripts/tests/resolve_python_bin.test.js
git commit -m "fix: resolve Windows Python venv paths and .exe backend in bridge.js"
```

---

### Task 2: `native_functions.js` — `run_realesrgan()` cross-platform binary + paths

**Files:**
- Modify: `electron_app/src/native_functions.js:443-449` (inside `run_realesrgan`)
- Test: `electron_app/scripts/tests/realesrgan_paths.test.js` (new)

**Interfaces:**
- Produces: on Windows, `run_realesrgan` now looks for `realesrgan_ncnn_windows.exe` (a file Task 8's staging script must place in the packaged core dir next to a `models/` folder — Task 8 must use this exact filename).

This file runs in the Electron **main process** (`require('electron').ipcMain` at top), so `process.platform`/`path`/`os` are fully available.

- [ ] **Step 1: Write the failing test**

Create `electron_app/scripts/tests/realesrgan_paths.test.js`:

```js
// Run with: node electron_app/scripts/tests/realesrgan_paths.test.js
const assert = require('assert');
const path = require('path');
const os = require('os');

function realesrganBinName(platform) {
    return platform === 'win32' ? 'realesrgan_ncnn_windows.exe' : 'realesrgan_ncnn_macos';
}

function weightsPathFor(bin_path) {
    return path.join(path.dirname(bin_path), 'models');
}

function outPathFor(tmpdir) {
    return path.join(tmpdir, Math.random() + '.png');
}

assert.strictEqual(realesrganBinName('win32'), 'realesrgan_ncnn_windows.exe');
assert.strictEqual(realesrganBinName('darwin'), 'realesrgan_ncnn_macos');
assert.strictEqual(
    weightsPathFor(path.join('C:', 'app', 'core', 'realesrgan_ncnn_windows.exe')),
    path.join('C:', 'app', 'core', 'models')
);
assert.ok(outPathFor(os.tmpdir()).startsWith(os.tmpdir()));

console.log('realesrgan_paths.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node electron_app/scripts/tests/realesrgan_paths.test.js`

Expected: `realesrgan_paths.test.js: all assertions passed` — this locks in the exact filename/path logic Step 3 must replicate in the real function.

- [ ] **Step 3: Implement the fix in `native_functions.js`**

Replace lines 443-449 (current):

```js
function run_realesrgan(input_path , cb ){
    const path = require('path');
    let out_path = "/tmp/"+Math.random()+".png";
    const fs = require('fs');
    let bin_path =  process.env.REALESRGAN_BIN || path.join(path.dirname(__dirname), 'core' , 'realesrgan_ncnn_macos' );
    let weights_path = bin_path.replaceAll("realesrgan_ncnn_macos" , "models") + "/";
    let proc = require('child_process').spawn( bin_path  , ['-m' , weights_path , '-i' , input_path , '-o' , out_path ]);
```

with:

```js
function run_realesrgan(input_path , cb ){
    const path = require('path');
    const os = require('os');
    let out_path = path.join(os.tmpdir(), Math.random()+".png");
    const fs = require('fs');
    let default_bin_name = process.platform === 'win32' ? 'realesrgan_ncnn_windows.exe' : 'realesrgan_ncnn_macos';
    let bin_path =  process.env.REALESRGAN_BIN || path.join(path.dirname(__dirname), 'core' , default_bin_name );
    let weights_path = path.join(path.dirname(bin_path), 'models');
    let proc = require('child_process').spawn( bin_path  , ['-m' , weights_path , '-i' , input_path , '-o' , out_path ]);
```

(The rest of `run_realesrgan` — the `console.log`, `stderr`/`stdout` handlers, and `close` handler — is unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node electron_app/scripts/tests/realesrgan_paths.test.js`

Expected: `realesrgan_paths.test.js: all assertions passed`.

- [ ] **Step 5: Verify no syntax errors and no unrelated diff**

Run: `node --check electron_app/src/native_functions.js`

Expected: no output. Then `git diff electron_app/src/native_functions.js` and confirm only the `run_realesrgan` lines changed (the file has unrelated pending HF-token changes elsewhere — leave them untouched).

- [ ] **Step 6: Commit**

```bash
git add electron_app/src/native_functions.js electron_app/scripts/tests/realesrgan_paths.test.js
git commit -m "fix: cross-platform RealESRGAN binary/path resolution"
```

---

### Task 3: `native_functions.js` — `add_custom_pytorch_models()` cross-platform python command

**Files:**
- Modify: `electron_app/src/native_functions.js:490-494`
- Test: `electron_app/scripts/tests/convert_model_spawn.test.js` (new)

**Interfaces:**
- Consumes: nothing from Task 1/2.
- Produces: on Windows, the dev-mode conversion path spawns `python` instead of `python3`; the packaged fallback binary path tries `diffusionbee_backend.exe` first (same naming convention Task 1 establishes for the main backend binary).

- [ ] **Step 1: Write the failing test**

Create `electron_app/scripts/tests/convert_model_spawn.test.js`:

```js
// Run with: node electron_app/scripts/tests/convert_model_spawn.test.js
const assert = require('assert');
const path = require('path');

function pythonCommand(platform) {
    return platform === 'win32' ? 'python' : 'python3';
}

function backendBinName(platform) {
    return platform === 'win32' ? 'diffusionbee_backend.exe' : 'diffusionbee_backend';
}

assert.strictEqual(pythonCommand('win32'), 'python');
assert.strictEqual(pythonCommand('darwin'), 'python3');
assert.strictEqual(
    path.join('core', backendBinName('win32')),
    path.join('core', 'diffusionbee_backend.exe')
);

console.log('convert_model_spawn.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node electron_app/scripts/tests/convert_model_spawn.test.js`

Expected: `convert_model_spawn.test.js: all assertions passed`.

- [ ] **Step 3: Implement the fix in `native_functions.js`**

Replace lines 490-494 (current):

```js
    if (fs.existsSync(script_path)) {
        proc = require('child_process').spawn( "python3"  , [ script_path ,  "convert_model" ,  pytorch_model_path , out_path ]);
    } else {
        let bin_path =  path.join(path.dirname(__dirname), 'core' , 'diffusionbee_backend' );
        proc = require('child_process').spawn( bin_path  , [ "convert_model" ,  pytorch_model_path , out_path ]);
    }
```

with:

```js
    if (fs.existsSync(script_path)) {
        let python_cmd = process.platform === 'win32' ? 'python' : 'python3';
        proc = require('child_process').spawn( python_cmd  , [ script_path ,  "convert_model" ,  pytorch_model_path , out_path ]);
    } else {
        let backend_bin_name = process.platform === 'win32' ? 'diffusionbee_backend.exe' : 'diffusionbee_backend';
        let bin_path =  path.join(path.dirname(__dirname), 'core' , backend_bin_name );
        proc = require('child_process').spawn( bin_path  , [ "convert_model" ,  pytorch_model_path , out_path ]);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node electron_app/scripts/tests/convert_model_spawn.test.js`

Expected: `convert_model_spawn.test.js: all assertions passed`.

- [ ] **Step 5: Verify no syntax errors**

Run: `node --check electron_app/src/native_functions.js`

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add electron_app/src/native_functions.js electron_app/scripts/tests/convert_model_spawn.test.js
git commit -m "fix: use platform-correct python command for model conversion"
```

---

### Task 4: `menu_template.js` — real platform detection for `isMac`

**Files:**
- Modify: `electron_app/src/menu_template.js:5`

**Interfaces:**
- Produces: `isMac` now reflects the real OS, so the `File` menu's `close` vs `quit` role and the mac-only app-menu submenu are correct on Windows. No other task depends on this.

This file is imported by `background.js` (main process, confirmed via `import {menu_template} from "./menu_template"` at `background.js:23`), so `process.platform` is available.

- [ ] **Step 1: Write the failing test**

There's no existing test harness for this file and the fix is a one-line, unambiguous platform check with no branching logic worth a standalone test script (unlike Tasks 1-3, there's no algorithm to lock in beyond `process.platform === 'darwin'` itself). Skip to implementation, per the "don't add tests for scenarios that can't meaningfully fail differently" principle — this step is a direct, visually-verifiable substitution.

- [ ] **Step 2: Implement the fix**

Replace line 5 of `electron_app/src/menu_template.js`:

```js
let isMac = true;
```

with:

```js
let isMac = process.platform === 'darwin';
```

- [ ] **Step 3: Verify no syntax errors**

Run: `node --check electron_app/src/menu_template.js`

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add electron_app/src/menu_template.js
git commit -m "fix: derive isMac from process.platform instead of hardcoding true"
```

---

### Task 5: `utils.js` — `toFileUrl()` must handle Windows drive-letter paths

**Files:**
- Modify: `electron_app/src/utils.js:28-39`
- Test: `electron_app/scripts/tests/to_file_url.test.js` (new)

**Interfaces:**
- Produces: `toFileUrl(path)` keeps its existing signature and POSIX behavior, adds correct handling for Windows absolute paths (`C:\Users\...` and `C:/Users/...`).

**Important — do not change `open_popup()`'s platform check.** The audit that fed this plan flagged `utils.js:118` (`navigator.platform.toUpperCase().indexOf('MAC')`) as a possible issue, but it is not one: this file runs in the **renderer** process, where `contextIsolation` is enabled (confirmed via `electron_app/src/preload.js`, which uses `contextBridge` and never exposes `process`), so `process.platform` is not reliably available here — the existing codebase already defends against this exact gap with a `typeof process !== 'undefined'` guard in `electron_app/src/utils/model_selection.js:39`. `navigator.platform` already behaves correctly on Windows: it simply won't match `"MAC"`, so the Mac-only `frame:false` popup option is skipped and Windows gets its normal framed popup window, which is the correct behavior. Leave `open_popup()` unchanged.

- [ ] **Step 1: Write the failing test**

Create `electron_app/scripts/tests/to_file_url.test.js`:

```js
// Run with: node electron_app/scripts/tests/to_file_url.test.js
const assert = require('assert');

function toFileUrl(p) {
    if (!p) {
        return '';
    }
    if (p.startsWith('file://') || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:') || p.startsWith('blob:')) {
        return p;
    }
    // Windows drive-letter absolute path, e.g. C:\Users\... or C:/Users/...
    if (/^[a-zA-Z]:[\\/]/.test(p)) {
        return 'file:///' + p.replace(/\\/g, '/');
    }
    if (p.startsWith('/')) {
        return 'file://' + p;
    }
    return 'file://' + p;
}

assert.strictEqual(toFileUrl('/Users/foo/bar.png'), 'file:///Users/foo/bar.png');
assert.strictEqual(toFileUrl('C:\\Users\\foo\\bar.png'), 'file:///C:/Users/foo/bar.png');
assert.strictEqual(toFileUrl('C:/Users/foo/bar.png'), 'file:///C:/Users/foo/bar.png');
assert.strictEqual(toFileUrl('https://example.com/x.png'), 'https://example.com/x.png');
assert.strictEqual(toFileUrl(''), '');

console.log('to_file_url.test.js: all assertions passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node electron_app/scripts/tests/to_file_url.test.js`

Expected: `to_file_url.test.js: all assertions passed` (this test file contains the target implementation inline so the exact expected strings are locked in before editing the real file — this mirrors what Step 3 must produce byte-for-byte).

- [ ] **Step 3: Implement the fix in `utils.js`**

Replace lines 28-39 (current):

```js
function toFileUrl(path) {
    if (!path) {
        return '';
    }
    if (path.startsWith('file://') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }
    if (path.startsWith('/')) {
        return 'file://' + path;
    }
    return 'file://' + path;
}
```

with:

```js
function toFileUrl(path) {
    if (!path) {
        return '';
    }
    if (path.startsWith('file://') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }
    // Windows drive-letter absolute path, e.g. C:\Users\... or C:/Users/...
    if (/^[a-zA-Z]:[\\/]/.test(path)) {
        return 'file:///' + path.replace(/\\/g, '/');
    }
    if (path.startsWith('/')) {
        return 'file://' + path;
    }
    return 'file://' + path;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node electron_app/scripts/tests/to_file_url.test.js`

Expected: `to_file_url.test.js: all assertions passed`.

- [ ] **Step 5: Verify no syntax errors and no unrelated diff**

Run: `node --check electron_app/src/utils.js`

Expected: no output. Confirm via `git diff electron_app/src/utils.js` that `open_popup()` is untouched.

- [ ] **Step 6: Commit**

```bash
git add electron_app/src/utils.js electron_app/scripts/tests/to_file_url.test.js
git commit -m "fix: handle Windows drive-letter paths in toFileUrl"
```

---

### Task 6: Windows `.ico` icon + `vue.config.js` win-target fixes

**Files:**
- Create: `electron_app/build/Icon.ico`
- Modify: `electron_app/vue.config.js:96,99-102` (the `win` builder-options block)
- Test: `electron_app/scripts/tests/win_icon.test.js` (new)

**Interfaces:**
- Produces: `electron_app/build/Icon.ico`, referenced by `vue.config.js`'s `win.icon`. No other task depends on this file's contents, only its existence at this path.

- [ ] **Step 1: Generate the `.ico` file**

Run (uses ImageMagick, already installed at `/opt/homebrew/bin/magick`):

```bash
magick electron_app/build/Icon-256.png electron_app/build/Icon-128.png electron_app/build/Icon-64.png electron_app/build/Icon-32.png electron_app/build/Icon.ico
```

Expected: `electron_app/build/Icon.ico` created with no error output.

- [ ] **Step 2: Write a test verifying the `.ico` file is valid**

Create `electron_app/scripts/tests/win_icon.test.js`:

```js
// Run with: node electron_app/scripts/tests/win_icon.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const icoPath = path.join(__dirname, '..', '..', 'build', 'Icon.ico');
assert.ok(fs.existsSync(icoPath), 'Icon.ico must exist at electron_app/build/Icon.ico');

const buf = fs.readFileSync(icoPath);
// ICO file header: reserved(2)=0x0000, type(2)=0x0001 (icon), count(2)>0
assert.strictEqual(buf.readUInt16LE(0), 0, 'ICO reserved field must be 0');
assert.strictEqual(buf.readUInt16LE(2), 1, 'ICO type field must be 1 (icon)');
assert.ok(buf.readUInt16LE(4) > 0, 'ICO must contain at least one image');

console.log('win_icon.test.js: all assertions passed');
```

- [ ] **Step 3: Run test to verify it passes**

Run: `node electron_app/scripts/tests/win_icon.test.js`

Expected: `win_icon.test.js: all assertions passed`. If it fails on the header checks, Step 1's `magick` invocation produced an invalid file — re-run Step 1 and check `magick`'s exit code.

- [ ] **Step 4: Fix `vue.config.js`'s `win` target block**

Replace (current, lines ~94-102):

```js
                "win": {
                    "icon" : "build/Icon-1024.png" , 
                    "target": {
                        "target": "NSIS",
                        "arch": [
                            process.arch   
                        ]
                    }
                }
```

with:

```js
                "win": {
                    "icon" : "build/Icon.ico" ,
                    "target": {
                        "target": "NSIS",
                        "arch": [
                            process.env.BUILD_ARCH || process.arch || 'x64'
                        ]
                    }
                }
```

- [ ] **Step 5: Verify no syntax errors and no unrelated diff**

Run: `node --check electron_app/vue.config.js`

Expected: no output. Confirm via `git diff electron_app/vue.config.js` that only the `win` block changed (the file has an unrelated pending `appId`/`artifactName` change and a pending `mac.target.arch` fallback change — leave those as-is).

- [ ] **Step 6: Commit**

```bash
git add electron_app/build/Icon.ico electron_app/vue.config.js electron_app/scripts/tests/win_icon.test.js
git commit -m "fix: add real Windows .ico icon and arch fallback for NSIS target"
```

---

### Task 7: PyInstaller spec for the Windows backend build

**Files:**
- Create: `backends/stable_diffusion/diffusionbee_backend.spec`

**Interfaces:**
- Consumes: `backends/stable_diffusion/diffusionbee_backend.py` as entry point (already handles being frozen — see `if not (getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'))` at the top of that file, so no backend code changes are needed).
- Produces: a PyInstaller build, when run with `pyinstaller diffusionbee_backend.spec` from `backends/stable_diffusion/`, that outputs a flat `dist/diffusionbee_backend/` directory containing `diffusionbee_backend.exe` and its dependent DLLs side-by-side (matching the flat-layout requirement the existing macOS `.sh` script documents). Task 8's staging script and Task 10's CI workflow both read from this `dist/diffusionbee_backend/` directory.

This spec can only be *run* on Windows (PyInstaller doesn't cross-compile), so there is no local "run it and see it pass" step here — the file's correctness is verified in Task 10's CI job. This task's deliverable is the spec file itself, reviewed against the backend's actual import graph.

- [ ] **Step 1: Write the spec file**

Create `backends/stable_diffusion/diffusionbee_backend.spec`:

```python
# -*- mode: python ; coding: utf-8 -*-
# Windows PyInstaller spec for the DiffusionBee backend.
# Run from backends/stable_diffusion/ with: pyinstaller diffusionbee_backend.spec
# Produces a FLAT dist/diffusionbee_backend/ directory (exe + DLLs together),
# matching the layout electron's bridge.js and prepare_backend_for_packaging.js expect.

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

hiddenimports = (
    collect_submodules('tensorflow')
    + collect_submodules('onnxruntime')
    + collect_submodules('scipy')
    + collect_submodules('skimage')
    + ['cv2', 'safetensors', 'safetensors.numpy', 'pandas', 'numexpr']
)

datas = (
    collect_data_files('tensorflow')
    + collect_data_files('onnxruntime')
)

a = Analysis(
    ['diffusionbee_backend.py'],
    pathex=['.', '../model_converter', '../stable_diffusion_tf_models'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='diffusionbee_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='diffusionbee_backend',
)
```

- [ ] **Step 2: Review against the backend's actual imports**

Run: `grep -rn "^import \|^from " backends/stable_diffusion/stable_diffusion/*.py backends/stable_diffusion/applets/*.py backends/model_converter/*.py backends/stable_diffusion_tf_models/*.py`

Expected output: a list of imports. Cross-check every third-party package named there (e.g. `tensorflow`, `scipy`, `onnxruntime`, `cv2`, `safetensors`, `PIL`, `pandas`) appears either directly in `hiddenimports` or is a normal top-level import PyInstaller's `Analysis` will already discover via static analysis (only packages using dynamic/plugin-style imports — `tensorflow`, `onnxruntime`, `scipy`, `skimage` — need the explicit `collect_submodules` treatment above; `PIL`, direct `cv2`, `pandas` top-level imports are picked up automatically by `Analysis` and are listed here only as a defensive backstop). If a new third-party package not covered above shows up, add it to `hiddenimports`.

- [ ] **Step 3: Commit**

```bash
git add backends/stable_diffusion/diffusionbee_backend.spec
git commit -m "feat: add PyInstaller spec for Windows backend build"
```

---

### Task 8: Cross-platform backend staging script for Windows CI

**Files:**
- Create: `scripts/prepare_backend_for_packaging.js`
- Test: run the script itself against a fixture directory (Step 3 below) — this one *is* locally testable since it's pure Node `fs` logic with no Windows-only dependency.

**Interfaces:**
- Consumes: a source directory (PyInstaller's `dist/diffusionbee_backend/` from Task 7, passed via `--source`) and, on Windows, a downloaded RealESRGAN release directory (passed via `--realesrgan`).
- Produces: `electron_app/.packaged-backend/`, populated the same way the existing `.sh` script populates it for macOS — this is what `vue.config.js`'s `extraResources` config (`from: process.env.BACKEND_BUILD_PATH || '../electron_app/.packaged-backend'`) stages into the built app's `core/` directory. Must place the RealESRGAN binary as `realesrgan_ncnn_windows.exe` (the exact filename Task 2 looks for) alongside a `models/` subfolder.

- [ ] **Step 1: Write the script**

Create `scripts/prepare_backend_for_packaging.js`:

```js
#!/usr/bin/env node
// Cross-platform equivalent of prepare_backend_for_packaging.sh, for Windows CI.
// Usage: node scripts/prepare_backend_for_packaging.js --source <pyinstaller-dist-dir> [--realesrgan <realesrgan-release-dir>]

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--source') args.source = argv[++i];
        if (argv[i] === '--realesrgan') args.realesrgan = argv[++i];
    }
    return args;
}

function copyRecursiveExcluding(src, dest, excludeNames) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (excludeNames.has(entry.name)) continue;
        if (entry.name.endsWith('.pyc')) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursiveExcluding(srcPath, destPath, excludeNames);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.source) {
        console.error('[prepare-backend] ERROR: --source <pyinstaller-dist-dir> is required');
        process.exit(1);
    }

    const root = path.resolve(__dirname, '..');
    const stage = path.join(root, 'electron_app', '.packaged-backend');

    if (!fs.existsSync(args.source)) {
        console.error(`[prepare-backend] ERROR: source dir not found: ${args.source}`);
        process.exit(1);
    }

    fs.rmSync(stage, { recursive: true, force: true });
    fs.mkdirSync(stage, { recursive: true });

    const excludeNames = new Set(['venv', 'venv311', '.venv', '__pycache__', '.DS_Store', '.git']);
    copyRecursiveExcluding(args.source, stage, excludeNames);

    if (args.realesrgan) {
        if (!fs.existsSync(args.realesrgan)) {
            console.error(`[prepare-backend] WARNING: realesrgan dir not found: ${args.realesrgan} — upscaling will not work`);
        } else {
            for (const entry of fs.readdirSync(args.realesrgan, { withFileTypes: true })) {
                const srcPath = path.join(args.realesrgan, entry.name);
                let destName = entry.name;
                // The upstream release ships an exe named realesrgan-ncnn-vulkan.exe (or similar);
                // rename to the exact name native_functions.js's run_realesrgan() looks for.
                if (entry.name.toLowerCase().endsWith('.exe')) {
                    destName = 'realesrgan_ncnn_windows.exe';
                }
                const destPath = path.join(stage, destName);
                if (entry.isDirectory()) {
                    copyRecursiveExcluding(srcPath, destPath, excludeNames);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }
    }

    const hasExe = fs.existsSync(path.join(stage, 'diffusionbee_backend.exe'));
    const hasScript = fs.existsSync(path.join(stage, 'stable_diffusion', 'diffusionbee_backend.py'));
    if (!hasExe && !hasScript) {
        console.error('[prepare-backend] ERROR: No runnable backend in staged core');
        process.exit(1);
    }

    console.log(`[prepare-backend] Staged backend at ${stage}`);
}

main();
```

- [ ] **Step 2: Add a `bin`-less package script entry so it's runnable via `npm run`**

This is done in Task 9 (root `package.json`), not here — Task 8's deliverable is just the script file, runnable directly via `node`.

- [ ] **Step 3: Test locally against a fixture (this works on any OS — pure Node `fs` logic)**

Run:

```bash
mkdir -p /tmp/pyinstaller-fixture/stable_diffusion
echo "print('fake backend')" > /tmp/pyinstaller-fixture/stable_diffusion/diffusionbee_backend.py
mkdir -p /tmp/pyinstaller-fixture/__pycache__
touch /tmp/pyinstaller-fixture/__pycache__/should_be_excluded.pyc
node scripts/prepare_backend_for_packaging.js --source /tmp/pyinstaller-fixture
ls electron_app/.packaged-backend/stable_diffusion/diffusionbee_backend.py
ls electron_app/.packaged-backend/__pycache__ 2>&1 | grep -q "No such file" && echo "OK: __pycache__ excluded"
rm -rf /tmp/pyinstaller-fixture electron_app/.packaged-backend
```

Expected: the `diffusionbee_backend.py` path prints successfully, and `OK: __pycache__ excluded` is printed (confirming the exclude list works). Then confirm cleanup: `ls electron_app/.packaged-backend` should report "No such file or directory".

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare_backend_for_packaging.js
git commit -m "feat: add cross-platform backend staging script for Windows CI"
```

---

### Task 9: Root `package.json` — Windows build scripts

**Files:**
- Modify: `package.json` (root), scripts section
- Modify: `package.json` (root), add `cross-env` devDependency
- Test: run `npm run build:win --dry-run`-equivalent check (Step 3 below)

**Interfaces:**
- Consumes: `scripts/prepare_backend_for_packaging.js` (Task 8), `electron_app`'s existing `electron:build` script (unchanged — it already accepts electron-builder passthrough flags like `--win` via `vue-cli-plugin-electron-builder`).
- Produces: `npm run build:win` and `npm run prepare:backend:win` at the repo root, used by Task 10's CI workflow.

- [ ] **Step 1: Add `cross-env` as a devDependency**

Run: `npm install --save-dev cross-env --package-lock-only=false`

Expected: `package.json` gains a `devDependencies` entry for `cross-env`, and `package-lock.json` updates. If this repo doesn't already have a root `devDependencies` block, one is created.

- [ ] **Step 2: Add the Windows scripts**

In root `package.json`, add these two entries to the `"scripts"` object (alongside the existing `prepare:backend`/`build`/`build:install`/`build:dir`, which stay exactly as they are for macOS):

```json
    "prepare:backend:win": "node scripts/prepare_backend_for_packaging.js --source backends/stable_diffusion/dist/diffusionbee_backend --realesrgan realesrgan-release",
    "build:win": "npm run prepare:backend:win && cd electron_app && cross-env BACKEND_BUILD_PATH=../electron_app/.packaged-backend npm run electron:build -- --win",
```

- [ ] **Step 3: Verify the scripts are syntactically wired correctly**

Run: `node -e "const p = require('./package.json'); if (!p.scripts['build:win'] || !p.scripts['prepare:backend:win']) { console.error('missing script'); process.exit(1);} console.log('OK: scripts present')"`

Expected: `OK: scripts present`.

Note: `npm run build:win` cannot be fully exercised on macOS (no `dist/diffusionbee_backend` exists locally — that only exists after Task 7's spec is run by PyInstaller on Windows, in CI). This step only verifies the script is registered and well-formed; Task 10's CI run is the real end-to-end test.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add root build:win / prepare:backend:win scripts"
```

---

### Task 10: GitHub Actions workflow — Windows CI build

**Files:**
- Create: `.github/workflows/windows-build.yml`

**Interfaces:**
- Consumes: `backends/stable_diffusion/diffusionbee_backend.spec` (Task 7), `scripts/prepare_backend_for_packaging.js` (Task 8), `package.json`'s `prepare:backend:win`/`build:win` (Task 9), `electron_app/build/Icon.ico` + fixed `vue.config.js` win block (Task 6).
- Produces: a workflow artifact named `windows-installer` containing the NSIS `.exe`, attached to every workflow run on `master`. This is the deliverable that proves the whole chain (Tasks 1-9) actually works together on real Windows — the acceptance bar the design spec sets, since no local Windows environment is available.

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/windows-build.yml`:

```yaml
name: Windows Build

on:
  push:
    branches: [master]

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install backend Python dependencies
        run: pip install -r backends/stable_diffusion/requirements.txt

      - name: Build backend with PyInstaller
        working-directory: backends/stable_diffusion
        run: pyinstaller diffusionbee_backend.spec

      - name: Download RealESRGAN Windows release
        shell: pwsh
        run: |
          $url = "https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases/latest/download/realesrgan-ncnn-vulkan-windows.zip"
          Invoke-WebRequest -Uri $url -OutFile realesrgan.zip
          Expand-Archive -Path realesrgan.zip -DestinationPath realesrgan-release

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install root dependencies
        run: npm install

      - name: Install electron_app dependencies
        working-directory: electron_app
        run: pnpm install

      - name: Stage backend for packaging
        run: npm run prepare:backend:win

      - name: Build Windows installer
        run: npm run build:win

      - name: Upload installer artifact
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: electron_app/dist_electron/*.exe
          if-no-files-found: error
```

- [ ] **Step 2: Validate the workflow YAML syntax locally**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/windows-build.yml'))" && echo "OK: valid YAML"`

Expected: `OK: valid YAML`. (If `pyyaml` isn't installed, run `pip install pyyaml` first, or use `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/windows-build.yml', 'utf8'))"` if `js-yaml` is available in `node_modules` instead.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/windows-build.yml
git commit -m "ci: add Windows build workflow producing a tested NSIS installer"
```

- [ ] **Step 4: Push and watch the first real run**

Run: `git push origin master`

Then check the workflow run: `gh run list --workflow=windows-build.yml --limit 1` and `gh run watch <run-id>` (substitute the run ID from the list command).

Expected: the run either succeeds (green, with a `windows-installer` artifact attached — download it and confirm on a Windows machine/VM that the installer runs and generation works) or fails with a specific, actionable error (most likely a missing `hiddenimports` entry in Task 7's spec, or a changed RealESRGAN release asset filename in Step 1's download URL — both are one-line fixes to iterate on, not a design problem). This first run is the actual verification the whole plan has been building toward — do not consider Windows support complete until it's green and someone has smoke-tested the resulting installer on real Windows.

---

## Self-Review Notes

- **Spec coverage:** Section 1 (Electron/JS fixes) → Tasks 1-6. Section 2 (Python backend packaging) → Tasks 7-8. Section 3 (electron-builder + root scripts) → Tasks 6, 9. Section 4 (CI workflow) → Task 10. The spec's `open_popup()`/`utils.js:118` audit item was investigated during planning and found to be a non-issue (documented in Task 5) rather than silently dropped.
- **No placeholders:** every step has complete, runnable code and exact commands.
- **Type/name consistency checked:** `realesrgan_ncnn_windows.exe` (Task 2's expected filename) matches the rename Task 8's staging script performs; `diffusionbee_backend.exe` (Task 1 and Task 3's expected filename) matches the `name='diffusionbee_backend'` in Task 7's spec (PyInstaller appends `.exe` automatically on Windows); `dist/diffusionbee_backend` (Task 7's output dir) matches the `--source` path Task 9's `prepare:backend:win` script passes.
