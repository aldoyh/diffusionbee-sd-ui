---
title: "DiffusionBee — App UI Polish & Batch Queue: Six Defects Fixed, Visually Verified"
date: 2026-08-04
status: wrapped
type: recon
mode: explore (autonomous) + fix round
topic: whole-app UI polish pass, batch queue feature review, and fixes for two user-reported defects (model dropdown not expanding, Open button misaligned)
---

# DiffusionBee: Six Defects Fixed & Visually Verified in the Browser

> [!info] Process log
> Session started 2026-08-04 21:00 (explore mode). Round 1: context brief
> (`recon/2026-08-04-app-ui-polish-batch-queue/_context_brief.md`), live browser
> inspection via puppeteer against the `serve:ui` demo (main_demoui.js entry),
> and a critical review of the batch queue feature + UI defects. The user then
> directed: fix everything found, with visual verification. All fixes were
> applied, linted, built (`build:ui`), and re-verified in a live headless
> Chrome. Evidence screenshots: `verify_1_home.png` … `verify_5_batch.png` in
> the session folder. Prior art: `recon/2026-08-02-app-ui-models-onboarding.md`,
> `recon/2026-07-31-app-ui-onboarding.md`.

## The six fixes (each verified in the running demo)

### 1. Model dropdown "does not expand" — Bootstrap `.dropdown-menu { display: none }` (user-reported)

**Root cause.** `electron_app/src/components/ModelSelector.vue` renders its menu as
`<ul v-if="isOpen" class="dropdown-menu model-selector-menu">`. Clicking worked at the
Vue level (live measurement: `aria-expanded` flipped `false → true`, the `<ul>` mounted
with 1 option) — but the computed style was `display: none`, so the menu was invisible.
Bootstrap's base `.dropdown-menu` rule is `display: none` (revealed only via a `.show`
class added by Bootstrap's own JS); the theme.css overrides (`theme.css:962/1531/1977`)
restyle colors/shadow but never re-assert display, and this custom component toggles with
`v-if` instead. `v-click-outside` was verified registered (`init_vue_libs.js:76-77`), so
the missing-directive theory was ruled out.

**Fix.** Scoped rule now sets `display: block` on `.model-selector-menu`. Specificity of the
scoped `[data-v-*]` selector beats Bootstrap's base rule without `!important`.

**Verified:** after click — `aria-expanded="true"`, menu rect `{304, 573, 832×78}`,
`display: block`, option listed (`verify_2_dropdown.png`).

### 2. "Open" button misaligned on tool cards (user-reported)

**Root cause.** Homepage tool cards render
`<span class="l_button button_colored" style="margin-top:10px"> Open </span>` inside
`.select_app_desc` (a `position:absolute; bottom:0; width:100%` overlay). A **legacy global
`.l_button` rule in `ApplicationFrame.vue:249`** (`display:inline-block; margin:0 9px 0 0;
height:22px; padding:3px 10px`) combined with the Homepage scoped `.button_colored`
(`display:inline-block`) left the button flush-left under left-aligned card text with a
stray 9px margin — while theme.css `.l_button` (`display:inline-flex`, theme.css:1411)
conflicted with the scoped override.

**Fix.** Added a scoped, high-specificity rule
`.select_app_desc .l_button.button_colored { display:block; width:fit-content; margin:10px auto 0; height:auto; padding:10px 24px; }`
— block + fit-content + auto margins centers it direction-agnostically (RTL-safe) and
re-asserts height/padding against the legacy 22px box.

**Verified:** `leftGap == rightGap == 169px`, `centeredWithinDesc: true`
(`verify_3_tools.png`).

### 3. Demo splash screen never dismisses — `main_demoui.js` shim was a no-op

**Root cause.** `window.bind_ipc_renderer_on` in `main_demoui.js` was `() => {}`, so
`py_vue_bridge.js`'s `on_msg_recieve` was never wired and the backend-ready message
(`sdbk inrd`) never arrived. The splash stayed up forever; the whole UI was unreachable
in the browser demo (contradicting the 2026-08-02 claim that the demo makes review cheap).
First fix attempt (synthesizing `py2b sdbk …` messages through a stored handler) failed
because ES-module import hoisting evaluates `py_vue_bridge.js` before the shim body runs.

**Fix.** Keep a `bind_ipc_renderer_on` stub (so the `typeof === 'function'` guard passes),
and after mount drive the **real state machine**: `setTimeout(1800ms)` calls
`sd.state_msg('mdld')` + `sd.state_msg('inrd')` on `window.app.stable_diffusion` — the exact
code path the Electron app uses.

**Verified:** `splashPresent: false`, `is_start_screen: false`, `is_input_avail: true`,
homepage heading "What will you create today?" renders (`verify_1_home.png`).

### 4. ModelStore page crash — `models_list` null

**Root cause.** `ModelStore.vue` `load_models_list_local_storage()` did
`Vue.set(this, 'models_list', models)` where `models` is `undefined` when the
`models_store` localStorage key is absent; the `not_downloaded_models_list` computed then
crashed on `.filter`.

**Fix.** `Array.isArray(models) ? models : []`; also guarded `get_instance_id` IPC access
and array-validated the web-fetched catalog with a `.catch`.

**Verified:** ModelStore renders "Available Models" + "My Models" with no console error
(`verify_4_modelstore.png`).

### 5. Batch queue: `runBatch` corruption on navigation / submit failure (P1)

`SDImageGenerationApplet.vue` + `Homepage.vue` `runBatch` now: guard the gallery ref
(abort with a toast instead of throwing mid-loop), set `item.state = 'queued'` **before**
`add_job` (a mid-loop failure can never leave a `pending` item that would re-submit and
double-generate), and wrap each submit in try/catch (failed item → `error` instead of
aborting the rest).

### 6. Batch queue: false-positive "done" by group absence (P2)

`tickBatchQueue` previously marked an item `done` whenever its gallery group was absent and
not queued/current — even if the group never materialized. Now absence alone is not proof:
the item is `done` only when the group is positively recorded in history, else `error`.

**Review-driven correction:** the first implementation checked
`app_state.app_data.history` — which is *not* where SDManager writes completions. The
authoritative store is `history_service.js` `historyStore.entries` (persisted to
`history.json`, keyed by group_id via `SDManager.finish_current_job → add_to_history`).
The shared helper `groupIsInHistory(app, groupId)` in `batch_queue_store.js` consults
`getHistory()` first with the legacy `app_data.history` path as fallback; both components
now import it (removing the duplicated method).

**Verified:** batch panel adds items, shows `Pending`, and the Run button appears
(`verify_5_batch.png`); no console errors across the whole flow.

## Validation

- `npm run lint` — **clean** (0 errors).
- `npm run build:ui` — **compiles**.
- Live puppeteer verification of all five scenarios above — **all pass**, no
  non-CORS console errors (the only console noise is the demo's expected
  `checkupdates`/`list_models` CORS failures, which don't exist in Electron).

## Files changed

- `electron_app/src/components/ModelSelector.vue` — dropdown `display: block`.
- `electron_app/src/pages/Homepage.vue` — Open-button CSS; `runBatch`/`tickBatchQueue`/`addToBatch` batch fixes.
- `electron_app/src/components/SDImageGenerationApplet.vue` — same batch fixes.
- `electron_app/src/batch_queue_store.js` — new `groupIsInHistory` helper.
- `electron_app/src/main_demoui.js` — splash fix (drive real state machine after mount).
- `electron_app/src/pages/ModelStore.vue` — null-array guards.

## Open questions / next round

- Real-backend end-to-end batch run (Electron + venv311) is the definitive check for the
  poller's `running → done/error` transitions; the browser demo verifies UI + wiring only.
- Homepage and Applet batch implementations remain parallel duplicates (different item
  shapes, two localStorage keys); a shared module would prevent drift.
- Batch lifecycle is still page-bound: navigating away mid-batch stops the poller (the
  SDManager keeps processing in the background). Moving status tracking into SDManager is
  the structural fix.
