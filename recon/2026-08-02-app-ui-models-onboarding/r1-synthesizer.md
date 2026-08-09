# R1 — Synthesizer Report

Session: 2026-08-02 — DiffusionBee whole-app, UI, model-selection & onboarding recon (round 2)

## Settled claims (established, build on these)

1. Splash "NaN%" was caused by NaN download progress when servers omit Content-Length; fixed at
   the producer (send `-1`) and hardened at every consumer with `Number.isFinite`.
2. The Homepage recent gallery only hydrated one history group after restart; now hydrates up to
   10 newest groups through the existing broadcast/sync machinery.
3. Button/label offsets came from three concrete CSS causes: missing `vertical-align` on the
   theme's inline-flex `.btn` override, stale icon margins fighting the sidebar flex gap, and
   title-bar `margin-top`/`padding-top` offsetting icons and title text.
4. The browser demo now compiles and mounts the real `App.vue` (ipcRenderer shim, no renderer
   `fs` bundling), which makes whole-UI review cheap.
5. Onboarding (one-click default model → optional extras) and model selection are functionally
   sound; the remaining issues are polish (native `<select>` on non-Home pages, cramped optional
   downloads, console-only hardware warnings).

## Productive tensions (worth a future round)

- **"Model-less vs model-first" onboarding:** the app handles both (bundled models vs. fetch),
  but the splash download mapping (`30–85%`) is heuristic — a genuine ETA would need event-driven
  progress instead of 300–500ms polling.
- **Live gallery (memory) vs History (disk):** `live_gallery_groups` is a session-only slice
  (10 groups); History is the durable record. The recent section now seeds from History, which
  closes most of the gap, but a user who deletes an image file still sees a broken tile.

## Recommended focus for the final document

Document the three defect fixes as the deliverable of this session, capture the browser-verified
evidence, flag the gallery runtime check as the one pending verification, and carry the polish
items into open questions.
