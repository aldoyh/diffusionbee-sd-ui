---
title: "DiffusionBee — FLUX.2 & Optional Models Onboarding: A Reconnaissance"
date: 2026-08-09
status: complete
type: recon
mode: explore (autonomous)
topic: how FLUX.2 should be discovered, downloaded, gated, and surfaced in onboarding / the Model Store
---

# DiffusionBee: FLUX.2 & Optional Models Onboarding

> [!info] Process log
> Session started 2026-08-09 in autonomous Explore mode. Vault scan → context brief
> (`recon/2026-08-09-flux2-optional-models-onboarding/_context_brief.md`) → three agent
> rounds (4 agents each: Explorer, Associator, Critic, Synthesizer; reports persisted as
> `r1-*.md` / `r2-*.md` / `r3-*.md` in the same folder). Round 2 was a vault reality-check
> (backend FLUX code, macOS bundling, env inheritance, hardware pre-flight, hf_hub usage);
> Round 3 developed tensions and surfaced new complications. A **local binary audit** of
> `/Applications/DiffusionBee.app` was performed by the orchestrator (see §2). Prior art:
> [[2026-07-31-plug-n-play-onboarding]], [[2026-07-31-app-ui-onboarding]],
> [[2026-08-02-app-ui-models-onboarding]].

## 1. Introduction: the onboarding paradox

DiffusionBee's first-run story promises "one click and we'll download the best model for your
machine — no setup needed." Today that promise can resolve to a **7.75 GB download of a model
the app cannot generate with**. The FLUX.2 catalog is hardcoded in the renderer
(`electron_app/src/utils/flux2_catalog.js`), the onboarding picker prefers FLUX.2
(`pickOptimalOnboardingModel(..., { preferFlux2: true })` in `model_selection.js` scores
klein-4B at ~200 vs SD1.5's ~72–96), the Homepage banner advertises "including FLUX.2 Klein
when available — and download it from Hugging Face in one click" — and then
`generatePrompt` hard-refuses at the moment of intent (`Homepage.vue:902-905, 1204-1207`:
"FLUX.2 is downloaded, but the current generation backend supports Stable Diffusion models
only"). The app *tells* the user setup succeeded ("Model ready! ✓"), then fails at the
highest-stakes moment.

This is not a cosmetic defect. It is a structural mismatch between three layers that each
believe different things about the product: the **catalog** labels FLUX.2 generatable
(`GENERATABLE_MODEL_TYPES` includes `flux2_model` and `flux_nnc`), the **picker** prefers it,
and the **generator** blocks it. The user pays the difference in bandwidth, disk, and trust.

## 2. Backend reality & the FLUX trap audit

**The fork's own backend cannot run FLUX.** `backends/stable_diffusion/` (TensorFlow 2.10)
has zero FLUX code; `test_all_models.py:729` states "SDXL and FLUX models require separate
backends." The only place FLUX was ever claimed to exist is the *packaged upstream binary*
that `scripts/prepare_backend_for_packaging.sh` reuses from `/Applications/DiffusionBee.app`.

**Binary audit (performed this session, orchestrator-direct):** the installed
`/Applications/DiffusionBee.app` core contains `flux_dylib.dylib` (8.1 MB, Swift/RealModule
symbols) — but **nothing references, links, or loads it**: no `dlopen`/`ctypes`/Python import,
no flux strings in `diffusionbee_backend`, no `otool -L` link from any core dylib. The prior
recon's "complete `flux_generator` the renderer never invokes" is therefore substantially
weakened: **there is no reachable FLUX inference path in the current shipped product.** The
decision hinge that Round 2 flagged ("if the binary can run FLUX, the fix is renderer wiring;
if not, gate it") resolves to the second branch: **gate FLUX.2 out of onboarding until a real
backend exists.**

**The trap is the whole FLUX family, not just FLUX.2.** `GENERATABLE_MODEL_TYPES` also lists
`flux_nnc` (FLUX.1), and the live catalog carries FLUX.1-dev/schnell (min_version 40);
`OPTIONAL_CATALOG_MODEL_IDS` in `scripts/lib/fixtures.py` includes them. Every FLUX entry in
ModelStore is downloadable with no warning (`canDownloadModel → !!(id && url)`, deliberately
neutered in `utils/app_version.js`). And the refusals are **Homepage-only**: the Txt2Img /
Img2Img / Inpainting pages (`SDImageGenerationApplet` / `BasicSDApplet`) have their own model
selection feeding `add_job`, and `isSelectableStableDiffusionModel` returns `true` for flux2 —
submitting FLUX.2 there likely **crashes the TF backend rather than showing a toast**. This
unverified applet path is the single most dangerous hole in the current design.

**Platform asymmetry:** macOS builds are always model-free (root `package.json` `build` /
`build:dir` / `build:install` never run `bundle:models`; `vue.config.js` only embeds
`.bundled-models/` when a developer staged it), so the trap fires on every macOS first-run.
Windows `build:win:full` seeds bundled SD1.5, `existing.length > 0` skips onboarding, and the
trap is avoided entirely — the defect is invisible to Windows CI.

## 3. Auth, IPC, and hardware-floor tensions

**The HF token path is dead-on-arrival for the installed product.** `resolve_hf_token()`
reads `process.env` only, and macOS GUI apps launched from Finder inherit launchd's
environment, not the user's shell — there is no `LSEnvironment` handling anywhere in
`electron_app/`. A normal DMG user's `get_hf_token` is always empty, so the gated models
(FLUX.2-klein-9B at ~19 GB, dev at ~54 GB) silently vanish (`enrichFlux2Model` returns
`null`) for essentially every real user. The gated tier is currently a fiction outside dev
mode. Competitors (LM Studio, Pinokio) solve this with in-app token entry / browser handoff;
DiffusionBee's Settings page has no token field.

**The download pipeline has no integrity and no escape.** `native_functions.js` streams via
`request.get` with `rejectUnauthorized: false`, no `Range:` resume, no `.partial` file, and
`timeout: 0` for HF. A 7.75 GB download that drops at 90% restarts from zero. FLUX.2 sets
`skip_checksum: true` and has no md5, so `rejectUnauthorized:false` + no checksum means a
multi-GB download's integrity is guaranteed by *nothing*. And the setup modal's "Cancel
download" is cosmetic: there is no download-abort IPC, so dismissing the modal stops the
poller but the main-process stream keeps writing to disk.

**Hardware fit is advisory and wrong at the boundary.** `min_ram_gb: 13` for klein-4B is a
VRAM-flavored number; on Apple Silicon unified memory the whole working set (≈8 GB bf16
weights + Mistral/Qwen-class text encoder + VAE + activations + OS + app) shares one pool, so
a 16 GB M-series at normal load qualifies and will swap-thrash. `getMachineProfile` computes
`freeMemGB` and never uses it; there is no pre-flight anywhere in the Python backend (frozen
binary — can't add one). The console-only `verifyModelsHardwareCompatibility` already
computes the right verdicts and shows none of them.

**FLUX.2 facts worth pinning (2026):** klein-4B is 4B parameters, Apache 2.0, ≈8 GB VRAM /
12–13 GB unified memory, ~1.3 s/generation on a consumer GPU; klein-9B and dev are
Non-Commercial-licensed, server-class unless quantized (dev is 32B; NF4 ≈ 18–20 GB). HF has
migrated storage to Xet (content-addressed), which means naive `Range:`-resume through the
legacy LFS Bridge can silently 403 — a resume implementation must verify 206/ETag. Apple
Silicon FLUX runners exist (MLX/`mflux`, GGUF) — a viable blueprint for a future "FLUX
engine" sidecar, not for the current TF backend.

## 4. Competitive landscape

- **LM Studio**: hybrid catalog — direct HF Hub search/URLs plus a curated allowlist,
  quantization dropdowns, hardware-fit recommendations at load time, in-app HF auth bridging
  `~/.cache/huggingface/token`.
- **ComfyUI-Manager**: remote JSON channel manifests fetched with local caching (1-day TTL),
  `security_level` gating, shared HF credential paths.
- **Pinokio**: script-driven installers; every download/env step is a declarative JSON/JS
  action — transparent and reproducible.

The pattern that matters: **successful apps decouple the app binary from heavy weights via a
"Discover"/"Explore" hub with accurate file sizes, VRAM-fit indicators, and 1-click queues** —
and they *show* aspirational models with badges rather than hiding them (gaming's grayed-out
"Requires RTX 40-series" toggle, LM Studio's green/red fit indicators). The honest label set:
🟢 runnable natively · 🟡 requires quantization/offload · 🔵 download-only / not-yet-runnable.

## 5. Decision order & implementation roadmap

The Critic's verdicts, sharpened across rounds:

1. **Product-honesty fix first (zero backend work, kills the trap at its source).**
   - Fix `GENERATABLE_MODEL_TYPES` → what the active backend actually runs
     (`['sd_model', 'sd_model_inpaint']`); drop the `isFlux2Model` bypass in
     `isSelectableOnboardingModel` so `preferFlux2: true` can never recommend a
     non-generatable model.
   - Remove FLUX.2 from the optional-downloads curated list (`App.vue fetchOptionalModels`
     candidateIds) and badge/filter non-generatable entries in ModelStore (🔵 pattern).
   - Fix the Homepage banner copy that advertises FLUX.2.
   - **Audit every generation entry point** (applets included) — the Homepage-only refusal is
     the riskiest gap.
   - Design the gate as **one exported allowlist constant** so it flips when a real FLUX
     backend lands (upstream binary re-packaging or an MLX sidecar), instead of a rewrite.
2. **Download robustness in the existing JS IPC** (a Python downloader is a packaging
   project — packaged apps ship no `python3`): `Range:`-resume with a `.partial` sibling,
   atomic rename, `206` vs `200` detection, LFS **ETag** (content SHA-256) verification in
   place of `skip_checksum`, a real `download-cancel` abort IPC, and `.partial` cleanup at
   startup. Do this **before** promoting the gated tier — otherwise a 19 GB token-gated
   download that drops at 90% recreates the trap.
3. **In-app HF token UX**: Settings field + Electron `safeStorage` (Keychain/DPAPI — no
   keytar), `resolve_hf_token()` checking storage first, `clearHfTokenCache()` on save.
   Settings-first; onboarding integration only if gated models ever return to the
   recommended tier.
4. **Backend decision, now resolved**: no reachable FLUX path in the packaged binary → gate
   permanently until a backend exists. If FLUX becomes strategic, the architectural path is
   a **decoupled MLX/ONNX "FLUX engine" sidecar** (the Ollama/Pinokio isolation pattern), not
   the TF 2.10 stack.

Cross-cutting: honest `min_ram_gb` floors vs unified memory (16/24–32 GB), surface the
console-only hardware report, and keep disk-space economics in mind (generation needs ~2×
model size in scratch/swap headroom; macOS storage warnings).

## 6. Open questions (left open, per Explore mode)

- **Upstream trajectory**: upstream DiffusionBee has no FLUX.2 (issue #576, Nov 2025) and the
  fork's dev loop (venv311 TF) cannot verify FLUX behavior even after re-packaging — how does
  the fork test a future upstream FLUX release? The reversible-flag design is the hedge.
- **Licensing UX**: how to surface Non-Commercial (9B/dev) vs Apache 2.0 (4B) guardrails
  before download without scaring off the 95% who only want klein-4B.
- **Gated-tier UX**: hidden (current) vs locked-with-login (LM Studio) — data on token
  adoption in consumer desktop apps would settle it; the honesty fix removes the urgency.
- **First-run recommendation on a 16 GB Mac in 2026**: klein-4B (once a backend exists),
  SDXL, or DreamShaper? The scoring function currently answers this wrong because it scores
  non-generatable entries — the honesty fix surfaces the decision rather than resolving it.
- **Xet/Bridge resume behavior** under real-world conditions (rate limits, VPN clashes)
  needs an empirical pass before shipping step 2.

## Files touched (reference)

`electron_app/src/utils/flux2_catalog.js` · `electron_app/src/utils/model_selection.js` ·
`electron_app/src/utils/hf_auth.js` · `electron_app/src/App.vue` ·
`electron_app/src/AssetsManager.vue` · `electron_app/src/native_functions.js` ·
`electron_app/src/pages/Homepage.vue` · `electron_app/src/pages/ModelStore.vue` ·
`install_hf_model.py` · `scripts/install_flux2_models.py` · `scripts/setup_models.py` ·
`scripts/lib/fixtures.py` · `package.json` · `electron_app/vue.config.js`
