---
title: "R3 Synthesizer — FLUX.2 / Optional Models Onboarding (final structure)"
date: 2026-08-09
agent: synthesizer
mode: explore — final-round integrative structure
topic: final document skeleton, thesis, ranked recommendations, open questions
---

# R3 Synthesizer — Final Structure

## Thesis

> DiffusionBee cannot solve its onboarding crisis by simply adding catalog entries for heavy frontier models; it must first establish **hardware-honest capability gating**, fix silent IPC and authentication traps, and align its local runtime realities before exposing users to multi-gigabyte download loops that fail silently at generation time.

## (A) Final document outline (house style)

1. **YAML frontmatter** — title, date, status, type, mode, topic.
2. **Process log callout** (`> [!info]`) — session narrative, rounds, agents, binary audit.
3. **Introduction & the onboarding paradox** — user expectation of FLUX.2 vs current runtime constraints.
4. **Backend reality & the FLUX trap audit** — confirmed refusals (`Homepage.vue:902/1204`), no native FLUX code, the binary audit result (flux_dylib unreferenced), 7.75 GB vs 32B/54 GB footprints.
5. **Auth, IPC & hardware-floor tensions** — macOS env-stripping, no-resume downloads, `rejectUnauthorized:false`, `skip_checksum`, advisory `min_ram_gb`.
6. **Competitive landscape** — LM Studio, ComfyUI-Manager, Pinokio patterns.
7. **The decision order & implementation roadmap** — Honesty → Robustness → Token UX → Backend, with amendments.
8. **Open questions & unresolved risks** — upstream binary audit status, licensing (NCL vs Apache 2.0), gated-tier UX, MLX sidecar decision.

## (B) Key recommendations (ranked, "if you do nothing else")

1. **Renderer-side capability honesty** — remove/grey out models that lack backend support; fixes the trap at zero backend cost.
2. **Harden download IPC & integrity** — chunked resumption, ETag verification, real cancel; fixes the 7.75 GB dead-end and cosmetic cancel.
3. **Native `safeStorage` token UX** — replace env sniffing with in-app HF token entry (Settings + keychain); un-gates 9B/dev.
4. **Hardware floors** — honest `min_ram_gb` vs unified memory (16/24–32 GB), surface `verifyModelsHardwareCompatibility`.
5. **Decouple the catalog** — move FLUX.2 out of source into the server catalog (with size_bytes, min_ram_gb, license fields) so additions don't need an app release.

## (C) Open questions that must remain open

- **Upstream binary audit**: can a future packaged upstream binary execute FLUX.2 tensor formats safely on Apple Silicon? (Current audit: flux_dylib.dylib present but unreferenced — no reachable path.)
- **Licensing & commercial boundaries**: user liability with Non-Commercial (9B/dev) vs Apache 2.0 (4B).
- **Dynamic gated-tier UX**: how to prompt unauthenticated users inspecting gated model metadata without breaking local-first privacy.
- **MLX sidecar decision**: if FLUX becomes strategic, a separate MLX/ONNX "FLUX engine" binary is the architectural path.
