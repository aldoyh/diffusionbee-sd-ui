---
title: "R1 Critic — FLUX.2 / Optional Models Onboarding"
date: 2026-08-09
agent: critic
mode: explore (divergent)
topic: stress-testing the FLUX trap, download pipeline, HF token UX, hardware fit
---

# R1 Critic — FLUX.2 / Optional Models Onboarding

## (A) Verdicts on each stress-test (with evidence)

**1. THE FLUX TRAP — Verdict: Truly broken.**
- `model_selection.js`: `pickOptimalOnboardingModel(..., { preferFlux2: true })` filters via `isSelectableOnboardingModel` then prefers FLUX.2; `scoreFlux2Model` gives klein-4b base 120+80=200 vs SD1.5's ~72–96. On a ≥13 GB machine with no HF token, klein-4B (min_ram 13, no token needed) is selectable and wins.
- `flux2_catalog.js`: klein-4B `recommended_for_onboarding: true`, `requires_hf_token: false`, 7.75 GB.
- `Homepage.vue:902-905` and `1204-1207`: hard refusal — "FLUX.2 is downloaded, but the current generation backend supports Stable Diffusion models only."
- Backend (`backends/stable_diffusion/`, TF 2.10): no flux2 inference; `test_all_models.py:729` "SDXL and FLUX models require separate backends." The only `flux_generator` lives in the *upstream packaged binary* which the fork reuses opaquely and the renderer never invokes.
- The onboarding banner itself **advertises FLUX.2 Klein** ("including FLUX.2 Klein when available — and download it from Hugging Face in one click") — the UI is selling a feature the backend can't deliver. That's the sharpest version of the trap.
- **Nuance:** the refusal toast is the *correct product call* given backend reality (fail loudly, don't crash) — but it's positioned wrong: it should be a **pre-download gate**, not a post-download toast. Onboarding should never recommend a model the engine can't run.
- **Platform nuance:** if the bundled SD1.5 is seeded, `existing.length > 0` → onboarding skipped entirely → the trap never fires (Windows). The trap fires on macOS, where bundling is uncertain/missing. So the trap is platform-conditional.

**2. DOWNLOAD PIPELINE — Verdict: Multiple real defects.**
- `native_functions.js` `download-file`: `request.get`, no Range, no `.partial`, no retry; on error the dest file is unlinked → a 90% drop = full re-download (7.75 GB; 54 GB dev is brutal).
- **`rejectUnauthorized: false`** — TLS verification disabled. Low actual risk for HF itself (trusted CA), but combined with `skip_checksum` + no md5 on FLUX.2, a download's integrity depends on *nothing*: a MITM/captive-portal proxy could swap bytes undetected. `skip_checksum` is technically redundant for FLUX.2 (no md5 field → `!md5_hash` passes anyway) but the combination is the sharpest integrity hole.
- **`timeout: 0` for HF** — a stalled connection hangs forever with no user escape.
- **"Cancel download" is cosmetic**: `dismiss_model_setup` clears the renderer poller, but there is **no download-cancel IPC** — the main-process request keeps streaming to disk after the UI "cancels." That's a real leak (hidden disk write + wasted bandwidth).
- Checksum mismatch on SD models → full re-download (no incremental verification).

**3. HF TOKEN UX — Verdict: Worse than shown-locked, and dead-on-arrival for the installed product.**
- Token only from process env (`hf_auth.js` → IPC `get_hf_token` → `resolve_hf_token()`). **macOS GUI apps launched from Finder do NOT inherit the user's shell environment** (launchd env, not shell). So for a normal DMG user, `HF_TOKEN` is effectively *always empty* — the entire gated-model path (Klein-9B, dev) is unreachable for the actual installed product. Only dev-mode (`npm run serve` from a terminal) or `launchctl setenv` users ever see gated models.
- Hiding gated models (`enrichFlux2Model` → null) is defensible as "progressive disclosure by credential" — no dead click paths — but combined with the env-only token it means the product's most expensive models are invisible to ~everyone.
- Prior recon's "~95% of onboarding users never need the token" is right *because* the path is broken, not because demand is low.

**4. HARDWARE FIT — Verdict: Advisory-only and unsafe at the boundary.**
- `isSelectableOnboardingModel` checks `totalMemGB` (not `freeMemGB`); min_ram 13 for klein-4B is VRAM-flavored (~4B params bf16 ≈ 8 GB weights + text encoder + VAE + activations). A 16 GB M-series with 14 GB already used still qualifies → OOM/swap thrash risk. `getMachineProfile` computes `freeMemGB` but it's never used for selection.
- No enforcement at download or load; Python backend has no memory pre-flight.

**5. SETTLED CLAIMS — staleness check:**
- Claims 1–7, 10: **CONFIRMED still live** (verified in 2026-08-09 code).
- Claim 8 (bundled SD1.5 de-ranked): **REFINED** — if bundled model is seeded, onboarding is skipped entirely (trap avoided). The de-ranking only matters on macOS where bundling is absent. Also, **AGENTS.md says CI/installers are built model-free** ("the app downloads models on first run"); `.bundled-models/` is only present when a dev ran `npm run bundle:models`. So bundling is developer-opt-in, not the shipped default — partially contradicts the prior framing.
- Claim 9 (macOS bundling uncertain): still an open verification item.

## (B) The 3 strongest objections, ranked

1. **The onboarding flow actively recommends a model that cannot generate.** preferFlux2 + score 200 + banner advertisement = a first-run user with 16 GB is walked into a 7.75 GB dead-end download — on the first run, the moment that determines retention. Fix: `pickOptimalOnboardingModel` must only consider models the current backend can actually run; banner must not advertise FLUX.2.
2. **The HF token path is dead-on-arrival for the installed product** (macOS GUI apps don't inherit shell env) **and gated models silently vanish** — the most expensive models are unreachable for everyone except devs. Either add in-app token entry (Settings field + browser flow + keychain) or stop pretending the tier exists.
3. **Download integrity/robustness: `rejectUnauthorized:false` + skip_checksum (no md5 on FLUX.2) + no resume + UI cancel doesn't abort the main-process download.** For the largest downloads in the product, integrity is guaranteed by nothing, a mid-drop costs a full re-download, and "Cancel" is cosmetic.

Honorable mention: min_ram_gb advisory-only at selection, using total (not free) memory, no pre-flight at load.

## (C) Steelman — what's RIGHT about the current design

- The `generatePrompt` refusal is defensible: fail loudly with a clear message rather than feed flux2 weights to a backend that would crash or produce garbage.
- Gating via `enrichFlux2Model` null-return is a cheap, safe way to hide credential-dependent entries — no dead click paths for token-less users.
- The hardcoded FLUX.2 catalog schema (`hf_repo_id`, `hf_filename`, `requires_hf_token`, `skip_checksum`, size_bytes, min_ram_gb) is clean and could move server-side verbatim.
- `skip_checksum` for FLUX.2 is arguably right: no md5 is published for HF LFS files in this catalog; an honest flag beats a lying checksum.
- `preferFlux2` is the right *product ambition* (FLUX.2 is the best open model family) — it's just unmoored from backend capability. The intent is good; the gate is missing.
- The dual install path means developers CAN install FLUX.2 reliably via `hf_hub_download` (with resume); the UI path is the weak one.
- 15 s AbortController timeouts on catalog fetches (App.vue) are good hardening from the 08-05 audit.

## (D) What R2 should investigate

1. **Backend reality (THE fork in the road)**: does the packaged core binary (from `/Applications/DiffusionBee.app`) contain a flux_generator / flux modules (PYZ/xdis inspection, as done for NSFW)? If YES → the fix is renderer wiring (invoke it). If NO → FLUX.2 must be fully gated in the catalog (`recommended_for_onboarding: false` until a backend exists).
2. **macOS env reality**: verify GUI-app env inheritance; check Info.plist `LSEnvironment` / launchd; measure what a real DMG user sees for `get_hf_token`.
3. **macOS bundling**: trace `npm run build` / `build:dir` chain for `bundle:models`; reconcile with AGENTS.md "installers are model-free".
4. **Free-memory pre-flight**: use `freeMemGB` in selection + add load-time guard in the Python backend; determine the real RAM floor for klein-4B on Apple Silicon.
5. **Download robustness options**: `hf_hub_download` in main via Python, Range-resume with `.partial`, fetch streaming with AbortController wired to Cancel, sha256 verification surfaced as progress.
6. **Gated-model UX**: design "locked vs hidden" with real data on HF token adoption in consumer desktop apps.
7. **Product decision**: what should the recommended onboarding model be on a 16 GB Mac in 2026 — FLUX.2-klein-4B (if backend exists), SDXL, or DreamShaper?
