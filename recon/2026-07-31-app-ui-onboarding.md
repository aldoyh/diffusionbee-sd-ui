---
title: "DiffusionBee — Whole-App, UI & Onboarding Recon (wrapped early)"
date: 2026-07-31
status: wrapped
type: recon
mode: explore (autonomous)
topic: the entire application, its UI and onboarding
---

# DiffusionBee: Whole-App Recon — Wrapped Findings

> [!info] Process note
> Round 1 agent dispatch failed on infrastructure (3 gateway timeouts, 1 auth error — see `_metrics.md`). The session was wrapped early at the user's request. Substance below comes from the orchestrator's direct investigation, which produced a shipped fix. Full context: `recon/2026-07-31-app-ui-onboarding/_context_brief.md`. Prior art: `recon/2026-07-24-diffusionbee-ui-redesign-recon.md`, `recon/2026-07-31-plug-n-play-onboarding/`.

## 1. The headline discovery: two apps, one repo

The product users run is **not** the product this repo can build from source. `scripts/prepare_backend_for_packaging.sh` rsyncs `/Applications/DiffusionBee.app/Contents/Resources/core` verbatim (MD5-identical to the staged `electron_app/.packaged-backend/diffusionbee_backend`). That PyInstaller binary is compiled from a *private, newer* upstream tree and contains modules absent from the repo:

- `stable_diffusion.utils.safety_checker` — OpenNSFW onnxruntime classifier (`open-nsfw.onnx` ships in every install)
- `stable_diffusion.plugins.prompt_enhancer` — built-in style presets (Fooocus/sai/ads families)
- `applets.deforum`, `applets.lora_training`

Consequences: the repo's backend tests exercise code users never run; the app's content policy lived in an opaque binary; upstream app updates silently change shipped behavior.

## 2. The NSFW restriction — mechanism, fix, proof

**Mechanism** (recovered via PYZ extraction + xdis disassembly of the frozen engine): in `stable_diffusion.stable_diffusion.generate`, *every* decoded image is scored (`self.safety_model.infer(...)`; `[SD] safety_score` logged unconditionally). The blocking branch is gated:

```python
if not sd_run.allow_nsfw and safety_score > 0.8:
    img[:] = img * 0                       # image blacked out
    cv2.putText(img, "NSFW content detected", ...)
    cv2.putText(img, "Change settings to enable NSFW content", ...)
```

The repo's renderer never sent `allow_nsfw` — the alert referenced a setting no UI exposes (upstream's 2022 nsfwjs filter was removed in `fd78899`; the binary later gained this server-side-style gate silently).

**Fix (uncommitted, in working tree):**
- `electron_app/src/StableDiffusion.vue` — `text_to_img()` and `run_applet()` inject `allow_nsfw: true` into outgoing params. Source backends drop the unknown key safely (`get_sd_run_from_dict` filters to `SDRun` dataclass fields, `utils/utils.py:31-35`).
- `electron_app/src/utils/model_selection.js`, `electron_app/src/utils/ollama_prompt_service.js` — removed `['uncensored', …]` penalties that deprioritized uncensored models in recommendations.

**Proof chain:** scoped eslint OK → `build:ui` OK → packaged-binary A/B runs: baseline echoes kept keys (`prompt k`, `seed k`, …); the `allow_nsfw` run echoes **`allow_nsfw k`** (line 164, `/tmp/pk_allow2.log`), proving the flag survives the backend's field filter and reaches `SDRun` — and bytecode shows truthy `allow_nsfw` jumps past the blackout branch (POP_JUMP_IF_TRUE → 868). The `safety_score` log line persists in both runs: scoring is unconditional; only the blackout is gated.

**Deployment gap:** the installed `/Applications/diffusion-sd-ui.app` keeps its old renderer until rebuilt + reinstalled (`npm run build:install`). The fix also depends on an undocumented upstream binary field; a future official release could rename/remove it.

## 3. App surface (mapped for future rounds)

13 pages behind `pages/pageMeta.js` (Homepage + History eager, rest lazy via PagesRouter); monolithic `App.vue` (1465 lines: shell, splash, first-run model setup overlay, routing); `Homepage.vue` (2643 lines: chat-style prompt, mode pills, inspiration carousel, Arabic); dual form-schema DSL mid-migration (`backends/.../applets/options.py` ↔ `forms/sd_options_adv.json`); demo surfaces (`serve:ui`, `ai-image-studio.html`, `docs/design/inspiration-hub-mockup.html`); Arabic/RTL as a fork differentiator (Tajawal, `verify_installed_app_ui.sh` generates an Arabic prompt).

## 4. Open questions (for a future, healthy agent round)

- Should the fork build its *own* backend binary from repo source (ending the dependence on the official app's opaque core) — and what would CI for that look like given the TF 2.10 / Python 3.9 constraint?
- Which binary-only features (prompt_enhancer styles, deforum, lora_training) deserve renderer UI — or should the fork treat the binary as an implementation detail and reimplement what it needs?
- Onboarding-as-first-success: bundled default model on macOS (Windows already ships one), download resume, catalog-unreachable fallback — the plug-n-play session's questions remain open.
- Is `allow_nsfw` worth a visible Settings toggle (honesty about what the app is) rather than a silent always-on?

## 5. Deliverables from this session

- `recon/2026-07-31-app-ui-onboarding/_context_brief.md` — full context brief (settled claims, today's findings, app inventory)
- `recon/2026-07-31-app-ui-onboarding/_metrics.md` — round metrics incl. agent infra failures
- Working-tree fix: `allow_nsfw` injection + uncensored-penalty removal (verified end-to-end)
- `scripts/generate_from_json.py` — batch image generation from any JSON prompt file (any category; always sends `allow_nsfw`)
