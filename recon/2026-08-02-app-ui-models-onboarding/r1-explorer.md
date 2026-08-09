# R1 — Explorer Report

Session: 2026-08-02 — DiffusionBee whole-app, UI, model-selection & onboarding recon (round 2)
Output: `recon/2026-08-02-app-ui-models-onboarding/`

## Mandate

Re-review the entire UI, the model selection experience, and the onboarding flow (round 2 after
`recon/2026-07-31-app-ui-onboarding.md`), and surface the concrete defects the user reported:
splash progress showing **NaN%**, generated images not reaching the gallery **recent** section,
and UI **buttons/labels rendered offset**.

## Findings (vault + live code walk)

### 1. Splash progress NaN — root cause found (fixed)

- **Root cause** (`electron_app/src/native_functions.js`, `download-file` IPC):
  `const totalBytes = parseInt(response.headers['content-length'], 10)` is `NaN` whenever a
  model server omits `Content-Length` (HF LFS, chunked/streaming responses). The progress
  message sent to the renderer was `Math.round((downloadedBytes / NaN) * 100)` = **NaN**.
- The NaN flowed: Electron main → `AssetsManager.on_progress` → `downloading[id].progress` →
  `App.vue` splash tracker (`30 + Math.round(dl.progress * 0.55)`), the model-setup dialog
  (`Math.round(model_download_progress)`), and the optional-download rows
  (`Math.round(optional_download_progress[id])`).
- `SplashScreen.vue` had partial guards (`!Number.isNaN`) but several computed used
  `this.progress >= 0`, which is false for NaN — yet any unguarded `Math.round(NaN)` in a
  template renders literally as **"NaN%"**.
- **Fixes applied:** main now sends `-1` (indeterminate) when total is unknown; every consumer
  (`App.vue` `updateSplashProgress` + model/optional progress polling, `AssetsManager`,
  `StableDiffusion.mlpr`, `SplashScreen` computeds) now uses `Number.isFinite` and clamps.
- **Verified in browser:** splash shows `8%`, and `updateSplashProgress('Test', NaN)` followed
  by `updateSplashProgress('Test', 42)` displays `42%` — NaN never renders.

### 2. Gallery "recent" section only hydrated one group after restart (fixed)

- `generation_broadcast.js` `hydrateFromHistory()` picked **only the single latest** history
  entry into `live_gallery_groups`, so after an app restart the Homepage "Your generations"
  strip (`recentThumbnails`) and gallery showed at most one group.
- **Fix:** hydrate up to `LIVE_GALLERY_LIMIT` (10) most-recent groups from history (insertion
  order, newest last), replace `live_gallery_groups` once, set `last_gallery_group` to the
  newest, and sync already-registered galleries. Later-mounting galleries are covered by
  `registerGallery()` which replays the live list.
- Chain traced: `hydrateFromHistory` → `live_gallery_groups` → Homepage `GenerationGallery`
  registers → `syncGalleryGroup` → `homeGallery.groups` → `recentThumbnails` /
  `totalGeneratedCount` / gallery tiles. (Runtime re-verification in browser blocked by
  browser-agent outage; logic trace + lint + build clean.)
- Browser demo (`main_demoui.js`) now seeds two fake history entries so the recent section can
  be reviewed in-browser; the demo also gained a full `ipcRenderer` shim so `npm run serve:ui`
  actually mounts the app (it previously crashed on missing `bind_ipc_renderer_on`).

### 3. UI buttons/labels "offset" — three concrete causes fixed

- **`.btn` baseline misalignment:** `theme.css` overrode Bootstrap `.btn` to
  `display: inline-flex` without `vertical-align`, so inline-flex buttons sat a few px off
  baseline from adjacent labels across the UI. Added `vertical-align: middle`.
- **Sidebar item icons:** the nav icon `<svg>` carried inline `margin-top:-3px; margin-right:3px`
  and `.sidebar_icon { margin-right: 5px }` on top of the theme's new flex `gap: 12px` —
  icons sat 3px high and ~20px from their labels. Removed the inline margins and the CSS
  margin; flex gap now handles spacing and `align-items: center` centers icons.
- **Title bar:** `.title_bar_icons` used `margin-top: 16px` with `height: var(--titlebar-height)`
  (icons sat low) and `.app_title` used `padding-top: 20px` (text sat low). Both now use
  `display: flex; align-items: center` and fill the 55px bar.
- **Verified in browser:** title-bar text and right icons vertically centered; no misaligned
  buttons observed; sidebar footer ("Made with Love in Bahrain") pinned at the sidebar bottom.

### 4. Whole-app / model-selection / onboarding review (delta vs 2026-07-31)

- **Onboarding (model setup dialog)** remains solid: catalog → `pickOptimalOnboardingModel`
  (FLUX.2-aware) → one-click download → optional additional downloads. The download progress
  paths were the only correctness bug (now fixed).
- **Model selection:** Homepage uses the new `ModelSelector` (WAI-ARIA listbox) — good;
  Txt2Img/pages still use the plain Bootstrap select via `BasicSDApplet`. Minor inconsistency.
- **Browser demo** (`serve:ui`) now compiles cleanly (renderer no longer bundles Node `fs` —
  `verifyModelsHardwareCompatibility` uses the existing `file_exists` IPC) and mounts the real
  `App.vue`, enabling low-friction UI review.
- **Remaining open items** (not fixed this session): optional-downloads UI is cramped inside
  the setup dialog; no per-model visual comparison or hardware-compatibility warnings surfaced
  to the user (console-only); model selector on non-Home pages is a native `<select>`;
  `hydrateFromHistory` trusts history image paths (a deleted file renders as a broken tile).
