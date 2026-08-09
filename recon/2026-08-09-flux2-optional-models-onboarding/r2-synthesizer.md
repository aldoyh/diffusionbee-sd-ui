---
title: "R2 Synthesizer — FLUX.2 / Optional Models Onboarding (refined territory map)"
date: 2026-08-09
agent: synthesizer
mode: explore — refine framings, deepen tensions
topic: updated territory map, R3 recommendation
---

# R2 Synthesizer — Refined Territory Map

## (A) Updated Territory Map (framings ranked by current evidence)

1. **Backend-first reality (Rank 1 — gained maximum weight):** BFL specs confirm FLUX.2 [klein] 4B needs ~8–13 GB VRAM; 9B/dev need server-grade VRAM (~20 GB+ unquantized) or heavy quantization. On macOS unified memory, 9B/dev strain or exceed consumer envelopes without quantization/offloading. **The backend dictates the product experience.**
2. **Product-honesty vs vaporware trap (Rank 2 — maintained):** 9B/dev are FLUX Non-Commercial License + gated. Advertising models that fail or need complex config on consumer macOS violates trust. Transparency about what hardware runs what tier is mandatory.
3. **Remote catalog vs local catalog bifurcation (Rank 3 — gained weight):** catalog split between bundled defaults (SD1.5, 2.27 GB) and remote tiers (klein-4B, 7.75 GB). Onboarding must handle dynamic catalog fetch without assuming connectivity.
4. **Bundle + offline resilience (Rank 4 — maintained):** DiffusionBee's core value is out-of-the-box local operation; forcing large downloads at first-run creates drop-off. Keep SD1.5 instant, optional models opt-in.
5. **HF-auth via env vars on macOS (Rank 5 — fully refuted/dead):** GUI users don't launch via shells; token handling must be in-app settings or dropped in favor of Apache 2.0 open-weights (klein-4B).

## (B) The 3-4 tensions most worth R3 development

1. **The onboarding trap: remove FLUX.2 vs ship a backend that runs it.** Pole A (abolitionist): strip FLUX.2 from first-run onboarding; keep SD1.5-centric fast start. Pole B (frontier maximalist): keep FLUX.2 front-and-center, explicit opt-in download of Apache 2.0 klein-4B for qualifying machines.
2. **The gated-model tier fiction on macOS.** Pole A (strict realism): 9B/dev NCL tiers are fiction for installed desktop users (VRAM + dead env-token); remove or relegate to API. Pole B (bridged UX): in-app OAuth/token storage + GGUF/FP8 quantization so advanced users run 9B on unified memory.
3. **First-run recommendation: FLUX.2-klein-4B (~8 GB) vs bundled SD1.5 (~2.3 GB).** Pole A (conservative economy): instant zero-friction bundled SD1.5. Pole B (quality-first vanguard): push klein-4B (Apache 2.0, modern 2026 quality) despite the download.
4. **Apache 2.0 democratization vs Non-Commercial licensing friction.** Pole A: restrict onboarding suggestions to Apache 2.0. Pole B: expose the full BFL catalog with warning badges.

## (C) What's still unknown

- Metal/unified-memory performance benchmarks for klein-4B and quantized 9B on M1–M4 silicon inside this backend.
- Willingness to implement secure keychain token storage UI (retire env-only).
- Drop-off analytics: 8 GB optional download vs instant bundled weights at onboarding.

## (D) Recommendation

**R3 should happen**, focused on a concrete architectural blueprint for the **first-run onboarding flow UX**, resolving the bundled-SD1.5 vs klein-4B tension, and formally retiring env-only token requirements in favor of in-app credential handling.
