---
title: "R3 Associator — FLUX.2 / Optional Models Onboarding (tension #1 + new complications)"
date: 2026-08-09
agent: associator
mode: explore — develop tension #1, find new complications
topic: hide-vs-ship evidence, download-only catalog pattern, disk economics, platform asymmetry
---

# R3 Associator — Tension #1 Development & New Complications

## (A) Evidence for both poles of tension #1 ("remove FLUX.2 from onboarding" vs "ship a backend that runs it")

**Pole A — hide/gate (consumer-app approach):**
- Gaming (Cyberpunk 2077, Alan Wake 2): high-end presets are **never hidden** — they're grayed out with "Requires RTX 40-series" tooltips, or shown with dynamic performance budgets. Maintains discovery/aspiration without crashing.
- Creative tools (Adobe Generative Fill, FCP ProRes): capability badges ("Requires Apple Silicon M-series or discrete GPU") + cloud fallback prompts.
- AI tools (LM Studio): real-time resource-fit indicators (green/red RAM/VRAM); download allowed regardless of hardware, **execution refused gracefully at runtime with quantization-tier advice** (FP16 → Q4_K_M).
- **Pattern takeaway:** show, badge, gate-at-runtime — never silently hide, never silently crash.

**Pole B — ship the backend:**
- FLUX.2 uses a **single Mistral Small 3.1 text encoder** + DiT scaled to 32B; raw requires >80 GB VRAM; NF4 4-bit via bitsandbytes ≈ 18–20 GB dedicated VRAM/unified memory (diffusers `Flux2Pipeline`).
- Bundling this into the existing PyInstaller macOS/Windows bundle breaks packaging limits. Realistic path = **decoupled "FLUX Engine" sidecar runtime** (ONNX Runtime, MLX, or a separate Python 3.11 sidecar), the Ollama/Pinokio pattern.

## (B) The "download-only / not-yet-runnable" catalog pattern

If FLUX.2 stays in the catalog but isn't runnable:
1. **ModelStore UX:** users see enticing thumbnails with download buttons; clicking starts a transfer that can't be used → immediate friction at Generate time ("Backend quit expectedly", cf. upstream issue #547).
2. **"My Models" gallery degradation:** downloaded-but-unarunnable models become "ghost assets" — heavy files on disk returning generic errors.
3. **The honest label pattern (color-coded capability badges):**
   - 🟢 **Runnable natively** — fully supported by current backend.
   - 🟡 **Requires quantization/offload** — yellow badge + hardware tooltip ("Requires 16 GB+ unified memory").
   - 🔵 **Cloud / download-only / not-yet-runnable** — blue badge ("weights available for external frontends or future backend updates; cannot run on the current local engine").

## (C) NEW complications

1. **Disk-space economics:** SD1.5 ~2–4 GB; FLUX.1 ~12–24 GB; FLUX.2 ~32–54 GB. Downloads into app-support paths without pre-flight disk checks trigger macOS storage warnings; generation needs ~2× the model weight in scratch/swap headroom. Recommend klein-4B blindly when a user has 50 GB free ignores transient scratch needs.
2. **Platform asymmetry:** on Windows, the bundled SD1.5 environment lacks CUDA/DirectML operator parity for FLUX; recommending FLUX models to Windows users via an unvalidated catalog creates a fundamentally unreachable recommendation loop.

## (D) What the final document's onboarding blueprint must reconcile

1. **Honesty fix:** pre-flight hardware profiling before download buttons are clickable; prevent silent failures and "Backend quit expectedly" crashes.
2. **Download robustness:** resumable chunked downloads + checksum verification + disk-space gating (block if free space < model size × 2).
3. **Token & dependency UX:** decouple heavy architectures from the monolithic core via modular sidecars or clear out-of-process boundaries.
4. **Backend reality:** align catalog visibility with actual platform capabilities (disable Mac-only or high-VRAM models on incompatible Windows/low-spec tiers).
