---
title: "R1 Synthesizer — FLUX.2 / Optional Models Onboarding"
date: 2026-08-09
agent: synthesizer
mode: explore (divergent)
topic: territory map, tensions, R2 focus recommendations
---

# R1 Synthesizer — FLUX.2 / Optional Models Onboarding

## (A) The Territory Map

### 1. "Make FLUX.2 generatable first" (Backend work)
Adapt the Python backend inference layer to load and execute FLUX.2 weights (flow-matching pipelines, safetensors, quantized variants) on local hardware, primarily Apple Silicon unified memory. **Cost:** highest — significant MPS memory engineering, OOM risk on base MacBooks, quantization work. **Unblocks:** the baseline capability; without it every other framing is a workaround.

### 2. "Stop recommending what we can't run" (Product-honesty fix)
Re-architect recommendations and banners so users are never nudged toward models whose runtime threshold their hardware doesn't meet. **Cost:** low-to-moderate. **Unblocks:** trustworthy first-run, fewer support tickets, kills the FLUX trap at its source.

### 3. "Treat FLUX.2 as a first-class remote catalog entry" (Architecture fix)
Move from hardcoded static lists to a server-driven remote catalog so new models/quant variants can be added without an app release. **Cost:** medium — server coordination, offline fallback handling. **Unblocks:** agility for future model drops; removes the source-code catalog bifurcation.

### 4. "Bundle + offline-first" (Download UX fix)
Redesign the download manager for multi-GB weights: pause/resume, background progress, checksum verification, disk-space budgeting before download. **Cost:** significant UX engineering, cross-platform testing. **Unblocks:** eliminates corrupted half-downloaded safetensors and silent failures.

### 5. "HF token as first-class auth" (Gating fix)
Embed secure HF token management in Settings/onboarding: keychain storage, in-app login/validation, clear gated-model affordances. **Cost:** moderate security/UI overhead. **Unblocks:** legal access to gated weights without terminal hoops; fixes the env-only-token dead end.

## (B) The Tensions

1. **"Recommend the best model" vs. "Recommend what we can run"** — marketing/demand says showcase FLUX.2; hardware reality says a 32B or heavy quant on an 8/16 GB Mac OOMs. *Resolution vector:* decouple *discovery* from *default recommendation* using dynamic hardware profiling at launch.
2. **"Server catalog as source of truth" vs. "Offline-first reliability"** — remote catalog gives instant updates; offline/firewalled users get nothing. *Resolution vector:* bundled fallback catalog + incremental background sync.
3. **"Heavy flagship weights (7–30+ GB)" vs. "Lightweight bundled defaults (SD1.5)"** — instant-gratification core value vs. multi-GB optional bloat. *Resolution vector:* optional models strictly secondary; keep the fast-start core intact.
4. **"FLUX.2 hardcoded in source" vs. "Server catalog has no FLUX.2"** — the app is ahead of its own catalog server; every model addition needs a code commit + release.

## (C) R2 Focus Recommendations (ranked by leverage)

1. **Hardware-gated onboarding + dynamic catalog strategy** — solves the root cause (crashing on unsupported hardware) while establishing the scalable architecture for FLUX.2 and future models without binary lock-in.
2. **Streamlined auth & gated-download UX** — directly addresses HF gating friction; native token input + validation loop.
3. **Resilient download & storage manager** — prevents corrupted partial downloads, disk-space panics, silent backend failures on multi-GB pulls.
