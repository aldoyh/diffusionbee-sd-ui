---
title: "UI/Alignment/Prompt Box Round 2 — Root Cause Found and Fixed"
date: 2026-09-13
mode: autonomous
intention: focus
scope: full app UI, text alignment, prompt box; build; runtime verification
verdict: >
  Two real bugs found and fixed. (1) A warm-start protocol gap left the app
  permanently blank after reload/reopen/hot-reload — the deepest "the whole UI
  is broken" mechanism in this codebase. (2) The prompt box's only visible
  submit affordance was clipped below the fold and plain Enter did nothing —
  the literal "prompt box is not working." Both verified fixed in the dev app
  and the reinstalled /Applications/diffusion-sd-ui.app with DOM, geometry,
  and screenshot evidence.
targets:
  - electron_app/src/StableDiffusion.vue
  - electron_app/src/pages/Homepage.vue
tooling_added:
  - electron_app/scripts/ui_probe4.js
  - electron_app/scripts/ui_probe5_warmstart_repro.js
  - scripts/screenshot_pixel_audit.py
evidence_dir: recon/2026-09-13-ui-blank-root-cause/
prior_recon: "[[2026-09-13-ui-alignment-prompt-box-fix]]"
---

# UI / Alignment / Prompt Box — Round 2: Root Cause and Fix

> [!info] Context
> The previous session ([[2026-09-13-ui-alignment-prompt-box-fix]]) concluded the app worked and blamed a stale installed bundle. The user replied: **"Again and harder."** That was correct — the prior verification had two blind spots: it never took a screenshot of the default first-launch state, and its DOM-only probes could not see rendering or layout clipping. This session re-attacked with pixel-level screenshot audits and a CDP probe that measures geometry, hit-testing, and computed styles.

## The Argument

The user's three complaints decompose into two real defects and one instrumentation artifact:

1. **"The entire App UI is not working"** = the warm-start blank-app bug. `sdbk mdld` is printed exactly once by the Python backend (`backends/stable_diffusion/diffusionbee_backend.py:154`) before its main loop, while `sdbk inrd` is re-emitted on every loop cycle. Any renderer that (re)attaches after a warm start — `Page.reload`, dev hot-reload, macOS dock-icon window re-creation (`background.js:145` `activate` handler) — receives `inrd` but never `mdld`. `StableDiffusion.is_ready()` (used by the `PagesRouter` `v-if`) requires `is_backend_loaded`, which only `mdld` sets. Result: splash dismisses on `inrd`, router never mounts, `#app` plateaus at ~6.7KB of DOM, **zero console errors**. Deterministically reproduced via probe v5 (38+ seconds of blank app after a clean-locale reload).

2. **"The prompt box is not working"** = the submit affordance was unreachable. At the default window (unfreeze min-clamp 1070×700), the entire `.chat-actions` row including the Submit button sat at y=626..664 *before* the fix, which is fine — but at the pre-compaction layout in the 800×600 constructor window and on the mode-pill stack, the composer stack needed ~760px, and critically **plain Enter did not submit** (only Cmd/Ctrl+Enter were bound). A user types, hits Enter, nothing happens, and the Submit button is the only visible affordance. Probe v4 measured: `post-Enter: {"cleared":false,"loader":false}` pre-fix → `{"cleared":true,"loader":true}` post-fix.

3. **"Text alignment"** = instrumentation artifact plus one real finding. Default-RTL at launch (yesterday's probe3) was caused by yesterday's own probe clicking the language toggle, which persists `diffusionbee_locale` to localStorage via the `app_state.isArabic` watcher (`App.vue:377`). A clean-state launch is correctly `ltr` (probe4 C1: `dir=ltr`). RTL alignment itself is fully functional: `dir=rtl`, right-aligned, Arabic placeholder, html lang sync.

## The Fix (23 insertions, 2 files)

**`electron_app/src/StableDiffusion.vue`** — in the `inrd` handler, treat `inrd` as implying backend-loaded (it is only ever printed after the one-time model-load path, so this is protocol-safe for both dev and frozen backends):

```js
if (msg_code == "inrd") {
    // `sdbk mdld` is printed once, before the backend's main loop, while
    // `sdbk inrd` is (re-)emitted on every loop cycle. A renderer that
    // (re)attaches after a warm start ... never sees the single `mdld`,
    // leaving is_backend_loaded false and the PagesRouter v-if gate
    // (is_ready()) closed forever: a fully blank app with zero errors.
    this.is_backend_loaded = true;
    ...
}
```

**`electron_app/src/pages/Homepage.vue`** — three changes:
- Enter submits (`@keydown.enter.exact="submitPrompt"`), Shift+Enter inserts a newline. Kept as plain template bindings so compositionstart/end IME sequences are not interrupted mid-composition (Arabic-safe by construction).
- Vertical compaction: welcome-section padding 20→12px, mode-pill min-height 68→48px + gap/margin tightening, inspiration-text margins 12/18→6/8px. Total stack shrank ~82px, putting the actions row at y=622..664 in a 700px viewport.
- No window-size change: `unfreeze_win` (`native_functions.js:208`) min-clamps to 1070×700 and restores saved state; constructor size is decorative. A 1200×800 constructor bump was tried and reverted as redundant.

## Verification (dev app AND installed app)

| Check | Before | After |
|---|---|---|
| Clean-locale reload → homepage | blank ≥38s, DOM plateau 6.7KB | mounted t+2s, DOM 952KB |
| Default launch direction | (contaminated by prior probes) | `ltr` |
| Composer above fold @1070×700 | submit y=626 pre-compaction, clipped in 600px windows | `.chat-submit` y=626..664, all HIT |
| Plain Enter submit | `cleared:false, loader:false` | `cleared:true, loader:true` |
| Generation end-to-end | — | loader +0.0s → gone +63.3s → image #58 in gallery |
| RTL (real click on lang-toggle) | — | dir=rtl, all composer hits HIT, placeholder Arabic |
| Small window 900×620 | — | submit HIT in both LTR and RTL |
| Console errors | — | NONE |
| lint / build:ui / node tests | — | clean / clean / 8 PASS |

Five proof screenshots from the **installed** app are in `recon/2026-09-13-ui-blank-root-cause/`: default launch, post-generation, Arabic, small-window RTL, small-window LTR. Pixel audit (scripts/screenshot_pixel_audit.py) confirms all are fully rendered (23–45k unique colors, edge density 8–20 vs the near-empty 1,427-color pre-fix shot).

## Process Log

> [!info] Rounds
> R1 (~8m): screenshot pixel audit of the prior session's own evidence + CSS/font pipeline audit. Found the prior "proof" screenshot was near-empty; found splash/composer suspicious geometry.
> R2 (~18m): probe v4 (clean-state launch, geometry dump, Enter submit, RTL, small window) → repro'd blank app; probe v5 (gated forensics with console capture) → deterministic repro, zero errors, mount-gate suspicion; protocol trace → `mdld`-once / `inrd`-forever asymmetry confirmed in Python source.
> R3 (~25m): one-line protocol fix + Enter submit + compaction; repro re-run (t+2s mount); full suite green on dev; `npm run build:install`; full suite green on installed app; lint + build + 8 node tests green; tooling persisted to repo.

> [!warning] Residual observations (not fixed, by design)
> - The Python backend should ideally re-emit `mdld` on each loop for protocol hygiene; the renderer-side implication fix covers all current cases including the frozen PyInstaller binary, which cannot be rebuilt locally for Windows from macOS.
> - `verify_installed_app_ui.sh` still requires macOS Accessibility permission (osascript System Events); the CDP probes (ui_probe4/5) are the permission-free alternative and are now committed.
> - `win.setSize(770, 550)` at background.js:98 remains redundant with the constructor and is a future cleanup candidate.

## Open Questions

- Does the frozen Windows backend (PyInstaller) also re-emit `inrd` in its loop? (Source says yes — same script drives both — but Windows end-to-end was not exercised from macOS.)
- Should `getLocale()` initialization also read the OS locale on first run instead of defaulting to English?
