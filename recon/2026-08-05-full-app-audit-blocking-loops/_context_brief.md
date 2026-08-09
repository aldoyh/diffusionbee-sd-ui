# Context Brief — Full-App Audit: "Something is running the entire time" (2026-08-05)

## Session

- **Topic**: Full-app audit from the first screen to the last, hunting the "something running the entire time as a function" that blocks clicking and typing in the image generation app.
- **Mode**: Explore (divergent) + Autonomous fix round (user-selected).
- **Output dir**: `recon/2026-08-05-full-app-audit-blocking-loops/`
- **Final document**: `recon/2026-08-05-full-app-audit-blocking-loops.md`

## The user's complaint (verbatim intent)

> "we are unable to simply click and type — there is something running the entire time as a function, this needs to be ripped off — we want a working and proper image generation app."

## Live evidence collected this session

- `localhost:8081`, `8080`, `8090` (three `serve:ui` demo instances, all running `main_demoui.js`) — all three load to the main UI and **typing works** in the demo. So the *browser demo* is fine.
- The user's blocker therefore lives in the **real Electron path** (backend handshake) and/or in **forever-running intervals / blocking overlays** that the demo masks.

## The forever-running functions (root-cause candidates, all confirmed in code)

### A. `App.vue` splash machinery — can block the ENTIRE app forever (P0)
1. `start_screen_interval` (App.vue:231) — `setInterval` every **1500ms**, cleared only when `stable_diffusion.is_input_avail` becomes true. If the backend never sends `sdbk inrd` (backend dead, spawn failed, model load hangs, user offline), this interval **runs forever**, and — critically — `app_state.is_start_screen` stays `true`, so `ApplicationFrame` (the whole main UI) never mounts. The splash is `position: fixed; inset: 0` (`SplashScreen.vue:162`) and sits at `z-index` top with `-webkit-app-region: drag` — the whole window becomes a drag region that swallows **all clicks and keystrokes**. This is exactly "unable to click and type".
2. `splashBackendCheckInterval` (App.vue:253) — `setInterval` every **500ms**, scanning `assets_manager.downloading`. **It is NEVER cleared when the start screen ends** — only in `beforeDestroy`. It runs every 500ms for the entire app lifetime even after the splash is gone. Pure waste + a perpetual function.

### B. `bridge.js` — backend spawn failure is silent (P0)
- `start_bridge()` spawns python but registers **no `error` handler** on the child process. If spawn fails (binary missing, venv broken) the renderer never gets `mdld`/`inrd`, so the splash hangs forever with no dialog, no error, no path forward. (`python.on('close')` only fires on a clean exit — a failed spawn may only emit `error`.)

### C. Generation blocking modal can stick (P1)
- `App.vue:36` — `<LoaderModal v-if="is_generating && !app_state.global_loader_modal_msg && !app_state.is_start_screen">` at `z-index: 9990`, full-screen overlay with a spinner. `is_generating` (App.vue:361) is true while `!sd.is_input_avail && (attached_cbs || generation_progress >= 0 || queueCount > 0)`. If a job is submitted and the backend errors without a following `inrd` (crash/hang), the modal spins forever — the only escape is the Cancel button (which sends `t2im __stop__`).

### D. `Homepage.vue` — broken button + unbounded timers (P1)
1. **`toggleJsonMode` is referenced in the template (Homepage.vue:141) but never defined in methods.** Every click throws `[Vue warn]: Invalid handler for event "click": got undefined` + `TypeError: Cannot read properties of undefined (reading '_wrapper')` (confirmed in the live console on all three demo ports). The button is dead — clicking it errors.
2. `pendingGenerationTimer` (Homepage.vue:846) — `setInterval` every **700ms** that re-tries a queued prompt until the model downloads + backend ready. If the model download never completes (server down, model rejected), **this polls forever** while Homepage is mounted.
3. `inspirationInterval` (Homepage.vue:1264) — `setInterval` every 5s rotating the inspiration line **for the lifetime of the Homepage** (Homepage is eagerly mounted and stays alive in the router). Harmless visually, but another always-running function.

### E. `StableDiffusion.vue` ETA countdown (P2)
- `generation_loop` (StableDiffusion.vue:165) — `setInterval` every 1s while a generation is attached, decrementing ETA. Cleared on reset/interrupt, but is recreated on every `dnpr` message. Bounded-ish but worth hardening.

### F. Batch poller (P2)
- `batch_queue_mixin.js:113` — `setInterval` 600ms while batch items are active; stops when no active items. OK by design, but `SDManager.vue` has a stuck-queue hazard: `finish_current_job` (SDManager.vue:135) returns early when the gallery ref is missing **without dispatching the next queued group** — the batch poller then sees an item never completing and can spin forever ("Running..." forever).

### G. `AssetsManager.vue` — data() uses `window.ipcRenderer.sendSync` unguarded (P2)
- `AssetsManager.vue:83-84` — `load_data` at component construction with no demo guard; works because the demo shim provides `sendSync`, but if ipcRenderer is absent the app crashes at mount.

## The screens (full-app tour)

1. **Splash** (`SplashScreen.vue`) — full-window drag region; dismisses only when `inrd` arrives → `is_start_screen = false`. **This is the first-screen blocker.**
2. **ApplicationFrame** (`ApplicationFrame.vue`) — sidebar + title bar + `tab_content` slot; renders `PagesRouter` only when `stable_diffusion.is_ready()`.
3. **Homepage** (`pages/Homepage.vue`) — welcome carousel, quick composer (`chat-input` textarea), quick settings, batch queue, gallery.
4. **Txt2Img / Img2Img / Inpainting** (`pages/*.vue` via `SDImageGenerationApplet.vue` + `BasicSDApplet.vue`) — generation forms + `GenerationGallery`.
5. **History** (`pages/History.vue`) — persistence via `history_service.js`.
6. **ModelStore / Settings / Logs / PromptLibrary / Training / ContactUs** — secondary pages, lazy-loaded.

## Settled claims (DO NOT RESTATE — build on, challenge, move past)

1. The browser demo (all 3 ports) loads to main UI and typing works; the blocker is not in the demo path.
2. The splash is a full-window drag region that swallows input; it only dismisses on `sdbk inrd`.
3. `start_screen_interval` and `splashBackendCheckInterval` are never guaranteed to stop; the latter never stops at all after start-screen end.
4. `bridge.js` registers no `error` handler on the python child — a failed spawn = silent forever-splash.
5. `toggleJsonMode` is called from the Homepage template but does not exist in methods → every click throws a Vue render/handler error.
6. `LoaderModal` at z-9990 + model-setup overlay at z-9999 (`App.vue:1038`) are full-screen input blockers when their flags are stuck.
7. `SDManager.finish_current_job` early-returns without dispatching the next group when the gallery ref is missing → stuck batch.

## Round plan

- **R1**: context brief + live browser evidence + targeted code reads (DONE this session).
- **R2**: fix round — rip out/guard the forever-running functions (splash watchdog, clear splash intervals, backend spawn error handler, define `toggleJsonMode`, bound timers, overlay escapes, SDManager dispatch fix).
- **Final**: validate with `lint`, `build:ui`, live browser re-verification.
