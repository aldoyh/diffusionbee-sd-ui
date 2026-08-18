# Round 1 — Critic Report: Full UI/UX + Models Onboarding

**Session**: 2026-08-18 · Focus mode · **Agent**: CRITIC · **Round**: 1
**Topic**: "the entire full UI/UX and the models onboarding functionality — improved dramatically"

> **One-line verdict.** The working tree has *already moved past the brief*: download
> resume/ETag/cancel, the FLUX gate, and the picker generatability filter are implemented but
> **uncommitted**. So this round is not "validate 10 claims as to-dos" — it is "audit what the
> fixes break, and what the *next* naive fix will break." The dominant failure mode is not
> missing features; it is **single-truth fixes applied to a two-truth system** (source backend vs.
> the reused upstream binary; total RAM vs. VRAM; session state vs. cross-restart state; the
> submitted queue vs. the pending batch). Almost every sharp problem below is a seam where one
> layer now believes something the other layer doesn't.

---

## 1. Ranked failure-mode table (Top ~10)

Ranking = user impact × likelihood × fixability (severity is the headline, fixability the
leverage modifier).

| # | Failure mode | Severity | Impact | Likelihood | Fixability | One-line why |
|---|---|---|---|---|---|---|
| 1 | **Modal "Cancel" does not stop generation** — it clears `attached_cbs` and sends `__stop__`, but never clears `SDManager` queue and leaves the interrupted job in `doing`; the next `inrd` re-dispatches it | Critical | User's only escape in the blocking modal silently re-runs the image or resumes the queue | High (every cancel) | Medium | `cancelGeneration` → `interupt()` only; `SDManager.stop_all()` exists but is never wired to the modal |
| 2 | **"Resume" is same-session + manual-only, with integrity/redirect edges** — `.partial` swept at startup; resume needs a manual "Download Again"; blind-append when server omits ETag; no duplicate-download guard | High | Multi-GB download that dies on app quit/crash still restarts from zero; FLUX (no md5) can be silently corrupt | Medium | Medium | Cross-restart resume (the dominant failure mode) is still unfixed; `request` + `rejectUnauthorized:false` + no-ETag append |
| 3 | **Non-blocking generation is NOT safe yet** — single `StableDiffusion.attached_cbs` slot + `SDManager.on_img` early-returns *without* `finish_current_job()` when the gallery ref is gone → queue stall or double-generation | High | Making the modal dismissible invites navigation mid-generation, which is exactly the trigger | Medium (depends on page keep-alive) | Medium | `SDManager.vue:195-204` returns before `finish_current_job`; `get_and_do_job` re-picks `doing` jobs |
| 4 | **Hardware surfacing would LIE** — no VRAM detection, `min_ram_gb` is VRAM-flavored vs. total RAM, `freeMemGB` computed but unused, `cpuModel` = `navigator.userAgent` | High | Badges would certify a 16GB Mac / discrete-GPU Windows box that swap-thrashes or OOMs | High | Medium | `getMachineProfile()` + console-only `verifyModelsHardwareCompatibility()` (which even says "Great on Apple Silicon (MPS)" for FLUX) |
| 5 | **The gate over-corrects: `flux_nnc` (FLUX.1) is dropped by a *source-truth* allowlist while the shipped binary is upstream 2.5.3** (which advertised FLUX.1) | High | Either a visible regression (hiding a working feature) or correct-but-unverified — either way the blanket gate conflates two families | Medium | Medium | `GENERATABLE_MODEL_TYPES = ['sd_model','sd_model_inpaint']` excludes `flux_nnc`; binary reachability of FLUX.1 was never separately verified |
| 6 | **"0 B" size bug in the onboarding optional-downloads list** | Medium | Every recommended SD model shows "0 B" at the exact moment of a multi-GB decision | High (always) | Trivial | `App.vue:124` `formatBytes(model.size_bytes \|\| 0)`; live catalog carries no `size_bytes` |
| 7 | **HF token still env-only (claim 3 unresolved); planned `safeStorage` has unguarded-throw + leak edges** | Medium | Gated tier unreachable in the installed product; naive impl throws on Linux/headless and may leak the token through redirects | Medium | Medium | `Settings.vue` has no token field; `safeStorage.isEncryptionAvailable()` guard missing; `hf_auth.js` uses sync IPC |
| 8 | **Batch queue page-bound duplication** — two localStorage keys, two 600ms pollers, `batchItemDone` false-positive on pruned groups | Medium | A batch added on Homepage is invisible on applet pages (and vice versa); drift + false-"done" | High (structural) | Medium | `batch_queue_store.js` APPLET_KEY/HOMEPAGE_KEY; consolidation is renderer-only, no backend change needed |
| 9 | **ModelStore "🔵 download only" is honesty without enforcement** — FLUX.2 still downloadable (7.75GB dead download) | Medium | The trap's *cost* moved from onboarding to ModelStore; the disclaimer is easily missed next to an enabled Download button | High | Low (product decision) | `canDownloadModel = isModelDownloadAllowed = !!(id && url)`; gate only blocks *selection*, not *download* |
| 10 | **App.vue "extract components" plan** — right as presentational decomposition, risky as state relocation | Medium | Naive extraction breaks the Homepage↔App onboarding contract + `$refs` coupling; fixtures.py drift | Medium | Medium | 1545-line `App.vue` reads `$refs.stable_diffusion/sd_manager/assets_manager/router`; onboarding flags in `app_data_2.json` |

## 2. The sharpest five — analysis

### #1 — "Cancel" is a lie, and it is the *one* control the blocking modal gives you

`LoaderModal` renders a single Cancel button in generation mode
(`App.vue:35-45` → `cancelGeneration`). `cancelGeneration` (App.vue:486-491) does exactly one
thing: `this.stable_diffusion.interupt()`. And `interupt()` (StableDiffusion.vue:188-194) does
exactly three things: send `t2im __stop__`, set `is_stopping = true`, and **`attached_cbs =
undefined`**. It never touches `SDManager.queue`, never marks the current job done, never calls
the already-existing `SDManager.stop_all()` (SDManager.vue:316-334) which *does* clear the queue.

The consequence is mechanical, not speculative:

1. Backend honors `__stop__` and emits `inrd` (ready) → `StableDiffusion.state_msg` sets
   `is_input_avail = true` **last** (StableDiffusion.vue:76-81).
2. `SDManager` watches `stable_diffusion.is_input_avail` and calls `get_and_do_job()`
   (SDManager.vue:337-348).
3. `get_and_do_job` scans `current_group.jobs` for any job in `todo` **or `doing`**
   (SDManager.vue:288). The interrupted job is still `doing` → it is re-picked and re-sent.

So "Cancel" **re-runs the very image the user cancelled** (or, if another job is `todo`,
resumes the batch). There is no per-item cancel, and the modal's Cancel is not wired to
`stop_all()`. This is the single highest-trust-cost bug in the app: the user's only stop affordance
is decorative. **Any redesign of the generation surface must fix this before/alongside making the
modal non-blocking** — otherwise you replace "a blocking modal with a broken cancel" with "an
inline queue with a broken cancel."

### #2 — "Resume" is implemented, but the *dominant* failure mode is still a full restart

The main-process handler (native_functions.js:884-1071) is genuinely better than the brief claims:
`.partial` + ETag sidecar, 206-append vs 200-overwrite, 416-whole-file, atomic rename, real
`download-cancel` (767-795), startup sweep. But as shipped in the working tree it has four edges
the "resume solves fragile downloads" narrative hides:

1. **Same-session only.** `AssetsManager.mounted()` calls `cleanup_partial_downloads`
   (AssetsManager.vue:51-63) which **deletes every `.partial`** at startup. The most common way a
   multi-GB download "dies at 90%" is *the app crashing or being quit*, which is precisely the
   case that resumes nothing. The settled claim "restarts from zero" is only fixed for in-session
   network errors.
2. **Manual retry only.** There is no auto-retry/backoff. `on_error` flips the tile to "Download
   Again" (DownloadButton.vue:14-17); resume happens only when the user re-clicks. Fine as a
   floor, but it is *not* the LM Studio/Ollama resume the associator benchmarks against.
3. **No-ETag blind append.** On resume the code only discards-and-restarts when both the sidecar
   and the fresh response carry an ETag and they differ (native_functions.js:951-963). If the
   server/proxy omits ETag (common for the `models.diffusionbee.com/list_models?download_model=`
   proxy path and some Civitai CDNs), it appends blindly. For FLUX (no md5, `skip_checksum`) a
   revision drift then produces a **silently corrupt multi-GB file**. ETag verification is not a
   substitute for content integrity when ETag is absent.
4. **`rejectUnauthorized:false` still on** (native_functions.js:921), still combined with the
   no-checksum FLUX path. And `followRedirect:true` with an `Authorization: Bearer` header on
   gated HF URLs should be verified: whether the token is stripped or forwarded across the
   302 → CDN/Xet host boundary. Forwarding it leaks the token to a third host; stripping it breaks
   gated resume. Either way it is an unexamined edge in the token+resume combination.

Also: `delete_asset` deletes the *final* path but not a surviving `.partial`/sidecar
(AssetsManager.vue:201-210), so cancelling-then-deleting leaks the partial until next launch.

### #3 — Making generation non-blocking is unsafe until completion is decoupled from the gallery ref

`is_generating` is already queue-aware (App.vue:396-448) — good. But the *completion* path is the
danger. `StableDiffusion.attached_cbs` is a **single slot**, overwritten per job; progress
(`generation_progress`, `remaining_times`) is a global singleton with **no job id** in the `dnpr`
protocol. And `SDManager.on_img` (SDManager.vue:174-218):

```js
let gallery = that.group_gallery_mapping[that.current_group_id]
if (!gallery) { console.warn('No gallery mapped for group', ...); return }   // ← no finish_current_job
...
that.finish_current_job()
```

If the mapped gallery component is gone (page navigated away and unmounted, or the ref is stale),
`on_img` **returns before `finish_current_job()`**. The job stays `doing`, the backend has already
moved to `inrd`, the watcher fires `get_and_do_job()`, and it **re-picks the same `doing` job and
re-generates it** — a stall/duplicate loop, not just a lost thumbnail. This is latent *today*; a
non-blocking modal is the feature that makes "user navigates away mid-generation" the normal case
and turns the latent bug into a reproducible one.

**Required precondition for non-blocking:** write the image + mark the job `done` into a
gallery-independent store (the group id → imgs map that SDManager already owns) *before* touching
the page's gallery ref; make `finish_current_job` unconditional on gallery presence; then project
into whatever page is mounted. That is exactly the associator's "queue-as-projection" thesis —
but the projection must not be the completion path's only home.

### #4 — Hardware surfacing would certify machines that will thrash — the data is not just missing, it is wrong

`getMachineProfile()` (model_selection.js:29-52) reports: `totalMemGB`/`freeMemGB` from
`process.getSystemMemoryInfo()` (system RAM), `isAppleSilicon` from `darwin && arm64`, and
`cpuModel = navigator.userAgent` (a *browser UA string*, not a CPU model). It has **no VRAM**
detection whatsoever. Meanwhile the catalog's only hardware field is `min_ram_gb` (13/20/28), which
is a **VRAM-flavored** number.

Consequences for "badge models by machine fit":

- **Windows with a discrete GPU** (the fork ships a Windows NSIS build): a 64GB-RAM box with an
  8GB GTX 1070 would be badged "compatible" with a 13GB-floor model; a 16GB-RAM box with an RTX
  4090 would be badged "incompatible" with a 13GB model it could run comfortably. System RAM is the
  wrong axis, and there is no VRAM query in the renderer or bridge.
- **Apple Silicon**: unified memory makes total RAM a *defensible* proxy, but `min_ram_gb:13`
  against `totalMemGB` badges a 16GB M-series at normal OS load as "compatible" when the working
  set (weights + text encoder + VAE + activations + OS + app) will swap-thrash. `freeMemGB` is
  computed and never used — the prior session's r2-critic already flagged this and it remains
  unaddressed.
- The existing console report `verifyModelsHardwareCompatibility()` (App.vue:882-984) is not just
  "not surfaced" — it actively **lies**: it prints "Great on Apple Silicon (MPS)" for FLUX entries
  (App.vue:935-943) when this build has no FLUX inference at all, and its "SDXL compatible" verdict
  is pure `totalMemGB` heuristics.

**Surfacing this as-is would ship false compatibility badges.** The fix must be: (a) real VRAM on
Windows (Electron GPU info / dxdiag / nvidia-smi — a new main-process probe), (b) on Apple Silicon
use free+pressure, not total, and (c) never render a "runs great" claim for a model family the
gate says the backend can't run.

### #5 — The gate is a *source-truth* allowlist applied to a *binary-truth* product; it over-corrects FLUX.1

The shipped backend is **not** the source `backends/stable_diffusion/` TF stack — it is the frozen
upstream binary reused by `prepare_backend_for_packaging.sh` (AGENTS.md). Upstream **2.5.3 shipped
FLUX.1** ("scroll to the bottom … FLUX.1", per the 08-09 explorer's release audit). The prior
binary audit that motivated the gate concluded "no reachable FLUX inference" — but it did so by
checking `flux_dylib.dylib` linkage and `flux2` strings, i.e. it was **FLUX.2-shaped evidence** and
did not separately establish whether the frozen binary routes `flux_nnc` (FLUX.1) to a working
engine. The current gate `GENERATABLE_MODEL_TYPES = ['sd_model','sd_model_inpaint']`
(flux2_catalog.js:85) therefore drops `flux_nnc` from every picker and labels FLUX.1
"🔵 not runnable on this build" (ModelStore.vue:104-111) — which is **either** a regression hiding
a working upstream feature **or** correct; the codebase has no evidence that settles it. A blanket
two-type allowlist cannot express this distinction.

The same two-truth ambiguity runs the *other* way for SDXL: `sd_type: sdxl_base` entries are
`type: sd_model`, so they pass the gate and are selectable/recommended — runnable in the shipped
binary, but **not** in the source `venv311` TF backend (`test_all_models.py:729`: "SDXL and FLUX
models require separate backends"). Anyone running the dev `BIN_PATH` backend is handed a
recommendable-but-unrunnable SDXL, a *new* trap the single-allowlist design did not anticipate.

**Recommendation:** replace the single allowlist with a per-family capability verdict
(`sd_model` ✅ / `sd_model_inpaint` ✅ / `sdxl` ⚠️-binary-only / `flux_nnc` ⚠️-unverified /
`flux2_model` ❌), and add a runtime capabilities probe (backend reports its own supported types at
startup) instead of a hardcoded renderer constant. The "one exported constant" fix was a hedge
against a rewrite; it has now hardened into an over-generalization.

---

## 3. Claims that should NOT be trusted (settled or otherwise)

- **Settled claim #1 is stale/over-broad** — "Binary audit: no reachable FLUX inference in the
  shipped product." The audit was FLUX.2-shaped (`flux_dylib`, `flux2` strings) and did not settle
  FLUX.1 (`flux_nnc`), which upstream 2.5.3 — the reused binary — shipped. The blanket allowlist it
  justified now quietly hides FLUX.1. Do **not** treat "FLUX is fully gated and done" as settled;
  re-audit `flux_nnc` routing in the *frozen* binary specifically, or add a runtime probe.

- **Settled claim #2 is now inverted and still over-optimistic** — "downloads restart from zero"
  is fixed for in-session manual retries, **not** for the dominant failure mode (app quit/crash →
  `.partial` swept at startup). "Resume implemented" is true; "resume solves fragile downloads" is
  false until cross-restart persistence + auto-retry + ETag-required-for-append land.

- **Settled claim #6 ("picker inconsistency")** — the *generatability gate* is now unified across
  Homepage/ModelSelector/applets (BasicSDApplet.vue:89,218 filter by `isGeneratableModelType`), but
  the brief's actual complaint was the **control** (ARIA `ModelSelector` vs. native `<select>`).
  Verify the control-level unification before declaring claim #6 closed; the gate unification and
  the control unification are different things.

- **Settled claim #4 ("hardware is console-only")** — still true, but understates the risk: the
  console report is not merely invisible, it is *wrong* ("Great on Apple Silicon (MPS)" for FLUX).
  "Surfacing what's already computed" (a Round-1 recommendation) would surface a lie; the data must
  be corrected first (VRAM probe, free-memory floors, no praise for gated-out families).

- **New, from this round:** the onboarding optional-downloads list renders **"0 B"** for every
  recommended SD model (`App.vue:124`, catalog has no `size_bytes` — confirmed live). And the
  ModelStore "🔵 download only" pattern still allows a 7.75GB FLUX.2 download because
  `canDownloadModel` is the *version* gate (`!!(id && url)`), not the *generatability* gate — the
  trap's cost was moved, not removed. The "gating solves the trap" claim should be narrowed to
  "gating removes the trap from *onboarding and selection* only."



