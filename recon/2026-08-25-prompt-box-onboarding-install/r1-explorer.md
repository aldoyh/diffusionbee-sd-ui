# R1 — Explorer

**Scope:** the Homepage prompting area (`electron_app/src/pages/Homepage.vue` chat-box stack) and the first-run model selection/install flow (`App.vue` setup dialog + `utils/model_selection.js` + `utils/flux2_catalog.js` + the `needsOnboarding` banner).

**Mandate:** cast a wide net. Build on, don't restate, the 08-18 recon.

## What changed since 08-18 (tree moved again)

The M0 capability work landed: `flux2_catalog.js` now carries `BACKEND_CAPABILITY_MANIFEST`
(`dev-tf` vs `packaged-binary`, FLUX.1 = `unverified` in binary), `setActiveBackendKind`,
`resolveModelCapability`. `model_selection.js` routes `isSelectableStableDiffusionModel` and
`isSelectableOnboardingModel` through it, and `pickOptimalOnboardingModel` no longer passes
`preferFlux2` (comment cites the recon directly). The flat-allowlist era is over — so the
interesting questions are no longer *which* model is picked, but **how the choice and the
install are presented**, and how the two surfaces interact.

## Surface A: the prompting area (verified inventory)

One `chat-box` contains, stacked: main textarea (rows=2, `⌘/Ctrl+Enter` submit) → tool row
(recent-prompts clock icon, negative-prompt minus-circle toggle, random-prompt wand, JSON-mode
toggle, paper-plane submit, then batch buttons) → batch panel → collapsible negative textarea →
modifier chips (only when text present) → inspiration chips (only when empty) → language toggle
→ pending-generation note.

Findings:

1. **Three icon languages in one row.** Inline SVGs (stroke icons) for most actions, then raw
   emoji for batch: 📋 ⏳ ▶ 🗑 ✕. Emoji render differently per OS (Windows Segoe Emoji vs macOS),
   break the theme system (no currentColor), and clash visually with the SVG row they sit in.
   `theme.css` has tokens; the batch buttons bypass them.
2. **Recent-prompts dropdown is mouse-only.** Opens on click, closes on `@mouseleave` or
   re-toggling. No Escape key, no outside-click, no arrow-key navigation, no ARIA on the menu.
   Keyboard users cannot dismiss it except by tabbing away and clicking.
3. **Modifier chips mutate text by string surgery.** `promptIncludes(mod.label)` is a substring
   match and `toggleModifier` does `current.replace(...)` — appending/removing "cinematic" can
   match/mangle a word already inside the user's sentence ("cinematically", or removing the first
   occurrence anywhere in the prompt, not necessarily the chip's own insertion).
4. **Token counter vs validator disagree in kind.** The live counter shows `clipTokenCount/75`
   with warning classes, but enforcement happens at submit via `validatePromptLength` +
   `preparePromptForSd` (which also silently translates Arabic). Two different gates, one visible,
   one a toast at the moment you press send. The negative prompt gets **no counter at all**.
5. **Silent transformations at submit:** Arabic→English translation (toast), random seed
   (`Math.floor(Math.random()*1000000)`), quality/resolution preset expansion. The seed is not
   surfaced anywhere in the composer — reproducibility is impossible from Home without digging
   into history raw form options.
6. **JSON mode toggle has no affordance feedback** about *what changes* when active (title attr
   only); its relationship to the batch panel (per-item `img_width × img_height · ×n`) is implicit.
7. **Batch items are append-only:** remove is disabled once `queued|running`; no edit, no reorder,
   no per-item regenerate. The panel duplicates state labels that SDManager owns (settled claim #10).
8. **Language toggle lives inside the composer.** An app-global setting sits under the negative-
   prompt area of the prompt box — surprising placement, and it flips direction (`dir=rtl`) of the
   whole composer mid-typing, moving the caret context out from under the user.
9. **Welcome tiles → `useWelcomePrompt` replaces promptText wholesale** — no confirmation if the
   user had typed something (though chips only show when empty, tiles don't check).
10. **Composer density is high**: title + mode pills + carousel + inspiration line + chat box +
    batch + neg box + chips + lang toggle + pending note + quick-controls card. The 08-05 audit's
    "something running the entire time" complaint applies here too (pendingGenerationTimer polls
    every 700ms while a prompt is pending).

## Surface B: the onboarding/install flow (verified inventory)

Three entry points converge on one modal (`App.vue`): (1) auto-launch on startup when
`show_model_setup`; (2) Homepage `needsOnboarding` banner ("Download default model" /
"Choose manually"); (3) an empty-state compact picker in the quick-controls card. The modal has
five states: checking-spinner → single model card (title/desc/meta) + "Download & Get Started"
→ progress bar + % → success ✓ (+ optional-downloads offer) → optional checkbox list → error
footer (retry/skip).

Findings:

11. **The dialog recommends exactly one model with zero alternatives.** `pickOptimalOnboardingModel`
    returns a single winner filtered by capability. Good honesty, poor agency: the user sees one
    card and either takes it or leaves for ModelStore (a different page, different UI idiom).
    LM Studio's first-run pattern (searchable catalog with size/RAM badges, default highlighted)
    is the obvious comparator — its first-run gate is "download your first model," same shape.
12. **No disk-space economics.** Nothing checks free disk before a multi-GB download; settled
    claim #4 (hardware compatibility console-only) extends to disk. `format_model_meta` shows RAM
    flavor info, sizes come from catalog `size_bytes` — present for local flux2 entries, unknown
    for server entries (the "0 B" family of bugs, §3.7 of 08-18, may persist server-side).
13. **Optional-downloads step is still the cramped checkbox list** (settled claim #5 unaddressed):
    plain `<label>` rows inside the modal, per-row 4px progress bars, disabled-all during
    in-progress. It works, but it's the weakest surface in the flow.
14. **Success state competes with itself:** "Get more models (optional)" and "OPEN App" (odd
    caps) side by side, then a third path into optional downloads with its own Download selected /
    Skip / Later matrix. Three exits, no clear primary.
15. **Skip semantics are fuzzy:** skip during checking, before download, during download
    ("Cancel download"), after success, and during optional downloads all call the same
    `dismiss_model_setup`. Whether each sets `onboarding_completed` (and thus silences the
    banner + auto-launch) differs per state — five skips, one function.

## Cross-surface finding (the big one)

16. **Submitting a prompt can silently trigger a multi-GB model download.**
    `queuePromptForAutoGeneration` → `ensureModelReadyForGeneration` → if no model downloaded and
    no dialog showing, it picks `getDefaultModelAsset()` and calls
    `assets_manager.download_asset(defaultAsset)` **directly** — no dialog, no size disclosure,
    just a toast "Prompt queued." The user's first experience of the install process can be an
    invisible 2–7 GB download triggered by pressing Send, with a 70-second give-up timer that
    tells them to "try the Models page." The prompt box and the installer are secretly the same
    machine.

## Open threads for R2

- Does "Cancel download" actually cancel the transfer, or just hide the modal over a running download?
- Is there exactly one owner of "is a model download running" across AssetsManager, App.vue, and Homepage?
- Should the composer own install state at all, or should it project it?
