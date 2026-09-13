# R1–R4 Evidence Log (consolidated agent passes)

Orchestrator note: no Task-tool subagents this session; roles ran as sequenced orchestrator passes. Ground truth = raw probe output reproduced below (abridged to decisive fields). Full raw output in session transcript; metrics in `_metrics.md`.

## R2 — dev app, first probe (`node electron_app/scripts/ui_probe.js --wait-image 90`)

```
PROBE A: rect {x:285,y:539,w:772,h:58} centerHits[0]="TEXTAREA.chat-input"
         clickReachesTextarea=true pointerEvents="auto" docOverflowX=false
PROBE B: value="a serene mountain lake at dawn, oil painting" counterText="0/75"  ← later reclassified (same-tick read)
PROBE C: hitOk=true hitEl="line.[object SVGAnimatedString]" btnDisabled=false
PROBE D: promptValueAfterClick="" (correct: submit clears) loaderVisible=false  ← wrong selector ".loader-modal"
PROBE E: audit all ltr/textAlign:start; offscreen = welcome-sample-label carousel items (horizontal scroll by design)
generated: ["aserenemountainlakeatdawn_15777268.png"] (within 90s)
console errors: []
```

## R3 — settle-aware probe, dev app (`node electron_app/scripts/ui_probe2.js`)

```
T1 counter-after-settle: counterText="9/75" class="...token-counter--ok"      ← instrument race, not app bug
T2 negative-toggle: clicked → negVisible=true placeholder="What do you NOT want to see? (optional)"
T3 arabic: boxDirAttr="rtl" taDirCss="rtl" textAlign="start" bodyDir="rtl"
           placeholder="صف ما تريد رؤيته..." counter="32/75"
T3d audit: .chat-box/.chat-input/.chat-actions/.prompt-modifiers all dir=rtl, textAlign=right
T4 progress timeline: t=1s loader_overlay+loader_card--generation+percent+cancel visible
                      t=22s +loader_eta · t=76s loader-fade-leave-active (image done)
T4 generated: ["scenicviewbeautifulvista_29358491.png"]
```

## R4 — installed app after rebuild (`REMOTE_DEBUG_PORT=9222 /Applications/diffusion-sd-ui.app/...`)

```
T1 counter-after-settle: "9/75" token-counter--ok
T2 negative-toggle: negVisible=true
T3 arabic: boxDirAttr="rtl" bodyDir="rtl" counter="32/75" textAlign=right across audited nodes
T4 progress timeline: t=1s loader visible · t=18s +eta · t=70s still visible
T4 generated: ["scenicviewbeautifulvista_71085212.png"]
```

## R4 — verify_installed_app_ui.sh failure (environment, not app)

```
[verify] FAIL: App window did not appear within 3 minutes
manual same-call retry: osascript → "osascript is not allowed assistive access. (-25211)"
```

This shell has no Accessibility permission, so all System Events UI scripting (and screencapture/cliclick flows that depend on window bounds) is unavailable here. The CDP probe path does not need it.

## Build/metadata facts

- `npx eslint --no-fix src/` → clean. `npm run build:ui` → DONE.
- Node assertion tests: 7/8 pass, 1 skips by design (no `.bundled-models/` staged).
- Commit `7a54430` (Sep 12, 18:56) added `.chat-input { pointer-events:auto; user-select:text; z-index:1 }`.
- Installed app.asar mtime before fix: Sep 12 **17:48** — pre-fix bundle.
- Installed bundle today contains `REMOTE_DEBUG_PORT` hook (asar grep = 1).
