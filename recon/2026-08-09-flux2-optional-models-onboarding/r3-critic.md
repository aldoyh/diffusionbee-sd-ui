---
title: "R3 Critic — FLUX.2 / Optional Models Onboarding (decision-order stress test)"
date: 2026-08-09
agent: critic
mode: explore — stress-test the R2 decision order, find new complications
topic: honesty-first order, resume mechanics, token UX gaps, catalog-wide trap
---

# R3 Critic — Stress-Testing the R2 Decision Order

## (A) Verdicts on each attack

**1. "Product-honesty fix first" — HOLDS, but the trap is worse than a dead-end download, and the fix must be catalog-wide, not recommendation-only.**
- The 08-05 audit fixes make the failure cascade *longer and more confusing*: splash watchdog unlocks at 30 s with no model → Homepage banner (**advertises FLUX.2 Klein**) → "Download default model" → modal → 7.75 GB download → **"Model ready! ✓" success state** → "OPEN App" → user types a prompt → refusal toast at the moment of intent. The false-completion state is the sharpest part: the app *tells* the user setup succeeded, then fails at the highest-stakes moment. On macOS (model-free DMG, confirmed R2) this is the *only* path; on Windows the bundled SD1.5 seeding means onboarding is skipped entirely.

**2. Download-robustness step — the mechanics are more dangerous than "~80 lines".**
- `createWriteStream(dest)` truncates an existing file: a naive resume implementation destroys the partial instead of appending. Must open with `flags:'a'` only when a verified `.partial` exists; detect `statusCode === 206` vs 200 (server ignoring Range) and restart on 200.
- **MD5-on-resume is broken as designed**: the hash is computed incrementally over the whole stream (`native_functions.js`). A resumed stream only sees bytes from the Range offset — either seed the hash from the partial file's digest, or drop MD5 for resumed HF downloads in favor of the **LFS `ETag`/`x-linked-etag` (content SHA-256)** — trustworthy, and lets us delete `skip_checksum` on FLUX.2.
- **`.partial` lifecycle unhandled**: `scan_disk_for_models` only matches `.tdict`, so orphaned partials are invisible but waste disk; need startup cleanup or auto-resume. Registry path must point at the *final* renamed filename.
- The 300 ms poller and `downloaded_assets.json` don't represent "downloading" state across restarts — a resumed download's registry entry won't exist until done.

**3. Token-UX step — design sound; two gaps.**
- `safeStorage.isEncryptionAvailable()` guard is mandatory (Linux demo/browser build has no keychain; the `main_demoui.js` shim requires the `window.ipcRenderer ?` guards already used).
- **A Settings field is NOT enough for onboarding**: `fetch_models_list()` merges FLUX.2 *at onboarding time* using whatever token exists. If the user only learns about the token field later, gated models stay invisible where they'd matter. However — the honesty fix demotes FLUX.2 from onboarding anyway, so the token UX becomes a ModelStore/optional-download concern. Settings-first is correct; onboarding integration only matters if gated models return to the recommended tier.
- Minor: `hf_auth.js` module-level cache means a saved token won't appear until `clearHfTokenCache()` — the save path must invoke it.

**4. Decision order — stands, with two amendments (see C).** Step (4) "gated on binary audit" should be *parallelized*, not deferred: it decides whether the honesty fix should be a **reversible flag** (flip when upstream ships FLUX) or a permanent gate.

## (B) NEW complications, ranked

1. **The refusal is Homepage-only; the applets are un-audited.** Verified refusals: `Homepage.vue:902-905, 1204-1207`. But `isSelectableStableDiffusionModel` returns `true` for flux2 (`model_selection.js`), and Txt2Img/Img2Img/Inpainting (`SDImageGenerationApplet`/`BasicSDApplet`) have their *own* model selection feeding `add_job` — if they list FLUX.2 as selectable, submitting sends a flux2 safetensors path to a TF 2.10 backend with **no refusal → likely backend crash**, not a toast. The honesty fix must cover **every** generation entry point. This is the single most dangerous unverified path.
2. **The trap is the whole FLUX family, not just FLUX.2.** `GENERATABLE_MODEL_TYPES` also lists `flux_nnc` (FLUX.1), and the live catalog carries FLUX.1-dev/schnell (min_version 40) which need a separate backend. `OPTIONAL_CATALOG_MODEL_IDS` (`fixtures.py`) includes them, and ModelStore renders them with `canDownloadModel → !!(id && url)` (neutered). FLUX.1 is equally a dead-end download.
3. **The optional-downloads curated list is a second trap entry point.** `App.vue fetchOptionalModels` candidateIds includes `'FLUX.2-klein-4B'`, and `sortStableDiffusionModelsBestFirst` (score ~200) places it near the top. Not pre-checked (the `!isFlux` preselection guard exists) — but shown as a downloadable checkbox with zero warning.
4. **ModelStore is a third entry point with no generatable filter at all.** `not_downloaded_models_list` filters only by `downloaded_assets`; the merged catalog (incl. FLUX.1/2) renders DownloadButton for everything.
5. **Upstream is the real FLUX path — and the fork's dev loop can't verify it.** Upstream has no FLUX.2 (issue #576, Nov 2025); the fork's macOS packaging *reuses the upstream binary*. If upstream ships FLUX, the fork gets it by re-packaging — but the fork's dev backend (venv311 TF) can't run it, so screenshots/tests/CI can't verify FLUX behavior. The renderer gate must be a single flippable constant.
6. **The binary audit itself is load-bearing and unverified** (resolved by R3 orchestrator audit: flux_dylib.dylib exists but is unreferenced — see orchestrator findings).
7. **Users who already downloaded FLUX.2 carry 7.75 GB of dead weight** with a confusing "downloaded but can't generate" state — needs a cleanup affordance or a "not runnable on this build" badge in the picker.

## (C) Amendments to the decision order

1. **Step 1 (honesty fix) expands**: fix `GENERATABLE_MODEL_TYPES` → `['sd_model', 'sd_model_inpaint']`, drop the `isFlux2Model` bypass in `isSelectableOnboardingModel`, remove FLUX.2 from the optional curated list, filter/badge non-generatable models in ModelStore, fix banner copy, and **audit all applet generation paths** for FLUX selectability. Design the gate as one exported allowlist constant (reversible flag).
2. **Step 0 (parallel with step 1)**: the packaged-binary FLUX audit — determines whether the flag ever gets flipped. (Orchestrator resolved: no reachable FLUX path → permanent gate until a backend lands.)
3. Steps 2–3 unchanged in order; resume must be built with the Range/206/ETag/.partial-cleanup details above; token save must `clearHfTokenCache()`.
4. Step 4 becomes: flip the allowlist when upstream ships FLUX, or port a backend (MLX sidecar) if the product decides FLUX is strategic.

## (D) Risks the final document must flag

- FLUX.1 **and** FLUX.2 are non-generatable app-wide; the catalog/picker/refusal trio must be consistent across Homepage + all applets + ModelStore + optional downloads.
- macOS GUI env dead-end ⇒ gated tier (9B/dev) unreachable in the shipped product until in-app token UX ships.
- Packaged app ships no `python3` ⇒ the Python-downloader direction is a packaging project, not a refactor; resume must live in the existing JS IPC.
- "Cancel download" is cosmetic (no abort IPC) — the stream keeps writing after UI cancel.
- `rejectUnauthorized:false` + `skip_checksum` + no md5 ⇒ FLUX downloads have zero integrity guarantee; adopt LFS ETag (content SHA-256).
- `min_ram_gb: 13` is VRAM-flavored vs unified memory ⇒ swap-thrash on 16 GB M-series; honest floors (16/24–32 GB); surface console-only `verifyModelsHardwareCompatibility`.
- Unverified applet submission path ⇒ possible backend crash if FLUX.2 is selectable outside Homepage — verify before shipping any fix.
- Upstream dependency: FLUX support arrives via upstream binary re-packaging; fork dev loop can't verify it — the gate must be a flippable constant.
