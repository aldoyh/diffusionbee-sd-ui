# DiffusionBee — Full UI/UX & Model Onboarding — Deep Recon

**Date:** 2026-08-18 · **Mode:** autonomous + focus
**Folds in:** 8 prior recon sessions (2026-07-24 → 2026-08-11) + this session (R1: 4 agents; R2: critic).

---

## The Argument

> **"One verified truth, faithfully projected."**

DiffusionBee's UI isn't missing features — it is projecting *lies*. The app already owns every source
of truth it needs (`getMachineProfile`, `downloaded_assets.json`, `SDManager.queue`, `history_service`,
the model catalog). The dominant failure mode across every surface is a **two-truth system**: the UI
hand-authors a copy of state instead of projecting the state the app already has — and two of the
truths it copies from (the source TF backend vs the reused upstream 2.5.3 binary) contradict each
other. The fix is not more UI; it is reconciling the truths first, then making every surface a
projection of one model/lifecycle/job store.

---

## 1. The brief is stale — the tree already moved

Three of the ten "settled claims" in the context brief are implemented but uncommitted:
- Download resume / ETag / cancel — `electron_app/src/native_functions.js`
- Picker generatability gate — Homepage + applets
- FLUX banner copy / gating

Do not treat these as open work; they are done-but-uncommitted.

---

## 2. The two-truth system (root cause)

| Truth A | Truth B | Why it breaks |
|---|---|---|
| Source backend (venv311, TF) | Reused upstream 2.5.3 binary | Different model families run on each (§3.3) |
| Total RAM (`getMachineProfile`) | VRAM | No VRAM detection; `min_ram_gb` is VRAM-flavored |
| Session state | Cross-restart state | `.partial` files swept at startup; resume same-session only |
| Submitted queue | Pending batch | UI shows "canceled" jobs that remain queued |

Every "improved dramatically" candidate fails the same way: it renders a *new* hand-authored copy
instead of projecting reconciled state.

---

## 3. Verified facts (R2 critic — binary + source evidence)

### 3.1 FLUX.1 is reachable in the frozen binary — the gate over-corrects

The prior (08-09) audit concluded `flux_dylib.dylib` was "unreferenced dead weight." That is
**wrong**. The audit only ran `strings` on the PyInstaller executable, whose Python bytecode is
compressed into the PYZ archive and invisible to `strings`. The FLUX binding lives in the Cython
extensions, which are plain Mach-O:

- `int_1.cpython-39-darwin.so` (2.6 MB) is the NNC model interface and contains a complete FLUX DiT
  binding: `FluxModel`, `FluxModel.init_model/init_dit/text_encode/set_tokens/set_timesteps/run_step/
  decode_img/deinit_model`, pybind11 `int_1.FluxModel.*`, and the literal load path `./flux_dylib.dylib`.
- `flux_dylib.dylib` (8 MB arm64) is a Metal FLUX runtime (`otool -L` → Metal, MetalPerformanceShaders,
  MetalPerformanceShadersGraph, Accelerate, libsqlite3).
- `interface.cpython-39-darwin.so` dispatches `int_1` (NNC: SD1.5 + SDXL + FLUX) vs `int_2`
  (MPS: `sd_1x`, `sd_1x_inpaint` only).
- The live catalog's `FLUX.1-dev` entry (`type: flux_nnc`, `float_type: nnc_float_q5p`,
  `sd_type: flux_dev`, filename `flux_dev_q5p_NNC_all.sqlite`) maps 1:1 to this path.

**Verdict:** `GENERATABLE_MODEL_TYPES = ['sd_model', 'sd_model_inpaint']` (`flux2_catalog.js:85`)
**blocks `flux_nnc`, which the shipped binary can actually run.** For the installed DMG/NSIS product
this is a regression, not a correction.

### 3.2 SDXL reverse-trap — confirmed (dev-only)

SDXL passes the renderer gate and is recommended, but the source TF backend rejects it — the mirror
of the FLUX.1 error. Catalog types SDXL as `sd_model`/`sdxl_base`; the dev backend's
`interface.py:118` only accepts `avail_models = ["sd_1x","sd_2x","sd_1x_inpaint","sd_1x_controlnet"]`
and raises `ValueError("invalid model name")` for `sdxl_base`; `test_all_models.py:131-144` says
"SDXL requires a separate backend." The shipped binary *does* run SDXL (`run_unetxl`, `sdxl_base` in
`int_1`).

### 3.3 The capability matrix (per-backend — one gate cannot be a flat constant)

| `model_meta_data.type` | family | dev TF (venv311) | shipped binary |
|---|---|---|---|
| `sd_model` | `SD_1x` | ✅ | ✅ |
| `sd_model` | `SD_2x` | ⚠️ claimed, untested | ✅ |
| `sd_model` | `sdxl_base` | ❌ ValueError | ✅ |
| `sd_model_inpaint` | — | ✅ | ✅ |
| `flux_nnc` | `flux_schnell`/`flux_dev` | ❌ | ✅ (static, unverified at runtime) |
| `flux2_model` | `flux2_*` | ❌ | ❌ |

Replace `isGeneratableModelType(type)` with `resolveModelCapability(model, backendCaps)` returning
`runnable | unverified | unsupported`.

### 3.4 "Cancel" is a lie

`cancelGeneration()` only calls `interupt()` — the job remains queued and can re-run. `SDManager.
stop_all()` exists but is not wired to the modal. This is the highest trust-cost bug.

### 3.5 Resume is same-session only

`.partial` files are swept at startup; cross-restart resume (the dominant failure mode) is still broken.

### 3.6 Non-blocking generation is unsafe

Single `StableDiffusion.attached_cbs` slot (set by `run_applet` line 214 and `text_to_img` line 244,
cleared by `interupt` line 192); `SDManager.on_img` early-returns without `finish_current_job()` when
the gallery ref is gone → queue stall / double generation.

### 3.7 "0 B" size bug

`App.vue:124` `formatBytes(model.size_bytes || 0)` — the live catalog has no `size_bytes`, so "More
models" shows "0 B".

### 3.8 Duplicate-download guard missing

`activeDownloads` keyed by `downloadId` not `dest` (`native_functions.js:860`); renderer
`download_asset()` guards `status == 'done'` but not `status == 'downloading'`
(`AssetsManager.vue:222`). Mid-download re-trigger spawns a second writer → interleaved `.partial`
corruption.

---

## 4. Capability model + runtime probe (the contract)

- **Self-report:** backend emits `sdbk caps <json>` ONCE, after `sdbk mdld`, before first generation,
  sourced from `ModelInterface.avail_models`/`avail_float_types` (add after `diffusionbee_backend.py:154`).
- **Identity tag:** `bridge.js` (lines 52–72) already knows which branch spawned the backend
  (`BIN_PATH` → packaged binary → packaged script → dev script). Send renderer a one-shot
  `backend_kind` (`'packaged-binary' | 'dev-tf'`).
- **Static manifest fallback** (frozen binary can't self-report without re-packaging):
  ```
  packaged-binary: { sd_model:[SD_1x,SD_2x,sdxl_base], sd_model_inpaint:[], flux_nnc:[flux_schnell,flux_dev], flux2_model:[] }
  dev-tf:          { sd_model:[SD_1x,SD_2x],          sd_model_inpaint:[], flux_nnc:[],              flux2_model:[] }
  ```
- Self-report and manifest must normalize to the **same shape** (a `families` object keyed by
  `model_type`) so the renderer reads one truth. `flux_nnc` in the binary renders as **unverified**,
  not `runnable`, until a real FLUX.1 generation runs against the packaged binary.

---

## 5. Action plan (sequenced — reconcile before you project)

**M0 — reconcile the two truths (highest priority, all renderer/backend):**
- M0.1 Fix the false comment + flat gate in `flux2_catalog.js:75-85`; replace with per-backend
  `families` capability map. Delete the "flux_dylib.dylib is unreferenced dead weight" claim.
- M0.2 Add `sdbk caps` self-report to `diffusionbee_backend.py`.
- M0.3 Add `backend_kind` tagging in `bridge.js` + `caps` handler in `StableDiffusion.vue state_msg`
  + static manifest fallback.
- M0.4 Define `resolveModelCapability(model, backendCaps)` and route `isSelectableStableDiffusionModel`,
  `isSelectableOnboardingModel`, and every applet picker through it (kills both the SDXL dev trap and
  the FLUX.1 shipped-binary over-block).

**M1 — honest model projection (hub/ModelStore):**
- Project capability verdicts onto the catalog (`runnable / unverified / unsupported`).
- Backfill `size_bytes`/`min_ram_gb`/license/tier in the catalog schema (fixes "0 B").

**M2 — onboarding as projection:**
- Onboarding picker = `pickOptimalOnboardingModel` filtered by `resolveModelCapability`, so the
  recommended model is always runnable by the *actually-running* backend.
- Keep the inline overlay and `scripts/lib/fixtures.py` in lockstep on required model IDs.

**M3 — job-store / non-blocking (do not make the modal dismissible until these land):**
- `App.vue:486-491` `cancelGeneration()` → `stop_all()`.
- `SDManager.vue:316-334` `stop_all()` null-guard + no empty-group history write.
- `SDManager.vue:175-217` `on_img` unconditional `finish_current_job()`; `on_err` null-guard.
- `StableDiffusion.vue` live-`attached_cbs` overwrite guard + single-owner dispatch (route `run_applet`
  through `SDManager` so only `SDManager` sets `attached_cbs`).
- Decide cancel semantics (drop group vs skip job) and encode it in the store.

**M5 — download resume hardening (parallel with M1):**
- Stop the startup `.partial` sweep; resume surviving partials.
- Make ETag a precondition for append; restart fresh on missing/mismatch.
- Dedup by `dest` (main) and by `status=='downloading'` (renderer).

**Visual layer — only after M1/M2 predicates exist**, so badges/gauges project reconciled truth
instead of a new hand-authored copy.

## 6. Definition of done per item (timebox the honesty treadmill)

1. **Cancel:** pressing Cancel in the loader calls `stop_all()` AND clears the queue AND the
   interrupted job cannot re-dispatch on the next `sdbk inrd` (verified by a test).
2. **Resume:** a partially-downloaded model survives restart, resumes from the byte offset, and
   verifies against ETag before appending.
3. **Non-blocking safety:** `on_img` always calls `finish_current_job()`; `attached_cbs` is
   single-owner; an applet racing a queued job cannot drop a consumer's callback.
4. **Hardware truth:** the capability verdict derives from the backend identity, not a flat allowlist;
   no surface recommends a model the running backend can't run.
5. **Capability probe:** `sdbk caps` + `backend_kind` + manifest produce one `families` shape;
   `flux_nnc` shows as `unverified` in the binary.
6. **0 B size:** catalog carries `size_bytes`; "More models" renders a real size.
7. **FLUX.2 leak:** `canDownloadModel` becomes a generatability predicate, not a version gate — the
   7.75 GB dead FLUX.2 download is no longer offered.
8. **Catalog enrichment:** schema has `size_bytes`/`min_ram_gb`/license/tier with a sidecar fallback
   for legacy/community models.

---

## 7. Surviving tensions (honest open questions)

- **Project-everywhere vs don't-project-a-lie:** surfacing `unverified` capability (FLUX.1 in binary)
  vs hiding it until proven.
- **One-source-of-truth vs two-actual-truths:** the two backends genuinely differ; the store must
  model *which* backend, not pretend one truth.
- **Non-blocking delight vs blocking-loop/jank history:** the dismissible-modal win is gated on the
  job-store seams (M3) first.
- **Reconcile-then-project vs ship-visual-wins-now:** the visual redesign (inspiration hub) is
  tempting but must not land before M0/M1 predicates.
- **Honesty treadmill:** how honest should the UI be about hardware with no VRAM detection?

---

## 8. Deliberately deferred

- FLUX.2 (`flux2_model`) support — the binary can't run it and the fork backend has no flux code;
  re-open only when the fork ships its own backend build.
- Real runtime verification of FLUX.1 in the packaged binary (requires generating an actual FLUX.1
  image against the installed app).
- Model conversion UX, batch-queue persistence (covered by earlier sessions), and any net-new
  generation backends.


