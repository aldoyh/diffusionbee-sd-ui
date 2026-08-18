# R2 CRITIC — FLUX.1 binary verdict, SDXL trap, capability contract, job-store seams, download edges

Round 2 deep-dive. Scope: settle the two-truth facts with binary/source evidence, then give a
reconcile-before-project plan. Evidence was collected directly from the frozen binary at
`/Applications/DiffusionBee.app/Contents/Resources/core/` (byte-identical to
`electron_app/.packaged-backend/`), the source backend under `backends/stable_diffusion/`, and the
renderer under `electron_app/src/`.

---

## 1. FLUX.1 frozen-binary verdict — REACHABLE. The "dead weight" claim is FALSE.

**Verdict: the shipped 2.5.3 binary HAS a reachable FLUX.1 inference path.** The R1 gate change and
its rationale comment are wrong for the packaged product.

The prior (08-09) audit was FLUX.2-shaped: it searched for `flux_dylib` / `flux2` / `FLUX.2`
strings and concluded `flux_dylib.dylib` was "unreferenced dead weight — nothing links or loads it"
(`electron_app/src/utils/flux2_catalog.js:75-79`). That conclusion is factually wrong. The audit
never inspected `int_1.cpython-39-darwin.so`, which is exactly where the binding lives.

### Evidence

1. **`int_1.cpython-39-darwin.so`** (2.6 MB Mach-O bundle) is the NNC model interface and contains a
   complete FLUX DiT binding:
   - Class/method symbols: `FluxModel`, `FluxModel.init_model`, `FluxModel.init_dit`,
     `FluxModel.text_encode`, `FluxModel.set_tokens`, `FluxModel.set_timesteps`,
     `FluxModel.run_step`, `FluxModel.decode_img`, `FluxModel.deinit_model`, plus pybind11
     registration strings `int_1.FluxModel.*`.
   - The literal load path `./flux_dylib.dylib` — this IS the thing that links/loads it.
   - `is_flux_dev`, `modules_flux`, `flux_model`, `flux_class`.

2. **`flux_dylib.dylib`** (8 MB Mach-O arm64) is a Metal FLUX runtime, not dead weight:
   - `otool -L` → `bazel-out/.../examples/flux_dylib_bin`, links `Metal`,
     `MetalPerformanceShaders`, `MetalPerformanceShadersGraph`, `Accelerate`, `libsqlite3`.
   - `strings` → `examples_flux_lib`, `examples_flux_lib/main.swift`, `FluxModel`, `is_flux_dev`.

3. **`interface.cpython-39-darwin.so`** (76 KB, Cython "Unified Interface") is the dispatcher that
   selects the two compiled interfaces by hardware: strings include `loading interface 1`,
   `loading interface 2`, `int_1`, `int_2`, `processor`, `platform`, `mac_ver`. So
   `int_1` (NNC: SD1.5 + SDXL + FLUX) and `int_2` (MPS: `sd_1x`, `sd_1x_inpaint` only, loads
   `./mps_sd.dylib`) are both live dispatch targets.

4. **The FLUX.1 model file is an NNC/sqlite container that matches this path.** The live catalog
   (`~/.diffusionbee/downloaded_assets.json`) has `FLUX.1-dev` with
   `type: flux_nnc`, `float_type: nnc_float_q5p`, `sd_type: flux_dev`, filename
   `flux_dev_q5p_NNC_all.sqlite`. The `q5p` + `NNC` in the filename maps 1:1 to
   `nnc_float_q5p` / `flux_nnc`; the `.sqlite` extension maps to `flux_dylib.dylib`'s
   `libsqlite3` dependency.

5. Why the frozen `diffusionbee_backend` executable itself shows no `flux` strings: PyInstaller
   compresses its Python bytecode into the PYZ archive, so Python-level constants are not visible to
   `strings`. The FLUX dispatch lives in the Cython-compiled `interface`/`int_1`/`int_2`
   extensions, which are plain Mach-O and fully visible.

### Consequence

`GENERATABLE_MODEL_TYPES = ['sd_model', 'sd_model_inpaint']` (`flux2_catalog.js:85`) **blocks
`flux_nnc`, which the shipped binary can actually run.** For the installed DMG/NSIS product this is
a regression, not a correction: FLUX.1 (`FLUX.1-schnell`, `FLUX.1-dev`) is a first-class catalog
citizen that ships and runs, and the gate now hides it. The correct reading is two truths:
- **Shipped binary (upstream 2.5.3):** SD1.5 ✅, SD2 ✅, SDXL ✅, FLUX.1 (`flux_nnc`) ✅, FLUX.2 ❌.
- **Source dev backend (venv311 TF 2.10):** SD1.5 ✅, SD2 ⚠️ (claimed, untested), SDXL ❌,
  FLUX.1 ❌, FLUX.2 ❌.

One honest gate cannot be a single flat constant — it must be per-family AND per-backend (see §3).

---

## 2. SDXL reverse-trap verdict — CONFIRMED (dev-only).

SDXL passes the renderer gate and is recommended, but the source TF backend cannot run it. In the
shipped binary SDXL *does* run — so this is the mirror of the FLUX.1 error.

- **Catalog types SDXL as `sd_model`.** `~/.diffusionbee/downloaded_assets.json`:
  `dreamshaperXL_v21Turbo`, `JuggernautXL_v7_f8`, `Stable Diffusion XL Base 1.0`,
  `epicrealismXL_v8` all have `model_meta_data.type: "sd_model", sd_type: "sdxl_base"`. They pass
  `isGeneratableModelType('sd_model')` and are scored up (`model_selection.js`:
  "sdxl base" +24, "anything xl" +22, "xl base" +20).
- **Dev TF backend rejects `sdxl_base`.** `backends/stable_diffusion_tf_models/interface.py:118`:
  `avail_models = ["sd_1x", "sd_2x", "sd_1x_inpaint", "sd_1x_controlnet"]`, and
  `__init__` raises `ValueError("invalid model name")` (line 139) for anything else.
- **The dispatch reaches it.** `stable_diffusion.py:114-115` maps tdict version 31 →
  `model_name = "sdxl_base"`, then `create_sd_model_with_weights` (utils/model_interface.py:42-61)
  calls `ModelInterfaceClass(..., model_name="sdxl_base", ...)` → ValueError.
- **Test harness says so explicitly.** `test_all_models.py:131-144` ("SDXL requires a separate
  backend (not yet integrated with current TF interface)"), `:729` ("SDXL and FLUX models require
  separate backends").
- **Shipped binary runs SDXL.** `int_1.cpython-39-darwin.so` contains `sdxl_base`,
  `nnc_unet_xl_names`, `nnc_text_encoder_openclip_names`, `mappings_sdxl`, `run_unetxl`,
  `run_text_encoder_sdxl`, `init_text_encoder_sdxl`, `run_text_encoder_openclip`,
  `text_encoders_xl_2_openclip_names`, plus `avail_models`.

Minor secondary inconsistency: `interface.py:118` lists `sd_2x` in `avail_models` while
`test_all_models.py:139-140` claims "SD 2.x support not available" and `:132` only tests `sd_1x`.

---

## 3. Capability model + runtime-probe contract

### 3a. Per-family verdict (replaces the flat type allowlist)

A model's runnability is a function of `(model_meta_data.type, model_meta_data.sd_type|family)`
**and** the identity of the running backend. Reconcile to one matrix:

| `model_meta_data.type` | `sd_type`/family | dev TF (venv311) | shipped binary |
|---|---|---|---|
| `sd_model` | `SD_1x` | ✅ | ✅ |
| `sd_model` | `SD_2x` | ⚠️ claimed, untested | ✅ |
| `sd_model` | `sdxl_base` | ❌ (ValueError) | ✅ |
| `sd_model_inpaint` | — | ✅ | ✅ |
| `flux_nnc` | `flux_schnell` / `flux_dev` | ❌ | ✅ (FluxModel, unverified at runtime) |
| `flux2_model` | `flux2_*` | ❌ | ❌ |

Replace `isGeneratableModelType(type)` with `resolveModelCapability(model, backendCaps)` that
returns one of `runnable` / `unverified` / `unsupported`. `flux2_catalog.js:85` and its comment
(75-79) must be rewritten to state the per-backend matrix, not a single list.

### 3b. Runtime probe — the contract

The backend must self-report its capabilities at startup; the renderer must fall back to a static
manifest when the backend cannot self-report.

**Prefix & shape.** Reuse the existing `sdbk` channel (already routed in
`py_vue_bridge.js:47-50` → `StableDiffusion.state_msg`). Emit ONCE, after `sdbk mdld` and before the
first `sdbk inrd`:

```
sdbk caps {"backend_id":"tf-venv311","families":{"sd_model":["SD_1x","SD_2x"],"sd_model_inpaint":[],"sdxl_base":[],"flux_nnc":[],"flux2_model":[]},"float_types":["float32"]}
```

Add a `caps` case in `StableDiffusion.vue state_msg` that parses and stores `this.capabilities`,
then re-evaluates the model pickers (a single `capabilities_ready` flag gates honest projection).

**Who self-reports.**
- **Source dev backend — self-reports.** We control `diffusionbee_backend.py`. After
  `print("sdbk mdld")` (line 154), emit `print("sdbk caps " + json.dumps({...}))` built from
  `ModelInterface.avail_models` (`interface.py:118`) and `ModelInterface.avail_float_types`
  (`interface.py:117`). This is the one authoritative list for the TF backend.
- **Frozen binary — cannot self-report** (reused upstream PyInstaller binary; no way to inject a

---

## 4. Line-level job-store fix plan

Files: `electron_app/src/SDManager.vue`, `electron_app/src/StableDiffusion.vue`,
`electron_app/src/App.vue`.

### 4a. Wire modal cancel to `stop_all` — `App.vue:486-491`

Today the generation-modal `@cancel="cancelGeneration"` (`App.vue:44`) calls `interupt()` only
(`App.vue:489`): the backend loop aborts but the job stays `doing` and `get_and_do_job`
(`SDManager.vue:288`) re-picks and re-runs it. `SDManager.stop_all()` already exists (line 316) and
is wired to the toolbar/applet "Stop all" but not to the modal.

```js
// App.vue:486-491
cancelGeneration() {
  console.log('Generation cancelled by user');
  if (this.stable_diffusion_manager) {
    this.stable_diffusion_manager.stop_all();   // queue-aware cancel (ends in interupt())
  } else if (this.stable_diffusion) {
    this.stable_diffusion.interupt();
  }
}
```
(`this.stable_diffusion_manager = this.$refs.sd_manager` is set at `App.vue:213`.)

### 4b. Harden `stop_all` — `SDManager.vue:316-334`

Two bugs in the current body: (1) `gallery.delete_group(...)` at lines 327-329 throws when the
gallery ref is gone (navigated away); (2) marking all jobs `done` then `finish_current_job()` at
line 323 fires `on_generation_complete`/`add_to_history` (lines 144-150) with a zero/partial-image
group → empty entries pollute history.

```js
stop_all(){
  if (this.queue.current_group != undefined && this.current_job_index != undefined) {
    const gid = this.current_group_id;
    const gallery = this.group_gallery_mapping[gid];
    for (let job of this.queue.current_group.jobs) {
      job.job_state = (job.job_state === 'doing') ? 'done' : 'cancelled';
    }
    // Drop the group instead of finish_current_job(): it would otherwise
    // broadcast + persist an empty/partial group to history.
    if (gallery && typeof gallery.delete_group === 'function') {
      gallery.delete_group(gid);
    }
    this.current_group_id = undefined;
    this.queue.current_group = undefined;
    this.current_job_index = undefined;
  }
  for (let group of this.queue.groups_todo) {
    const gallery = this.group_gallery_mapping[group.group_id];
    if (gallery && typeof gallery.delete_group === 'function') {
      gallery.delete_group(group.group_id);
    }
  }
  Vue.set(this.queue, 'groups_todo', []);
  this.stable_diffusion.interupt();
}
```
*(Product decision to confirm: "cancel" = drop the whole current group vs skip only the in-flight
job and continue the group. The above is the drop-group semantics; skip-one requires a dedicated
`cancel_current_job()` that marks only `current_job_index` done and calls `finish_current_job()`.)*

### 4c. `on_img` must always finish the job — `SDManager.vue:175-217`

The early `return`s at 181-184 (`whoops 1`), 186-189 (`whoops 2`), 196-199 and 201-204 all bypass
`finish_current_job()`. The first two run **before** `job_state = 'done'` (line 193), so the job
stays `doing` and re-runs. Move `job_state = 'done'` before the gallery work and make
`finish_current_job()` unconditional:

```js
on_img(img){
  const img_path = img.generated_img_path;
  const aug_img_path = img.aux_output_image_path;
  try {
    const groupId = that.current_group_id;
    const jobIdx  = that.current_job_index;
    if (groupId == undefined || jobIdx == undefined) {
      console.warn('on_img: no active group/job — dropping result');
      return;                       // queue advances via the inrd watcher
    }
    const job = that.queue.current_group.jobs[jobIdx];
    job.generated_img   = img_path;
    job.aux_output_img  = aug_img_path;
    job.job_state       = 'done';   // moved ABOVE gallery checks
    const gallery = that.group_gallery_mapping[groupId];
    const galleryGroup = gallery && gallery.get_group(groupId);
    if (gallery && galleryGroup) {
      const el = galleryGroup.imgs[job.image_no];
      el.image_url   = img_path;
      el.aux_img_url = aug_img_path;
      el.description = job.prompt.slice(0, 250);
      el.params      = JSON.parse(JSON.stringify(job));
      gallery.update_group(galleryGroup);
      if (typeof that.app.functions.broadcast_gallery_group === 'function') {
        that.app.functions.broadcast_gallery_group(galleryGroup, gallery);
      }
    }
  } finally {
    that.finish_current_job();      // ALWAYS advance, even when gallery is gone
  }
}
```

Also null-guard `on_err` (`SDManager.vue:251-267`): line 259
`gallery_group.imgs[...]` throws when `gallery_group` is undefined; wrap the gallery mutation the
same way and keep `finish_current_job()` in a `finally`.

### 4d. Fix the single `attached_cbs` slot — `StableDiffusion.vue`


---

## 5. Download-resume edge audit — three edges still open

Evidence from `electron_app/src/native_functions.js` and `electron_app/src/AssetsManager.vue`.

### 5a. Cross-restart `.partial` persistence — BROKEN (still)

`AssetsManager.mounted()` (`AssetsManager.vue:51-63`) calls `cleanup_partial_downloads` at startup →
`native_functions.js:799-816` unlinks **all** `.partial` and `.partial.json`. The resume bookkeeping
(`native_functions.js:838-856`) can therefore only resume within a single session. The doc comment
at `native_functions.js:755-761` ("A dropped connection keeps the partial, so the next attempt
resumes") is only true for same-session retries. Cross-restart resume — the single most
user-hostile assumption in the brief — is still false.

Fix: stop sweeping `.partial` at startup; instead sweep only `.partial` whose sidecar `.partial.json`
is missing or whose dest is no longer referenced by `downloaded_assets.json` / the onboarding
in-flight set, and resume the rest via `Range`.

### 5b. ETag-required append — PARTIAL (blind-append corruption remains)

`native_functions.js:951-963` discards-and-restarts **only when** `sidecar.etag` exists and
mismatches. If `sidecar.etag` is empty (the server sent no `etag`/`x-linked-etag` on the first
response — e.g. the `models.diffusionbee.com` redirect or `hf-mirror.com` fallback — or the sidecar
write at line 981 failed), line 964 appends blindly (`flags: 'a'`) with zero verification →
a different revision's tail is spliced onto the existing partial.

Fix: on 206 with `resumeBase > 0`, require **both** `sidecar.etag` and `responseEtag` to be
non-empty and equal; otherwise `unlinkSync(partialPath)`, reset `existingSize = 0`, and restart a
fresh no-Range download. ETag becomes a precondition for resume, not just a mismatch check.

### 5c. Duplicate-download guard — MISSING at both layers

- Main process: `activeDownloads` is keyed by `downloadId` (`native_functions.js:860`), not by
  `dest`. Two `download-file` calls with different ids but the same `dest` both write the same
  `partialPath`.
- Renderer: `download_asset()` (`AssetsManager.vue:212-224`) guards `downloaded_assets[asset_id]`
  (line 219) and `downloading[asset_id].status == 'done'` (line 222), but **not**
  `status == 'downloading'`. Re-triggering a tile mid-download spawns a second writer to the same
  deterministic `dest_path` (line 229) → interleaved `.partial` corruption.

Fix (both, cheap): in `download_asset()`, early-return when
`this.downloading[asset_id] && this.downloading[asset_id].status === 'downloading'`; and in
`download-file`, before `activeDownloads.set`, scan for an existing active entry with the same
`dest` and reject/reuse it.

---

## 6. Reconcile-before-project checklist

The winning framing — *"one verified truth, faithfully projected"* — requires these facts to be
locked before any UI work. Order matters: M0 first, then M1→M2 (projection), M3 (job store),
visual layer in parallel.

**M0 — reconcile the two truths (this round's output, ~all renderer/backend changes):**
- [ ] **M0.1** Correct the false comment + flat gate in `flux2_catalog.js:75-85`. Replace
  `GENERATABLE_MODEL_TYPES` with a per-backend `families` capability map (per §3a). Delete the
  "flux_dylib.dylib is unreferenced dead weight" claim — it is disproven by
  `int_1.cpython-39-darwin.so` → `./flux_dylib.dylib` → `FluxModel`.
- [ ] **M0.2** Add `sdbk caps <json>` self-report to `diffusionbee_backend.py` (after line 154),
  sourced from `ModelInterface.avail_models`/`avail_float_types`.
- [ ] **M0.3** Add `backend_kind` tagging in `bridge.js` (lines 52-72) + a `caps` handler in
  `StableDiffusion.vue state_msg` + a static manifest fallback for the frozen binary.
- [ ] **M0.4** Define the single renderer predicate `resolveModelCapability(model, backendCaps)`
  and route `isSelectableStableDiffusionModel`, `isSelectableOnboardingModel`, and every applet
  picker through it (kills both the SDXL dev trap and the FLUX.1 shipped-binary over-block).

**M1 — honest model projection (hub/ModelStore):**
- [ ] Project capability verdicts onto the catalog (runnable / unverified / unsupported), not a
  hand-authored allowlist. `flux_nnc` in the shipped binary renders as **unverified**, `flux2_model`
  as **unsupported**, `sdxl_base` as runnable only under the binary.
- [ ] Backfill `size_bytes`/`min_ram_gb`/license/tier in the catalog schema (fixes the "0 B" bug at
  `App.vue:124`; the catalog carries no `size_bytes` today).

**M2 — onboarding as projection:**
- [ ] Onboarding picker = `pickOptimalOnboardingModel` filtered by `resolveModelCapability`, so the
  recommended model is always one the *actually-running* backend can run.
- [ ] Keep the inline overlay and `scripts/lib/fixtures.py` in lockstep on required model IDs.

**M3 — job-store / non-blocking (do not make the modal dismissible until these land):**
- [ ] `App.vue:486-491` `cancelGeneration()` → `stop_all()` (§4a).
- [ ] `SDManager.vue:316-334` `stop_all()` null-guard + no empty-group history write (§4b).
- [ ] `SDManager.vue:175-217` `on_img` unconditional `finish_current_job()`; `on_err` null-guard (§4c).
- [ ] `StableDiffusion.vue` live-`attached_cbs` overwrite guard + single-owner dispatch (§4d).
- [ ] Decide cancel semantics (drop group vs skip job) and encode it in the store.

**M5 — download resume hardening (parallel with M1):**
- [ ] Stop the startup `.partial` sweep; resume surviving partials (§5a).
- [ ] Make ETag a precondition for append, restart fresh on missing/mismatch (§5b).
- [ ] Dedup downloads by `dest` (main) and by `status=='downloading'` (renderer) (§5c).

**Visual layer — only after M1/M2 predicates exist**, so the badges/gauges project the reconciled
truth instead of a new hand-authored copy.

`attached_cbs` is one object (`data()`, line 34) written by `run_applet` (line 214) and
`text_to_img` (line 244), and cleared by `interupt()` (line 192). Both entry points are gated by
`is_input_avail` (205-206, 223-224), so the backend's single-thread serialization mostly protects
it — the real hazard is an applet (`run_applet`, called directly from `AppletPage.vue:110` and
`Inpainting.vue`) racing a queued `text_to_img` during teardown, silently dropping one consumer's
`on_img`. Minimal renderer-only fix (the frozen backend does not echo a job_id, so a keyed registry
is not yet possible):

```js
// StableDiffusion.vue — guard against live-slot overwrite in both entry points
text_to_img(prompt_params, callbacks, generated_by){
  if(!this.is_input_avail) return;
  if(this.attached_cbs){ console.warn('[sd] overwriting live callbacks — expected single-owner'); }
  ...
}
// same guard at the top of run_applet() after the is_input_avail check
```

The durable fix is single-owner discipline: route `run_applet` through `SDManager` (a job-shaped
applet entry) so only `SDManager` ever sets `attached_cbs`; the guard above makes violations loud
until then.

  print without re-packaging). The bridge must tag identity: `bridge.js` already knows which branch
  spawned the process (lines 52-72: `BIN_PATH` → packaged binary → packaged script → dev script).
  Have `bridge.js` send the renderer a one-shot `backend_kind` (`'packaged-binary' | 'dev-tf'`), and
  the renderer fall back to a static manifest:
  ```
  packaged-binary: { sd_model:[SD_1x,SD_2x,sdxl_base], sd_model_inpaint:[], flux_nnc:[flux_schnell,flux_dev], flux2_model:[] }
  dev-tf:          { sd_model:[SD_1x,SD_2x],          sd_model_inpaint:[], flux_nnc:[],              flux2_model:[] }
  ```

**Packaging implications.**
1. The frozen binary's capabilities are **frozen** — a static manifest is the only honest source
   until the fork ships its own build (`diffusionbee_backend.spec`).
2. When the fork builds its own backend, the `sdbk caps` self-report MUST be emitted or the
   manifest fallback silently claims the wrong set.
3. The self-report and the manifest must normalize to the **same shape** (a `families` object keyed
   by `model_type`, with a set of supported `sd_type`s) so the renderer reads one truth.
4. `flux_nnc` in the shipped binary should be surfaced as **unverified** (statically present,
   never runtime-tested on this branch) — not `runnable` — until a real FLUX.1 generation is
   executed against the packaged binary.

SD2 is "claimed but never proven" in the dev backend.
