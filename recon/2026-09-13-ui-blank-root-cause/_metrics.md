# Metrics

Session start: 2026-09-13 (continuation session, "again and harder")

## Round 1 — evidence re-audit + probe v3
- Explorer (screenshot pixel audit + CSS/font audit): ~40k tokens, 8m — prior session's "proof" LTR screenshot was near-empty (1,427 colors, edge density 1.54 vs 11.12 in Arabic shot); probe v3 exposed default-RTL state, clipped composer, broken probe clip keys
- Critic (test design): demanded clean-state launch, pixel analysis, native screencapture cross-check
- Round wall clock: ~8m
- Round total tokens: ~40k

## Round 2 — probe v4/v5 + root cause isolation
- Explorer (probe v4 full suite): found clean-reload → blank app repro; Enter did not submit; composer actions row clipped below fold at 1070x700
- Critic (probe v5 gated forensics): deterministic repro — appHtmlLen plateaus at 6,713 bytes, zero console errors, splash dismissed, router never mounted
- Associator (protocol trace): `sdbk mdld` printed once at backend startup, `sdbk inrd` re-emitted every loop; renderer warm-start never sees `mdld` → `is_ready()` never opens
- Round wall clock: ~18m
- Round total tokens: ~75k

## Round 3 — fix + verification
- Fix: StableDiffusion.vue (inrd implies is_backend_loaded), Homepage.vue (Enter submits, Shift+Enter newline, vertical compaction), background.js reverted (unfreeze_win min-clamp 1070x700 governs)
- Verification: probe v5 repro now mounts at t+2s; probe v4 full suite green on dev; rebuild via npm run build:install; probe v4 full suite green on installed app (Enter → loader +0.0s → gone +63.3s → image #58); lint clean; build:ui clean; 8/8 node tests
- Round wall clock: ~25m
- Round total tokens: ~85k

## Cumulative
- Total tokens: ~200k
- Total wall clock: ~51m
- App source files changed: 2 (electron_app/src/StableDiffusion.vue, electron_app/src/pages/Homepage.vue)
