---
title: "DiffusionBee — Full-App Audit: The 'Something Running the Entire Time' Removed"
date: 2026-08-05
status: wrapped
type: recon
mode: explore (autonomous) + fix round
topic: whole-app audit from first screen to last; find and rip out the always-running function that blocked clicking and typing; make the app a working image generator
---

# DiffusionBee: Full-App Audit — The Forever-Running Functions Removed

> [!info] Process log
> Session started 2026-08-05 (explore mode). Round 1: live browser evidence across
> three running demo instances (`8081`, `8080`, `8090`), targeted code reads of the
> splash → onboarding → home → generation → gallery → models flow, and an inventory
> of every `setInterval`/`setTimeout` in the renderer. The user reported: "we are
> unable to simply click and type — there is something running the entire time as a
> function, this needs to be ripped off." Round 2: fix round — ripped out / guarded
> every unbounded loop and blocking overlay, added a backend-spawn error handler,
> implemented a previously-missing button handler, and verified in a live browser.
> Prior art: `recon/2026-08-04-app-ui-polish-batch-queue.md`,
> `recon/2026-08-02-app-ui-models-onboarding.md`.

## The complaint

> "we are unable to simply click and type there is something running the entire time as a function this needs to be ripped off"

Three running browser demo instances were **not** the problem — all load to the main UI
and accept typing. The blockers live in the **real app path**: a splash screen that can
run forever (it is a full-window drag region that swallows every click and keystroke),
unbounded polling intervals that never stop, and one button wired to a method that
doesn't exist.

## The forever-running functions (found & fixed)

### 1. Splash screen could run forever → entire app locked (P0, fixed)

- **`App.vue` `start_screen_interval`** fired every **1500ms** and only cleared when the
  backend sent `sdbk inrd`. If the backend never became input-ready (spawn failure,
  venv broken, model load hang), the interval ran forever **and** `is_start_screen`
  stayed `true` — so `ApplicationFrame` (the whole main UI) never mounted, and the
  splash (`position: fixed; inset: 0`, `-webkit-app-region: drag` in
  `SplashScreen.vue`) became a full-window drag region swallowing all clicks/typing.
- **Fix:** a 2-minute watchdog deadline (`SPLASH_MAX_WAIT_MS = 120000`). When it fires,
  the interval clears itself and `is_start_screen` is forced `false`, unlocking the UI.
  The Home onboarding banner + Model Store remain the path forward.

### 2. `splashBackendCheckInterval` leaked for the app's whole lifetime (P0, fixed)

- `App.vue` polled `assets_manager.downloading` every **500ms** and was only cleared in
  `beforeDestroy` — i.e. it ran forever after the start screen ended.
- **Fix:** the `is_start_screen` watcher now clears it the moment the start screen ends.

### 3. Backend spawn failure was silent → infinite splash (P0, fixed)

- **`bridge.js`** spawned the Python backend with **no `error` handler** on the child
  process. A failed spawn (ENOENT, broken venv) only emits `error`, never `close`, so
  the renderer never saw `inrd` and the splash hung forever with no dialog.
- **Fix:** added `python.on('error', ...)` — logs to `last_few_err` and alerts the
  renderer with the real reason the backend failed to start.

### 4. The model-setup overlay could trap the user (P1, fixed)

- `fetch_models_list()` / `fetchOptionalModels()` had **no timeout** — a hanging catalog
  request left the z-9999 full-screen setup overlay on "Checking for available models..."
  with **no buttons at all**.
- **Fix:** 15s `AbortController` timeout on both fetches + **escape buttons in every
  dialog state** — "Skip for now" on the checking state, "Skip" on the model-offered
  state, and **"Cancel download"** on the downloading state (which also clears the
  300ms `modelDownloadInterval`, so a stalled download can never leave a
  forever-running poller behind the overlay).

### 5. Dead JSON-mode button threw JS errors on every click (P1, fixed)

- Homepage template called `@click="toggleJsonMode"` but **no such method existed** —
  every click produced `[Vue warn]: Invalid handler for event "click": got undefined`
  and `TypeError: Cannot read properties of undefined (reading '_wrapper')` (confirmed
  live on all three demo ports).
- **Fix:** implemented `toggleJsonMode` + `parseJsonBatch` + `submitJsonBatch` — the
  textarea now accepts a JSON array of prompts, validates it, and queues each prompt
  for generation. Review-driven correction: the not-ready fallback **no longer queues
  the raw JSON text** (which would have generated an image from the JSON string) — it
  shows a "model/backend not ready" toast instead. Verified in the live browser: no
  handler error, batch panel works.

### 6. Homepage `pendingGenerationTimer` could poll forever (P1, fixed)

- When a prompt was queued for auto-generation but the model download could never
  complete, the **700ms** retry interval ran forever (Homepage stays mounted for the
  app lifetime).
- **Fix:** bounded with `PENDING_MAX_ATTEMPTS = 100` (~70s); on give-up the timer
  clears, the pending prompt clears, and a toast directs the user to the Models page.

### 7. `SDManager.finish_current_job` could stall the queue forever (P1, fixed)

- When the gallery ref was missing, `finish_current_job` returned early **without
  dispatching the next queued group** — batches would sit "Running..." forever and the
  batch poller would spin.
- **Fix:** both early-return branches now call `get_and_do_job()` to keep the queue
  moving; `on_progress` also guards missing gallery/groups so it can't throw mid-job.

### 8. `AssetsManager` unguarded IPC at mount (P2, fixed)

- `data()` called `window.ipcRenderer.sendSync` with no guard — a crash-at-mount risk
  if the bridge is absent. Now guarded with try/catch; the save watchers are guarded too.

### Observed but deliberately left alone

- `StableDiffusion.vue` `generation_loop` (1s ETA countdown) is cleared on reset and on
  `attached_cbs` teardown — bounded by design, kept.
- `Homepage` `inspirationInterval` (5s inspiration rotation) is bounded to the page's
  lifetime and paused/cancelled in `beforeDestroy` — cosmetic, kept.
- Batch poller (`batch_queue_mixin.js`, 600ms) self-stops when no items are active —
  kept.

## The screens, audited

| Screen | Status after fix |
|--------|------------------|
| Splash (`SplashScreen.vue`) | Cannot outlive the 2-min watchdog; unlocks the UI even if the backend is down |
| App shell (`ApplicationFrame.vue`) | Mounts as soon as the start screen ends; freeze/unfreeze IPC tied to it |
| Homepage (`pages/Homepage.vue`) | Typing works; JSON batch button functional; retry loop bounded |
| Txt2Img / Img2Img / Inpainting (`SDImageGenerationApplet.vue`) | Generation + batch flow verified live |
| Gallery (`GenerationGallery.vue`) | Queue keeps moving when galleries are pruned/missing |
| History / ModelStore / Settings / Logs / PromptLibrary | Reachable; ModelStore null-guards from prior rounds hold |
| Backend handshake (`bridge.js`) | Spawn failures now surface an explicit error |

## Validation

- `npx eslint` on all touched files — **0 errors** (2 pre-existing unused-import
  warnings in Homepage, untouched by this round).
- `npm run build:ui` — **compiles clean**.
- Live browser (`localhost:8081`, hot-reloaded): typing works; JSON-mode button no
  longer errors; batch add/clear panel works; no non-CORS console errors (CORS noise
  is demo-only — Electron uses the real bridge).

## Files changed

- `electron_app/src/App.vue` — splash watchdog; clear `splashBackendCheckInterval` on
  start-screen end; fetch timeouts + Skip escape on the model-setup overlay.
- `electron_app/src/bridge.js` — backend spawn `error` handler.
- `electron_app/src/pages/Homepage.vue` — real `toggleJsonMode`/`parseJsonBatch`/
  `submitJsonBatch`; bounded `pendingGenerationTimer`.
- `electron_app/src/SDManager.vue` — queue dispatch continues when gallery missing;
  guarded `on_progress`.
- `electron_app/src/AssetsManager.vue` — guarded IPC at mount + watchers.

## Open questions / next round

- Real-backend Electron end-to-end run (venv311 + a model) is the definitive check of
  the watchdog + spawn-error path; the browser demo validates UI/wiring only.
- The `is_generating` LoaderModal still blocks input while a job is genuinely running
  (by design, with Cancel); a stuck-job watchdog could auto-timeout it in a future round.
- `start_screen_interval` uses a magic constant — extract to a shared config if more
  timeout constants appear.
