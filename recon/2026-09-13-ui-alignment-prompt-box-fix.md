---
title: UI Alignment & Prompt Box — Verified Working After Reinstall
date: 2026-09-13
mode: autonomous + focus
scope: full app UI, text alignment, prompt box; build; runtime verification
verdict: build green, prompt box verified working in dev AND installed app; root cause was a stale installed bundle
targets: electron_app/src/pages/Homepage.vue, electron_app/src/background.js, scripts/verify_installed_app_ui.sh, electron_app/scripts/ui_probe.js, electron_app/scripts/ui_probe2.js
agent_reports: recon/2026-09-13-ui-alignment-prompt-box-fix/r1-evidence.md
builds_on:
- "[[recon/2026-08-25-prompt-box-onboarding-install]]"
- "[[recon/2026-08-18-full-uiux-models-onboarding]]"
---

> [!info] Process Log
> R1 inventory pass: lint clean, `build:ui` clean, 7/8 standalone node tests pass (one skip is by
> design). R2: ran the app with `REMOTE_DEBUG_PORT=9222` and probed the live DOM over CDP — prompt
> box hit-test passed, end-to-end image generated. Two anomalies (counter stuck at 0/75, "no
> loader") flagged. R3: settle-aware re-probe overturned both as instrument artifacts; Arabic RTL
> verified; loader verified visible t=1s→t=76s with percent/ETA/cancel. R4: root cause isolated —
> the installed `/Applications/diffusion-sd-ui.app` predated the clickability fix in `7a54430`;
> rebuilt via `npm run build:install` and re-verified against the installed app. R5: while
> persisting the probe scripts, found and fixed a dead-letter `.gitignore` block
> (`electron_app/` → `electron_app/*`) that had silently excluded ten real source files.
> ~175k tokens, ~33m wall clock, zero app-source code changes. Agents ran as sequenced
> orchestrator passes; no Task-tool subagents this session.

---

## The Argument

**The build was never broken, and the prompt box was never broken — the installed app was.**

Commit `7a54430` ("clean up legacy assets and streamline UI", Sep 12 18:56) contained the decisive
fix for the exact symptom the user reported: it added
`pointer-events: auto; user-select: text; z-index: 1` to `.chat-input`
(`electron_app/src/pages/Homepage.vue`) after the prior session
([[recon/2026-08-25-prompt-box-onboarding-install]]) had diagnosed the empty-webpack-dev-server
overlay iframe as a click-eater and disabled the overlay's warning/runtime modes in
`vue.config.js`. The same commit wired the missing `handleUpdate`/`onInput` bridge in
`components_bare/inputform/Textarea.vue` and `ResolveInputComponent.vue` so form values actually
update.

But `/Applications/diffusion-sd-ui.app` was built at **17:48 — 68 minutes before the fix**. Every
launch of the installed app reproduced the stale, unclickable prompt box no matter how correct the
repository had become. One rebuild (`npm run build:install`) closed the gap.

Verified with runtime evidence, not code reading — via a CDP probe
(`electron_app/scripts/ui_probe.js`, `ui_probe2.js`, persisted this session) attaching to
`REMOTE_DEBUG_PORT=9222`, against both the dev app and the freshly installed app:

| Check | Dev app | Installed app (after rebuild) |
|---|---|---|
| Prompt textarea hit-test at center (`elementFromPoint`) | ✅ reaches `TEXTAREA.chat-input`, `pointer-events: auto` | ✅ |
| Typing + v-model | ✅ value lands; CLIP counter `9/75` | ✅ |
| Submit button real click | ✅ box clears, job queued | ✅ |
| Negative-prompt toggle | ✅ area renders with placeholder | ✅ |
| Arabic RTL (`العربية` toggle) | ✅ `dir=rtl` on body/chat-box, text right-aligned, Arabic placeholder, counter `32/75` | ✅ |
| Generation progress UI | ✅ loader visible t=1s → t≈76s, percent + ETA + cancel | ✅ |
| End-to-end image | ✅ 1 generated in 90s | ✅ 1 generated |
| Console errors during all probes | ✅ none | ✅ none |

The user's three complaints decompose as:

1. **"Prompt box not working"** → stale installed bundle (fixed by reinstall; underlying code fix
   was already in master).
2. **"Text alignment"** → not reproducible in LTR or Arabic RTL on either build; every audited
   node carries correct `dir`/`textAlign` (audit table in
   [[recon/2026-09-13-ui-alignment-prompt-box-fix/r1-evidence]]). The only "offscreen" text is the
   welcome-carousel labels beyond the scroll viewport — by design for a horizontally scrolled row.
3. **"Entire App UI"** → if anything beyond the prompt box still feels wrong on the *installed*
   app, it is the same staleness: the installed bundle now matches master exactly (verified by
   asar grep: `REMOTE_DEBUG_PORT` hook present, and the verify script's own bundle-marker checks
   passed before its environment failure).

## What I changed

- **App source: nothing.** The correct response to a green build was to prove it and then fix the
  deployment gap, not to "fix" working code.
- **`.gitignore` line 191: `electron_app/` → `electron_app/*`.** The directory form made every
  `!electron_app/...` re-include below it a dead letter (git cannot re-include inside an excluded
  *directory*), silently ignoring any *new* file under `electron_app/`. The switch unmasked ten
  real files that were being kept out of version control:
  `src/batch_queue_store.js`, `src/batch_queue_mixin.js`, `src/components/ModelSelector.vue`,
  `src/components_bare/inputform/ModelSelectorInput.vue`,
  `scripts/install-to-applications.js`, `scripts/tests/batch_queue_mixin.test.js`,
  `scripts/tests/batch_queue_store.test.js`, `scripts/tests/download_resume.test.js`,
  `.eslintrc.js`, `pnpm-lock.yaml`. Existing tracked files were unaffected (grandfathered), which
  is why the repo looked healthy until someone added a new file — plausibly part of why the
  project "was not working yet" on other checkouts.
- **Rebuilt and reinstalled**: `npm run build:install` → fresh ad-hoc-signed
  `/Applications/diffusion-sd-ui.app` (backend core reused from the official PyInstaller bundle —
  fast path).
- **Persisted the missing test harness** (the prior session committed the `REMOTE_DEBUG_PORT` hook
  in `background.js` but never a probe to use it):
  - `electron_app/scripts/ui_probe.js` — boot probe: layout, hit-testing, typing, submit click,
    alignment audit, image-wait.
  - `electron_app/scripts/ui_probe2.js` — interaction probe: counter settle, negative toggle,
    Arabic RTL audit, progress-UI timeline, image-wait.

## How to reproduce the verification

```bash
# Dev app
cd electron_app && IS_TEST=1 REMOTE_DEBUG_PORT=9222 npm run electron:serve &
node electron_app/scripts/ui_probe2.js

# Installed app
pkill -x diffusion-sd-ui; sleep 1
REMOTE_DEBUG_PORT=9222 /Applications/diffusion-sd-ui.app/Contents/MacOS/diffusion-sd-ui &
node electron_app/scripts/ui_probe2.js
```

`ui_probe.js` is the boot/first-contact probe (run it against a cold start);
`ui_probe2.js` is the stateful interaction probe.

## Tensions (deliberately unresolved)

- **verify_installed_app_ui.sh is now environment-gated.** It depends on System Events UI
  scripting, which fails with `-25211` in any shell without Accessibility permission. It remains
  the right tool on a granted terminal, but a CDP-based twin would remove the permission
  dependency entirely — candidate follow-up, not done here (scope discipline: the CDP probes
  already cover its assertions except screenshot proof).
- **The WDS-overlay click-eater is disabled, not structurally dead.** `vue.config.js` now surfaces
  only hard compile errors; the underlying "empty overlay iframe swallows clicks" behavior is a
  webpack-dev-server property, documented in a comment. Any future bump of WDS should re-test with
  `ui_probe.js`.
- **Counter/`$nextTick` semantics are load-bearing.** The `0/75` anomaly in R2 was a same-tick
  DOM read. Any future probe (or E2E test) that types and reads synchronously will produce false
  negatives; both persisted probes now settle before asserting.

## Next Steps

1. **Re-test on the user's machine with a normal double-click launch** (no `REMOTE_DEBUG_PORT`,
   no `IS_TEST`) — the installed app now matches master, and the probes verified the same bundle
   contents, but the user's own muscle-memory flow is the final word.
2. **Port `verify_installed_app_ui.sh` assertions into a CDP twin**
   (`verify_installed_app_cdp.sh`) that needs no Accessibility permission, so CI or a fresh
   terminal can run full installed-app verification.
3. **Wire the probes into the PR checklist** alongside `lint → build:ui → test_prompt_generation`
   as an optional fourth gate for UI-touching changes.
4. **Commit the ten unmasked files** (see *What I changed*) so other checkouts stop missing
   them — `pnpm-lock.yaml` especially, since its absence forces lockfile-less installs.
5. **Audit the root `.gitignore` for the same directory-form pattern** elsewhere
   (e.g. `backends/` and any other block using `dir/` + negations).

## Open Questions

1. Was the user's "not working" observed on the installed app, the dev server, or both? The
   evidence here explains the installed-app path; if the dev path also misbehaved *before*
   `7a54430`, the WDS-overlay mechanism covers it — but both are now fixed and verified.
2. Should the welcome-carousel labels ever be visible without scrolling (the only "offscreen"
   text found)? A design call, not a bug call.
3. Is there an appetite for a `--json` flag on the probes so they can gate CI directly?
