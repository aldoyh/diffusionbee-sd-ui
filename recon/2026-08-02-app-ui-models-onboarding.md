---
title: "DiffusionBee — Whole-App, UI & Onboarding Recon (Round 2) + Defect Fixes"
date: 2026-08-02
status: wrapped
type: recon
mode: explore (autonomous)
topic: entire UI, model selection, onboarding, and three reported defects
---

# DiffusionBee: Whole-App Recon Round 2 — Three Defects Fixed, Onboarding & UI Reviewed

> [!info] Process log
> Session started 2026-08-02. Round 1: parallel code searches + live browser verification of
> the `serve:ui` demo; reports in `recon/2026-08-02-app-ui-models-onboarding/`
> (`r1-explorer.md`, `r1-critic.md`, `r1-synthesizer.md`, `_metrics.md`). Round 2: critical
> review of the applied fixes. The user reported three concrete defects alongside the review
> request; all three were root-caused, fixed, and (where possible) verified in a browser.
> Prior art: `recon/2026-07-31-app-ui-onboarding.md`, `recon/2026-07-24-diffusionbee-ui-redesign-recon.md`.

## 1. Splash screen "NaN%" — root cause & fix

**Root cause** was in the Electron main process, not the splash component:
`native_functions.js`'s `download-file` handler computed
`progress = Math.round((downloadedBytes / totalBytes) * 100)` where
`totalBytes = parseInt(response.headers['content-length'], 10)`. Model servers that omit
`Content-Length` (Hugging Face LFS, chunked/streaming responses) made `totalBytes` **NaN**, and
the NaN progress propagated to the renderer — where unguarded `Math.round(NaN)` renders the
literal text **"NaN%"** in the splash and model-download dialogs.

**Fix (defense in depth):**
- Producer (`native_functions.js`): send `-1` (indeterminate) when the total is unknown; clamp
  known progress to 100.
- Consumers: `App.vue` `updateSplashProgress` and both download-progress pollers,
  `AssetsManager.on_progress`, `StableDiffusion.vue` `mlpr` (same guard as `dnpr`), and every
  `SplashScreen.vue` computed now require `Number.isFinite` and clamp to 0–100.

**Verified in browser:** the demo splash shows a real percentage (`8%`); forcing
`updateSplashProgress('Test', NaN)` then `updateSplashProgress('Test', 42)` displays `42%` and
never `NaN%`.

## 2. Generated images in the "recent" gallery section

`generation_broadcast.js` `hydrateFromHistory()` only carried the **single latest** history
entry into the live gallery, so after a restart the Homepage "Your generations" strip and
gallery showed at most one image. During a session the live broadcast path worked; the gap was
restart persistence.

**Fix:** hydrate the up-to-10 **most recent** history groups (insertion order, newest last) into
`live_gallery_groups` in one shot, set `last_gallery_group` to the newest, and replay them into
already-registered galleries; later-mounting galleries are covered by `registerGallery()`.
The full chain (hydrate → live list → Homepage `GenerationGallery.register` →
`syncGalleryGroup` → `recentThumbnails` / `totalGeneratedCount` / gallery tiles) was traced and
reuses existing helpers. ⚠️ One open item: a live Electron restart test with a real
`~/.diffusionbee/history.json` is the definitive end-to-end check (browser-agent outage blocked
the demo replay during this session).

## 3. UI buttons & labels rendered "offset"

Three concrete CSS causes, all fixed:

1. **`.btn` baseline drift** — `theme.css` overrode Bootstrap's `.btn` to
   `display: inline-flex` without `vertical-align`, so inline-flex buttons sat off-baseline
   from adjacent labels. Added `vertical-align: middle`.
2. **Sidebar nav icons** — the icon `<svg>` had stale inline `margin-top:-3px; margin-right:3px`
   plus `.sidebar_icon { margin-right: 5px }` on top of the theme's new flex `gap: 12px`
   (`align-items: center`), leaving icons 3px high and ~20px from their labels. Removed the
   margins; flex handles spacing/centering.
3. **Title bar** — `.title_bar_icons` used `margin-top: 16px` on a fixed-height bar and
   `.app_title` used `padding-top: 20px`, pushing icons and the window title low. Both now use
   `display: flex; align-items: center` within the 55px bar (also fixed the collapsed-sidebar
   toggle row's extra margin).

**Verified in browser:** title text and top-right icons vertically centered; no misaligned
buttons observed; sidebar footer pinned at the bottom without overlapping nav items.

## 4. Whole-app / model-selection / onboarding review (round 2 delta)

- **Onboarding flow** (catalog → machine-profile default incl. FLUX.2 → one-click download →
  optional extras) is functionally sound; the download-progress handling was the only
  correctness bug.
- **Model selection:** Homepage uses the new ARIA-listbox `ModelSelector`; other pages
  (Txt2Img etc.) still use a native `<select>` via `BasicSDApplet` — a known inconsistency.
- **Browser demo** (`npm run serve:ui`) now compiles cleanly and mounts the real `App.vue`:
  renderer no longer bundles Node `fs` (hardware-compat check now uses the existing
  `file_exists` IPC), `py_vue_bridge` guards its preload wiring, and `main_demoui.js` provides
  a full `ipcRenderer` shim (plus two seeded history entries so the recent gallery is
  reviewable). This makes whole-UI review cheap and repeatable.

## 5. Open questions (next round)

- Optional-downloads UI is still cramped inside the setup dialog; a dedicated page (like
  ModelStore) would scale better.
- Hardware-compatibility warnings remain console-only — worth surfacing in the model selector /
  download dialog for users on low-RAM machines.
- Should the non-Home pages adopt `ModelSelector` too?
- `hydrateFromHistory` trusts history image paths; a deleted file renders as a broken tile —
  consider IPC-based existence filtering for the thumbnail strip.

## 6. Deliverables from this session

- Fixes: `native_functions.js`, `AssetsManager.vue`, `StableDiffusion.vue`, `App.vue`,
  `SplashScreen.vue`, `generation_broadcast.js`, `theme.css`, `ApplicationFrame.vue`,
  `py_vue_bridge.js`, `main_demoui.js` (demo shim + seeded history).
- Validation: `npm run lint` clean; `npm run build:ui` clean; splash % and layout alignment
  verified in a live browser; gallery restart-persistence code-traced (runtime check pending).
- Recon reports: `recon/2026-08-02-app-ui-models-onboarding/` (`r1-explorer.md`,
  `r1-critic.md`, `r1-synthesizer.md`, `_metrics.md`).
