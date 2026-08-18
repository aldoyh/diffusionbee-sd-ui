# Round 1 — Explorer Report: Full UI/UX + Models Onboarding

**Session**: 2026-08-18 · Focus mode · Topic: "the entire full UI/UX and the models onboarding functionality — improved dramatically"
**Author**: EXPLORER agent
**Scope**: primary sources (live product site, live catalog API, upstream repo, HF) + competitor benchmark + codebase reality-check.

> TL;DR — three of the ten "settled claims" have already been resolved in the uncommitted working tree since the brief was written: **download resume/ETag/cancel (claim 2)** and **model-picker unification (claim 6)** are now implemented; the **FLUX banner copy (part of claim 1)** no longer advertises FLUX. What remains genuinely open: hardware-compat is still console-only (claim 4), HF token is still env-only with no persistence (claim 3), optional-downloads UI is still cramped in the setup modal and now shows a **"0 B" size bug** for every recommended SD model (claim 5), and there is **no speed/ETA anywhere**. The single most important *new* question is whether **FLUX.1** (upstream-supported in 2.5.3, still in the live catalog as `flux_nnc`) was over-corrected out of the gate.

---

## 1. Primary-source findings

### 1.1 diffusionbee.com (product site)
Fetched live. The site sells a **macOS-only, zero-setup, all-in-one** story and is materially out of date relative to this fork.

- Headline: *"The Ultimate Suite of Creative AI Tools"* · sub: *"DiffusionBee is the fastest and easiest toolbox to run AI apps locally with Stable Diffusion"* · single CTA: *"Download for macOS"*.[^site]
- Feature grid: Text to Image, Generative Fill, Video Tools, Image To Image, Image Upscaler, Image Variants, Train Models, Control Images, Illusion Generator. Secondary value props: *"advanced AI canvas"* (human drawing + prompt co-pilot), *"Train models on your data … 100% locally"*, *"runs 100% offline and lets you own your AI … prompts, models and generated images never leave your device"*.[^site]
- FAQ copy (concrete, usable for onboarding copy):
  - *"On 8GB M1 MacBook Air, DiffusionBee takes around 30 seconds to generate an image."*
  - *"DiffusionBee needs macOS 13.1 or higher. Machines with Apple silicon are recommended."*
  - *"Yes, DiffusionBee works with Intel … very slow compared to M1 if you don't have a dedicated graphics chip."*
  - License: CreativeML Open RAIL-M.[^site]
- Gaps: no Windows mention on the marketing page (the fork ships a Windows NSIS build); no onboarding/first-run description; footer `© 2024` (stale). The *"fastest and easiest … no dependencies"* promise is the exact promise the current onboarding tries to deliver, but the site gives zero guidance on what happens after first launch.

### 1.2 models.diffusionbee.com/list_models (live catalog API)
Fetched via `curl` + `python -m json.tool` (full 26 entries). **Schema reality vs what the UI needs:**

Per-entry fields actually present: `id, filename, md5, url, title, source_page_url (civitai), description, post_process ("convert_sd_to_tdict"), img_url, fallback_url`; optionally `model_meta_data {type, float_type, sd_type, trigger_word}`, `min_version`, `is_stock_model`.[^catalog]

**Missing from the catalog entirely: `size_bytes`, `min_ram_gb`, license, tier, hardware-requirements, gating/auth.** Only the in-app `flux2_catalog.js` hardcodes size/RAM/token fields. This is the structural reason hardware/disk surfacing (open gap) and licensing guardrails can't be done from catalog data alone.

Full inventory (26 models):[^catalog]
- **9 legacy community models with NO `model_meta_data` at all** — DreamShaper, Samaritan 3d Cartoon, Deliberate, ReV Animated, Dreamlike Diffusion 1.0, Mo Di Diffusion, GhostMix, CyberRealistic, Game Icon Institute. No type/sd_type/float → the scorer treats them as "generic" (`+44` base).
- **15 SDXL** (`type=sd_model, sd_type=sdxl_base, float_type=float8_1`): SDXL Base 1.0 (`min_version 29`) + 14 community (Juggernaut XL, BluePencil XL, RealVis XL, Animagine XL V3.1, Anything XL, DreamShaper XL Turbo, dynavisionXL, epicrealismXL, Juggernaut XL 10 Hyper, Juggernaut XL 10, Pony Realism, protovision XL, realDream SDXL Pony 7, tPonynai3_v55; all `min_version 36`).
- **2 FLUX.1** — `FLUX.1-schnell` and `FLUX.1-dev` (`type=flux_nnc, sd_type=flux_schnell|flux_dev, float_type=nnc_float_q5p, min_version 40`). **FLUX.1 is still a first-class catalog citizen.**

Notable:
- **`Default_SD1.5` is NOT in the catalog** — it only exists as the hardcoded `FALLBACK_SD15_MODEL` in `model_selection.js` (url → `huggingface.co/divamgupta/stable_diffusion_mps/resolve/main/sd-v1-5_fp16.tdict`).[^fallback]
- **`url` is a query-param proxy** (`https://models.diffusionbee.com/list_models?download_model=<id>`), while `fallback_url` points to civitai API or `hf-mirror.com`. `fallback_url` is **never referenced anywhere in `electron_app/src/`** (grep confirmed) — dead data today.
- The proxy URL pattern means resume/ETag behavior depends on whether the proxy honors HTTP `Range`/`ETag` — unverified (see gaps).

### 1.3 Upstream repo (divamgupta/diffusionbee-stable-diffusion-ui)
Via GitHub API: **13,579 stars · 726 forks · 402 open issues · last push 2024-10-30 (code dormant ~2 years) · AGPL-3.0**.[^repo] Latest release **2.5.3 (2024-08-14)** — release notes are directly relevant:
- *"Support for Flux.1 image generation models (only for arm64 and MacOS 13+). To use flux, scroll down to the bottom in the app home screen."*
- *"Support for external textual inversion embeddings"* · *"Ability to block NSFW images"* · *"More organized models page"*.[^releases]
- 2.5.2: *"Ability to import SD models from Hugging Face · Issues in downloading the main model fixed."* 2.5.0: *"New UI · LoRA support · bfloat16."* 2.2.1: *"Completely new UI · queue generations · video tools · infinite AI canvas."*[^releases]

Open issues that are a ready-made UX backlog (most recent first):[^issues]
- #581 "Typo in home page" (2026-08-08) — still getting trivial polish reports.
- #575 **"[Feature request] Show size of the models in the GUI"** (2025-11-17) — directly validates the size/disk gap.
- #576 "Consider supporting flux2-dev" · #564 "Flux Garbled/Garbage results" · #559 "Flux is not supported with this version 2.5.3" · #557 "Flux Lora import error" — upstream's own FLUX story was broken/incomplete.
- #566 "can not download models" · #560 "website lets you download old version 2.5.1 instead of 2.5.3" · #555 "Failed to install model from Hugging Face".
- #571 *"Good with any intel based Mac …except not"* · #570 *"I will consider this to be the best MacOS AI generation tool, IF..."* · #568 "Has Divam Gupta abandoned this project?" — trust/maintenance sentiment.

### 1.4 Hugging Face (distribution reality)
- **Gated models**: author enables access requests; user must be logged in and click **"Agree"** (shares username+email, optional extra fields); approval automatic **or manual**; **request flow is browser-only** and granted to *individual users*; downloads then require a **user token** (`hf auth login` / `token=` param). New: `extra_gated_eu_disallowed: true` can block EU users by IP.[^hf-gated]
- **Downloading**: `hf_hub_download` is **resumable** (HTTP Range over LFS/Xet). **Xet storage backend** = chunk-based dedup; `hf_xet` does **adaptive concurrency** (starts 1 stream, scales to 64); `HF_XET_HIGH_PERFORMANCE=1` for 64GB+ machines; **`hf-mount`** lazy-fetches files instead of downloading. Firewall allowlist spans `huggingface.co` + `cas-server.xethub.hf.co` + `transfer.xethub.hf.co` + `cdn-lfs-{us,eu}-1.hf.co` etc.[^hf-download]
- The fork's `flux2_catalog.js` already encodes the correct model: FLUX files are verified **ETag-based** (content SHA-256), not catalog-md5-based.[^flux2]

---

## 2. Competitor benchmark (concrete, stealable mechanics)

### 2.1 ComfyUI + ComfyUI-Manager (model/custom-node install UX) — closest analog
- **"Install Models" / "Install Custom Nodes" buttons open an installer dialog** with a **preview image + title + Install button** per row; button states: **"Installed" / "Install" / "Try Install"** (Try = install info can't be confirmed).[^cm]
- **Three catalog DB modes**: `DB: Channel (1day cache)` (fast), `DB: Local` (refresh only with the app), `DB: Channel (remote)` (always latest). A **red "Channel" indicator** signals a non-default channel so users know the list may be incomplete.[^cm]
- **"Fetch Updates"** only retrieves metadata; actual updates require clicking **Update** per item (explicit two-step).
- **"Install Missing Custom Nodes"** — when a loaded workflow references absent nodes, one click lists them (the "resolve my missing deps" pattern DiffusionBee lacks for models).
- **Snapshot save/restore** (`Save snapshot` / `Restore`) to roll back install state; `extra_model_paths.yaml` for `download_model_base` path control.[^cm]
- **Steal**: preview image + explicit state button in a scrollable dialog; a "channel/source" indicator; "Install Missing …"; snapshots for model-set rollback.

### 2.2 AUTOMATIC1111 / Forge (the "no onboarding" baseline)
- **A1111 has no in-app model catalog or onboarding** — you manually drop checkpoints into a folder; extensions install via an Extensions tab; the only "management" is a **Checkpoint Merger** tab and on-the-fly checkpoint reload. One-click install scripts are per-hardware (NVidia/AMD/Intel/Apple-Silicon wiki pages).[^a1111]
- **Forge** adds the **one-click package** pattern: *"Just use this one-click installation package (with git and python included)"* → download a `.7z`, run `update.bat`, run `run.bat`. Hardware-aware pattern: the **FLUX "GPU Weight" slider + "Offload Location"/"Offload Method" toggles**, with a support doc titled *"DO NOT set GPU Weight too high! Lower GPU Weight solves 99% problems!"* — a hardware knob plus an in-context troubleshooting hint.[^forge]
- **Steal**: hardware-aware controls live next to the model; provide a "if it's slow/breaks, lower this" hint. (DiffusionBee's analog would be RAM-fit and precision hints.)

### 2.3 InvokeAI (Launcher + Model Manager) — best local-SD onboarding to copy
- Ships a **Launcher** (Download EXE / DMG / AppImage) with **explicit hardware-gate copy**: *"Download for MacOS — Requires Apple Silicon (M-Series). Not compatible with Intel."* / *"Requires Windows 10 or later, and NVIDIA or AMD GPU."* — hardware constraints stated *before* download, per-OS.[^invoke]
- **Model Manager** manages checkpoints, LoRAs, Textual Inversions, ControlNets in-app (docs literally call it *"intuitive Model Manager"*); supports ckpt/diffusers/gguf.[^invoke]
- **Steal**: put the hardware requirement in the download/CTA copy; a dedicated Model Manager page vs cards buried in a modal.

### 2.4 LM Studio (hardware-aware model discovery) — gold standard for the gap list
- Product pitch (2026, now pivoting to an agent called "Bionic"): *"Download the latest local LLMs directly within the app"*, local/private, MLX + llama.cpp runtime.[^lm]
- Well-known concrete UX (this session's docs fetch failed; see gaps): a **Discover/search tab** over Hugging Face; per-model **"Runs on this machine?"** compatibility estimate with **RAM/VRAM required vs. available**; download with **progress %, speed, and ETA**; **resumable downloads**; a "My Models" library of installed cards.
- **Steal**: compatibility badge + speed/ETA on the download tile are the two most valuable, cheapest wins for DiffusionBee.

### 2.5 Midjourney (minimal onboarding, no model download)
- Onboarding = **subscribe → Create page → "Imagine bar" → press Enter → watch 4 images form in real-time to 100%** → upscale/vary/zoom/pan/Editor. Model/version is a **setting in the Imagine bar** (Version, Stylize, Raw, Aspect Ratio, GPU Speed, Draft Mode), not a download. Personalization via moodboards.[^mj]
- **Steal**: "first image in one bar, zero setup" — the Homepage composer is the right analog but is gated behind a model download; the welcome-tiles carousel already gestures at Midjourney's gallery-first feel.

### 2.6 Civitai (model gating + licensing + in-app economy)
- Model pages expose **file version pickers + per-version license**; **Buzz** (in-app currency) unlocks **early-access/gated/featured** models; Civitai also hosts an **on-site image generator and LoRA trainer** and a **"checkpoint coverage / featured models / auction system"**.[^civ-edu][^civ-repo]
- **Steal**: license is a *download-time choice*, not hidden metadata; "gated = pay/request to unlock" is a first-class state; a curated **"featured" rail** reduces the 26-model choice to 3-6.

### 2.7 Ollama / Pinokio (local model pull + script install)
- **Ollama**: `ollama pull <model>` streams **per-layer progress bars with speed + ETA and resumes interrupted pulls**; `ollama.com/library` is the catalog; `ollama list` manages installed models.[^ollama]
- **Pinokio**: a **"Discover" page of vetted, frozen scripts**; 1-click install; an **install screen alert that shows the source repo URL and warns the script is about to run**; everything sandboxed under `~/pinokio`.[^pinokio]
- **Steal**: resume+speed+ETA is table stakes for any multi-GB pull (DiffusionBee has none); Pinokio's "this script comes from X, click to trust" is the right pattern for surfacing model *provenance* (Civitai/HF source links already exist in the catalog but are never shown).

### 2.8 Leonardo AI / KREA
Fetch failed (JS-heavy help portals unreachable this session). Known-but-unverified patterns, flagged for Round 2: Leonardo = credits + model picker (Leonardo/Flux/etc.) + preset styles; KREA = browser-only, no download, real-time generation, style/model presets. Do not build claims on these without a re-fetch.

[^cm]: https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main/README.md
[^a1111]: https://raw.githubusercontent.com/AUTOMATIC1111/stable-diffusion-webui/master/README.md
[^forge]: https://raw.githubusercontent.com/lllyasviel/stable-diffusion-webui-forge/main/README.md
[^invoke]: https://invoke-ai.github.io/InvokeAI/
[^lm]: https://lmstudio.ai/
[^mj]: https://docs.midjourney.com/docs/quick-start
[^civ-edu]: https://education.civitai.com/
[^civ-repo]: https://raw.githubusercontent.com/civitai/civitai/main/README.md
[^ollama]: https://raw.githubusercontent.com/ollama/ollama/main/README.md
[^pinokio]: https://raw.githubusercontent.com/pinokiocomputer/pinokio/master/README.md

---

## 3. Codebase reality-check (deltas vs the brief)

**The working tree has moved well past the brief.** Verified by reading the actual files, not the prior recon.

### ✅ RESOLVED — claim 2 (fragile downloads: "no Range resume, no abort IPC, no ETag")
`electron_app/src/native_functions.js` (`download-file` handler) now implements:
- **Range resume**: `Range: bytes=<existingSize>-` re-request on retry; keeps a `.partial` + a JSON **sidecar** (`etag`) file; on 206 it appends, on 200 (server ignored Range) it overwrites.[^nf]
- **ETag integrity**: records `etag` from first response; on resume, **discards the partial and restarts fresh if ETag changed** (revision drift); fresh downloads hash the whole stream (md5), resumed ones re-read the full file to re-verify before finalizing.[^nf]
- **Cancel**: real `download-cancel` IPC aborts the stream in main; `AssetsManager.cancel_download()`; renderer `on_cancelled` callback.[^am]
- **Partial cleanup**: orphaned `.partial` files swept at startup via `cleanup_partial_downloads` (also reveals a limitation — see gaps).[^am]
- **NaN% guard**: unknown-size responses (no Content-Length) → progress `-1` = indeterminate instead of "NaN%".[^nf]
- **Standalone test**: `electron_app/scripts/tests/download_resume.test.js`.[^nf]

**Caveats that keep this only *mostly* resolved**: (a) no **speed/ETA** in any download UI (grep for `ETA|speed|bytes/s|Mbps|remaining` found nothing); `DownloadButton.vue` shows a bare `<b-progress>` bar + `%` and truncates errors to `error.slice(-30)`.[^db] (b) resume is **same-session** — in-flight state is in-memory and partials are deleted on next launch, so it does not survive an app crash/restart the way LM Studio/Ollama resume does. (c) resume depends on the `models.diffusionbee.com` proxy honoring `Range`/`ETag` (unverified).

### ✅ RESOLVED — claim 6 (Homepage uses ModelSelector; applets use native `<select>`)
`BasicSDApplet.vue` now rewrites the `selected_sd_model` form element to `component: 'ModelSelectorInput'` and attaches resolved `model_assets`; `ModelSelectorInput.vue` wraps the visual `ModelSelector` with the same `config/form_values` interface as `Dropdown.vue`.[^basic][^msi] Txt2Img/Img2Img/Inpainting/Upscaler therefore now render the **card-style ARIA listbox**, not a native `<select>`. `ModelSelector` itself is still only *directly* used by Homepage, but the picker is effectively unified. (Confirm visually in Round 2 — the schema-dispatch path is indirect.)

### ✅ RESOLVED (part of claim 1) — FLUX banner no longer advertises FLUX
Homepage banner copy is now *"Install one model to start generating … We will pick the best model for your machine and download it in one click — no setup needed."* — no FLUX mention. The FLUX gate is enforced end-to-end: `GENERATABLE_MODEL_TYPES = ['sd_model','sd_model_inpaint']` in `flux2_catalog.js` is the single allowlist; `isSelectableStableDiffusionModel`/`isSelectableOnboardingModel` reject flux/flux2; `preferFlux2` is **default-off**; `App.vue` deliberately does not pass `preferFlux2`; Homepage `generatePrompt` + the `isFlux2Model` toast hard-refuse if a FLUX model is somehow selected; `ModelStore` badges FLUX.1/FLUX.2 as *"🔵 Download only — not runnable on this build."*[^flux2][^ms][^home][^store]

### ⚠️ STILL OPEN — claim 4 (hardware compatibility is console-only)
`App.vue:882 verifyModelsHardwareCompatibility()` builds a full ASCII report (`═`/`✅`/`⚠️`) with RAM thresholds — **FLUX ≥16GB, FLUX.2-dev ≥28GB, SDXL ≥12GB**, float-precision notes for Apple Silicon, and file-exists checks — but it **only `console.log`s** it. None of this reaches the UI during selection/download.[^app] The scorer (`model_selection.js`) *does* use RAM to rank, but the user never sees *why* a model was chosen or that another model won't fit. This is the cheapest high-impact win: the data is already computed.

### ⚠️ STILL OPEN — claim 3 (HF token: env-only, not persisted)
`hf_auth.js` still reads the token synchronously from main-process env via `get_hf_token` IPC and caches in-memory; no Settings field, no `safeStorage` persistence, no login flow. Gated FLUX.2 models are simply dropped from the catalog when no token is present (`enrichFlux2Model` returns null).[^hf] Also note: HF gating **requires browser-based "Agree"** to *request* access, so even with a token field, a gated model the user hasn't approved won't download — the flow needs an "open model page in browser" affordance (see gaps).

### ⚠️ STILL OPEN + NEW BUG — claim 5 (optional downloads cramped) & the "0 B" size bug
Optional-downloads still live inside the `model-setup-dialog` overlay (`App.vue` `show_optional_model_downloads`), a cramped checkbox list inside the modal. **New concrete bug**: the list renders `{{ format_model_meta(model) }} · {{ formatBytes(model.size_bytes || 0) }}`, but the **live catalog has no `size_bytes`** for any SD model, and `formatBytes(0)` returns `"0 B"` — so every recommended model in the "More models" step shows **"0 B"**.[^app] (FLUX.2 had real `size_bytes` but is now excluded from the curated list, so the size column is currently meaningless.)

### ⚠️ OBSERVATION — default-model choice leans SDXL on 16GB Macs
`scoreStableDiffusionModel` gives every `sdxl_base` model a flat **+100** base (vs `+72` SD1.x / `+44` unknown-type) and only nudges `+45/+24/−38` by RAM. On a 16GB machine SDXL gets +24 → a ~6-7GB `sdxl_base` tdict (e.g. Juggernaut XL) wins as the "default"; on 8GB the unknown-type community models (DreamShaper ~+78) beat SDXL (~+62). Onboarding's curated optional list is hardcoded to `DreamShaper_6_baked_vae, CyberRealistic__v3.1, Juggernaut_X`.[^ms][^app] Worth a deliberate product call (SD1.x for fastest first image vs SDXL for quality) — the open brief question "first-run on a 16GB Mac in 2026" is not yet explicitly decided in code.

### ⚠️ OBSERVATION — `fallback_url` and catalog trust are unused
`fallback_url` (civitai API / hf-mirror) is dead data; downloads only use the `models.diffusionbee.com?download_model=` proxy. `app_version.js:isModelDownloadAllowed` **intentionally ignores** upstream `min_version` gates (so FLUX.1's `min_version 40` does not block; only the generatability allowlist blocks it).[^av] `DownloadButton` shows the download but no provenance (source URL/license) — the catalog already carries `source_page_url` that is never surfaced.

[^nf]: `electron_app/src/native_functions.js` (download-file handler)
[^am]: `electron_app/src/AssetsManager.vue`
[^db]: `electron_app/src/components/DownloadButton.vue`
[^basic]: `electron_app/src/components/BasicSDApplet.vue`
[^msi]: `electron_app/src/components_bare/inputform/ModelSelectorInput.vue`
[^ms]: `electron_app/src/utils/model_selection.js`
[^home]: `electron_app/src/pages/Homepage.vue`
[^store]: `electron_app/src/pages/ModelStore.vue`
[^app]: `electron_app/src/App.vue`
[^hf]: `electron_app/src/utils/hf_auth.js`
[^av]: `electron_app/src/utils/app_version.js`

---

## 4. Knowledge gaps (missing / needs Round 2 verification)

1. **Is FLUX.1 actually generatable in the current fork build?** Upstream 2.5.3 shipped FLUX.1 (`flux_nnc`) for arm64/macOS13+, and it's still in the live catalog — but the fork's `backends/stable_diffusion/diffusionbee_backend.py` contains **zero "flux" references** and `GENERATABLE_MODEL_TYPES` excludes `flux_nnc`. If the packaged official PyInstaller binary (reused from `/Applications/DiffusionBee.app/Contents/Resources/core`) still carries the `flux_nnc` runtime, gating FLUX.1 out is an **over-correction** and should be re-enabled for arm64. If the binary truly has no FLUX, the gate is correct but the **catalog should stop listing FLUX.1** as downloadable. Must audit the shipped binary, not the dev source.
2. **Does the download proxy honor `Range`/`ETag`?** `models.diffusionbee.com/list_models?download_model=` is a query-param endpoint. Resume/ETag correctness depends on its behavior. Probe with a `HEAD` + `Range` request (and compare to `fallback_url` civitai/hf-mirror behavior).
3. **`fallback_url` strategy** — should the downloader try `fallback_url` on proxy failure (the code path exists in spirit but is unwired)? Also clarify why `fallback_url` points at `hf-mirror.com` (a China mirror) rather than primary HF/Civitai.
4. **Catalog schema enrichment** — no size/RAM/license/tier fields server-side. Decide: enrich server-side (catalog is the source of truth) vs enrich in-app (like `flux2_catalog.js` does). Needed for the size column, disk-space economics, and license guardrails.
5. **Gated-model access is browser-only on HF** — the in-app token field (planned) is insufficient for *first-time* gated access; the user must click "Agree" on the model page in a browser. Design the "open in browser to request access" hand-off.
6. **Cross-restart resume** — current resume is same-session only (partials swept at startup). Decide whether to persist `.partial`+sidecar and resume on relaunch (the LM Studio/Ollama behavior).
7. **Speed / ETA / free-disk estimation** — entirely absent app-wide (`getMachineProfile` has `freeMemBytes` but nothing computes/downloads "disk free" or throughput). Needed to match LM Studio/Ollama.
8. **Leonardo AI + KREA + LM Studio docs** — fetches failed/307'd this session (only LM Studio marketing page captured). Re-fetch in Round 2 for their 2025-26 onboarding specifics before asserting patterns.
9. **Windows parity** — the live site and much of the onboarding copy are macOS-centric; the fork ships Windows NSIS. Confirm the onboarding flow (RAM detection via `navigator.deviceMemory` vs `process.getSystemMemoryInfo`) behaves on Windows.
10. **"Skip" semantics** — `dismiss_model_setup` calls `completeOnboarding()` (sets `onboarding_completed=true`) even when the user skipped the download, so the Homepage banner won't reappear with zero models; only the small inline "Download default model" empty-state remains. Decide if skip should mark onboarding done.

---

## 5. Net takeaway for the Synthesizer

The brief's biggest "settled" problems (resume, picker inconsistency, FLUX trap) are **largely fixed in the working tree already** — the remaining work is (a) **surfacing already-computed data** (hardware-compat report, provenance/license, per-model size, speed/ETA), (b) **fixing the "0 B" size bug** and moving optional downloads out of the cramped modal into ModelStore, (c) **the HF token + gated-access flow** (persistence via safeStorage + browser hand-off), and (d) **a deliberate product decision on FLUX.1** and the 16GB-Mac default model. Competitor patterns worth stealing first: LM Studio's "runs on this machine" badge + speed/ETA, InvokeAI's per-OS hardware-gate copy, ComfyUI-Manager's preview-image installer with explicit Install/Installed states, and Civitai's license-at-download + featured rail.

---

## Footnotes — primary sources (definitions)

[^site]: https://diffusionbee.com
[^catalog]: https://models.diffusionbee.com/list_models
[^fallback]: `electron_app/src/utils/model_selection.js` (FALLBACK_SD15_MODEL)
[^repo]: https://api.github.com/repos/divamgupta/diffusionbee-stable-diffusion-ui
[^releases]: https://api.github.com/repos/divamgupta/diffusionbee-stable-diffusion-ui/releases
[^issues]: https://github.com/divamgupta/diffusionbee-stable-diffusion-ui/issues
[^hf-gated]: https://huggingface.co/docs/hub/en/models-gated
[^hf-download]: https://huggingface.co/docs/hub/en/models-downloading
[^flux2]: `electron_app/src/utils/flux2_catalog.js`






