# Context Brief — App UI Polish & Batch Queue Recon (2026-08-04)

## Session

- **Topic**: Whole-app UI polish pass + batch queue feature review, with two user-reported defects to examine with screenshots: (1) the model dropdown menu "does not expand", (2) the "Open" button on tool cards "is not aligned properly".
- **Mode**: Explore (divergent) + Autonomous (user-selected).
- **Output dir**: `recon/2026-08-04-app-ui-polish-batch-queue/`
- **Final document**: `recon/2026-08-04-app-ui-polish-batch-queue.md` (Synthesizer writes it in the final round).

## Project

DiffusionBee fork (owner: aldoyh; upstream: divamgupta/diffusionbee-stable-diffusion-ui). Stable Diffusion GUI for macOS (DMG) + Windows (NSIS). Vue 2.7 Electron renderer spawning a Python (TensorFlow) backend over stdin/stdout JSON. App ID `net.aldoy.diffusion-sd-ui`, version 2.4.0. Arabic/RTL i18n (Tajawal font) is a fork differentiator.

## LIVE BROWSER EVIDENCE (collected this session via puppeteer against `npm run serve:ui` demo, main_demoui.js entry, port 8081)

The demo mounts the real `App.vue`. Two critical findings verified in the running app:

### DEFECT A — ModelSelector dropdown "does not expand" (CONFIRMED, root cause found)

`electron_app/src/components/ModelSelector.vue` renders its menu as:
```html
<ul v-if="isOpen" class="dropdown-menu model-selector-menu" role="listbox">
```
- Clicking the trigger works at the Vue level: `aria-expanded` flips `"false" → "true"`, the `<ul>` enters the DOM with 1 option (`optionCount: 1`).
- BUT computed style of the menu is `display: none` (rect `{x:0,y:0,w:0,h:0}`) — so it is invisible to the user.
- Root cause: the `dropdown-menu` class carries **Bootstrap 5's `.dropdown-menu { display: none; }`** base rule (Bootstrap is imported via `init_vue_libs.js`). The theme.css overrides (lines 962, 1531, 1977) restyle colors/shadow but **never set `display: block`**. Bootstrap only shows `.dropdown-menu` when the `.show` class is present (JS-driven), which this custom component never adds — it relies on `v-if`.
- Secondary hazard: `.model-selector` has NO clipping ancestor (`clipChain` only lists `.main_container` with `overflow: hidden auto` on y), so no overflow clip issue. The sole blocker is Bootstrap's `display: none`.
- Fix directions: (a) add `.model-selector-menu { display: block !important; }` (or plain block) in the scoped style; (b) drop the `dropdown-menu` class from the `<ul>` and keep the custom `model-selector-menu` styling; (c) or add `.show`. Option (b) is cleanest — the component already styles the menu fully (position/bg/border/shadow) in its scoped CSS.

### DEFECT B — "Open" button alignment on tool cards (CONFIRMED)

Homepage `tools-sections` renders `<span class="l_button button_colored"> Open </span>` inside `.select_app_desc` of each `.select_app` card.
- Measured: card is `display: block`, `text-align: left`; `.select_app_desc` is `position: absolute; bottom: 0; width: 100%; padding: 30px 25px 25px`.
- The Open button computes as `display: inline-block`, `margin: 10px 9px 0px 0px`, `text-align: center` — it sits flush LEFT under the description paragraph, 80px wide, NOT centered, with a leftover 9px right margin from a legacy rule (the inline style only sets `margin-top: 10px`, but the computed margin is `10px 9px 0 0` — some legacy `.l_button` or `.button_colored` rule contributes `9px 0` horizontal margins).
- The `.l_button` theme rule (theme.css:1411) defines `display: inline-flex` but the Homepage scoped `.button_colored` rule (Homepage.vue ~line 2997) overrides with `display: inline-block` — so the two classes fight. The button looks visually off-center/misaligned under the card text.
- Fix directions: center it (`.select_app_desc { text-align: center }` or `margin: 10px auto 0`) and align `.l_button`/`.button_colored` display semantics; remove the stray 9px margin.

### DEFECT C — Demo splash never dismisses (INFRA, affects reviewability)

`main_demoui.js` sets `window.bind_ipc_renderer_on = () => {}` (no-op), so the Python-bridge `on_msg_recieve` is never wired and the fake backend's ready message never arrives. The splash stays up forever unless you manually inject `sd.state_msg('inrd')` + `'mdld'` via console (done in this session's inspection script). The demo claims to make whole-UI review "cheap and repeatable" (per 2026-08-02 recon) but actually blocks the app behind the splash. A trivial demo improvement: after ~1.5s, dispatch `py2b sdbk inrd` to the registered handler.

### DEFECT D — ModelStore page crashes in demo (render error)

`ModelStore.vue` `not_downloaded_models_list` calls `this.models_list.filter(...)`. In the demo, `load_models_list_local_storage()` sets `models_list` to `null` (localStorage empty → `JSON.parse(null)` guard is fine but `models` stays undefined → `Vue.set(this, 'models_list', undefined)` → computed crashes with `Cannot read properties of null (reading 'filter')`). Also `window.ipcRenderer.sendSync('get_instance_id')` unguarded in `load_models_list_from_web` (demo shim provides it, so demo OK; but the CORS fetch to models.diffusionbee.com fails in browser). In the real Electron app localStorage `models_store` is likely populated, so this may be demo-only — but the null-guard gap is real (data() initializes `models_list: []`, so only the localStorage path can null it).

### Batch queue feature (new in this working tree) — design facts

- `electron_app/src/batch_queue_store.js` — localStorage persistence (`batch_queue_applet_v1`, `batch_queue_homepage_v1`), states `pending/queued/running/done/error`, restart normalization keeps only `pending`.
- Homepage (`pages/Homepage.vue`) + applet pages (`components/SDImageGenerationApplet.vue`) both implement: "📋 Add to batch", "▶ Run Batch (n)", "🗑 clear", and a status panel with per-item state + remove.
- `SDManager.add_job(gen_options, raw_form_options, gallery, group_id)` gained an optional caller-provided `group_id` so batch items can be tracked.
- Status tracking is POLL-based (`setInterval` 600ms) that inspects `manager.queue.current_group`, gallery `get_group()`, `batchItemDone()` / `batchItemHasError()` (gallery `imgs.every(im => im.image_url)`), with a fallback when the gallery prunes groups.
- Known concerns to stress-test: Homepage `tickBatchQueue` marks a pruned/not-found group as `done` purely by absence (false-positive "done" if gallery group never materialized); two parallel implementations (Homepage vs Applet) drift risk; `runBatch` submits all at once (SDManager runs FIFO so sequentiality holds, but no per-item failure isolation); persistence only keeps `pending` (queued/running lost on restart — by design, documented).

## Must-read files for every agent (in order)

1. `AGENTS.md` — verified architecture, commands, conventions, traps.
2. `recon/_context_brief.md` + `recon/2026-07-31-app-ui-onboarding/_context_brief.md` — prior session briefs (settled claims).
3. `recon/2026-07-31-app-ui-onboarding.md` and `recon/2026-08-02-app-ui-models-onboarding.md` — prior recon docs (defect fixes + open questions).
4. `electron_app/src/components/ModelSelector.vue` — the dropdown component (Defect A).
5. `electron_app/src/pages/Homepage.vue` — welcome hub, quick settings, Open buttons (Defect B), batch queue.
6. `electron_app/src/components/SDImageGenerationApplet.vue` — applet batch queue.
7. `electron_app/src/batch_queue_store.js` — batch persistence + completion helpers.
8. `electron_app/src/assets/css/theme.css` — `.dropdown-menu` overrides (962/1531/1977), `.l_button` (1411), tokens.
9. `electron_app/src/main_demoui.js`, `electron_app/src/AppDemoUI.vue`, `electron_app/src/py_vue_bridge.js`, `electron_app/src/preload.js` — demo shim + bridge wiring (Defect C).
10. `electron_app/src/pages/ModelStore.vue` — Defect D.
11. `electron_app/src/SDManager.vue` — queue/dispatch semantics (batch feature relies on FIFO + `is_input_avail` gate).

## Settled claims (DO NOT RESTATE — build on, challenge, or move past)

1. The ModelSelector dropdown is functionally wired (click flips state, menu mounts with options) but is invisible because Bootstrap's `.dropdown-menu { display: none }` wins over the component's `v-if`-based visibility. Fix = remove/replace the `dropdown-menu` class or force `display: block`.
2. The "Open" button on Homepage tool cards is a left-flush, `inline-block` span with a stray 9px horizontal margin and a `.l_button` (inline-flex) vs `.button_colored` (inline-block) display conflict; it is not centered under the card text.
3. The browser demo is splash-locked because the `bind_ipc_renderer_on` shim is a no-op; app UI is unreachable without a console injection.
4. ModelStore's `models_list` can become non-array (null/undefined) via the localStorage load path, crashing its `filter` computed.
5. The batch queue feature (Homepage + Applet) is a parallel-duplicated implementation over localStorage with 600ms poll tracking keyed on gallery group presence; SDManager runs groups FIFO with a single worker, so batch sequentiality holds structurally.
6. `v-click-outside` IS registered (`init_vue_libs.js:76-77`) — NOT a missing-directive problem.

## Primary web sources (Explorer: fetch directly, no secondary coverage)

- https://github.com/divamgupta/diffusionbee-stable-diffusion-ui (upstream repo: README, releases, issues — check if upstream fixed the model `<select>` / has a batch feature)
- https://getbootstrap.com/docs/5.3/components/dropdowns/ (Bootstrap `.dropdown-menu` display:none + `.show` mechanics — the exact rule fighting ModelSelector)
- https://v2.vuejs.org/ (Vue 2 lifecycle/reactivity if needed for batch polling critique)

## Round plan

- **R1** (this round): 4 agents, wide net. Read this brief + must-reads. Respect settled claims.
- **R2**: deepening — Explorer fills gaps + operational reality check; Associator connects; Critic stress-tests strongest ideas; Synthesizer refines.
- **Final**: Synthesizer writes `recon/2026-08-04-app-ui-polish-batch-queue.md` (Explore format: The Territory, competing framings, Tensions, Open Questions, Process Log).

## Rules for agents

- Read-only on app code. Write ONLY your assigned report file in `recon/2026-08-04-app-ui-polish-batch-queue/`.
- Targeted reads (grep + line ranges); don't dump entire >500-line files unless essential.
- Cite repo file paths (with line numbers where possible); footnote web URLs.
- Match the repo's vocabulary (applet, tdict, b2py, sdbk, page, onboarding, catalog).
