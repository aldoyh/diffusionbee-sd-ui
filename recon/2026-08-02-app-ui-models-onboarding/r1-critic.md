# R1 — Critic Report

Session: 2026-08-02 — DiffusionBee whole-app, UI, model-selection & onboarding recon (round 2)

## Critical review of the round-1 findings & applied fixes

### What holds up

1. **NaN root cause is real and correctly attributed.** `parseInt(content-length)` → NaN is the
   classic chunked-encoding/unknown-size download failure; the fix (send `-1` when unknown,
   `Number.isFinite` everywhere downstream) is the right layering: producer fixes the data,
   consumers no longer trust it blindly.
2. **The `-1` (indeterminate) sentinel convention is respected by the splash tracker**
   (`Number.isFinite(dlProgress) && dlProgress >= 0` before mapping) but **clamped to 0% by the
   dialogs** (`Math.max(0, Number(p) || 0)`). Acceptable (0% is honest for unknown size) but the
   producer/consumer convention should be documented to prevent drift.
3. **`vertical-align: middle` on `.btn`** is the minimal, correct fix for inline-flex buttons
   sitting off baseline. Low risk.
4. **Sidebar icon margins removed** — correct: the theme's flex `gap: 12px` + `align-items:
   center` already provide spacing and centering; the stale inline `margin-top:-3px` was
   fighting it.
5. **`hydrateFromHistory` direction** (newest-first, cap at `LIVE_GALLERY_LIMIT`, one
   `Vue.set` replace + `registerGallery` replay) is sound and reuses existing helpers
   (`cloneGalleryGroup`, `hasDisplayableImage`, `syncGalleryGroup`).

### Weaknesses / risks

1. **Gallery fix not runtime-verified** (browser-agent outage). The chain
   hydrate → live_gallery_groups → registerGallery → homeGallery.groups → recentThumbnails was
   traced statically and the primitives are pre-existing, but a true restart-persistence test
   (Electron with `~/.diffusionbee/history.json`) is the definitive check.
2. **`verifyModelsHardwareCompatibility` regression risk:** renderer no longer computes file
   size (now uses catalog `size_bytes` or `unknown`). The report is console-only, so impact is
   minimal, but the change touched behavior beyond the reported bugs — flagged for awareness.
3. **`file_exists` IPC used from renderer** — correct and existing, but if a browser-demo
   session ever runs `verifyModelsHardwareCompatibility`, the shim returns `''` (falsy) → all
   models report "missing from disk". Console-only, acceptable.
4. **Demo shim seeds fake history** — intentional for UI review; must not be mistaken for real
   data. Clearly commented.
5. **`py_vue_bridge.js` guard** (`typeof window.bind_ipc_renderer_on === 'function'`) is a
   defensive improvement that also unblocks the browser demo — low risk, correct.
6. **Sidebar `overflow-y: auto` + absolutely-positioned footer:** on very short windows the
   footer scrolls with content; `position: sticky; bottom: 0` would pin it. Low priority given
   the 550px minimum window height.

### Verdict

The three reported defects are fixed at the correct layer with minimal surface area, existing
helpers reused, lint clean, `build:ui` clean, and the splash + alignment fixes verified in a
real browser. The gallery change is the only one lacking a live end-to-end check; it should get
one before release.
