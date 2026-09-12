# R1 — Synthesizer

## Emerging thesis (provisional)

**"Right decisions, mute surfaces."** Both targets now make *correct decisions* (capability-gated
recommendation, bounded retries, translated prompts, guarded refusals) and then *hide the
reasoning*: one installer speaks through a modal, another through a toast; capability verdicts
render as absent list items; cancel/skip collapse into one handler; seeds and translations transform
silently at submit. The 08-18 thesis was "project one truth." The 08-25 refinement for these two
surfaces: **projection includes explanation** — a truth that renders without its reasons is
half-projected.

## Themes refined

### Theme A — One installer, two mouths (strongest thread)
`App.vue.start_model_download` (visible, skippable, attributed) and the composer's
`ensureModelReadyForGeneration → download_asset` (invisible, automatic, disclosed-by-toast) are
two owners of the same irreversible-feeling act. All prior duplicate-implementation scars
(batch queues, model pickers) predict this pair will drift. The fix shape is a **download/install
store** with one state machine (`idle → fetching_catalog → picking → downloading(progress) →
verifying → ready | failed(cancelled-attributed)`) and two thin projections: the modal and a
composer-affordance (inline pill in the chat box: "Downloading DreamShaper 38% — 1.2 GB left").
This simultaneously fixes finding 16 (disclosure), Claim 2 (real cancel), and §3.8 dedup.

### Theme B — Capability as copy
`runnable | unverified | unsupported` exists as data. Render it as sentences: onboarding card gets
a verdict line ("Verified on your Mac · 6.4 GB · runs offline"); ModelStore/composer-absence gets
a reason ("FLUX.1 — not yet verified on this build"); gated models get locked-with-login rather
than invisibility (retires settled #3/#4). Cheap: predicates exist; this is template work.

### Theme C — Composer slimming with an ownership rule
Rule of thumb extracted from the inventory: the prompt box should own *expression* (text, chips,
negation, submit) and *project* everything else. Batch management, language, install state, and
settings belong in adjacent surfaces that project shared stores. This reframes finding 16: the
composer may *trigger* install but must not *own* it.

### Theme D — Exit semantics need a table, not a refactor
Five skips through one function is fine *if* the state effects are explicit. Deliverable: a
matrix (state × skip → what happens to `onboarding_completed`, `model_to_download`, partial file,
poller). Wherever the matrix surprises, split the handler.

## Productive tensions to develop in R2 (not resolve)

1. **Automation vs disclosure:** auto-download-on-submit is the plug-n-play dream *and* a consent
   problem. Where is the line — always ask for >N GB? Ask once, remember? Never ask?
2. **One card vs shortlist:** simplicity vs agency inside the modal (Critic half-endorsed a
   3–5 curated list). Does adding alternates destroy the one-click promise?
3. **Honesty treadmill, composer edition:** should the token counter, translation notice, and
   seed be surfaced (honest, cluttered) or stay ambient (calm, opaque)?
4. **Fix-now vs fix-the-machine:** several findings are template-level cheap (Theme B, emoji→SVG,
   chip span-tracking) while the durable fix is the installer store (Theme A). Sequence matters;
   08-18's "reconcile before you project" applies.

## Recommended R2 focus

- Explorer: read `start_model_download`, `dismiss_model_setup`, `offerOptionalDownloads`,
  `AssetsManager.download_asset`, `native_functions.js` download plumbing — produce the exit-semantics
  matrix + concurrency answer + `hasHfToken` verdict. Ground Theme A in exact current behavior.
- Associator: develop Theme A's store shape against the existing IPC protocol (can `py2b`/download
  events carry it, or is it renderer-only?); map LM Studio/Midjourney patterns onto concrete
  component sketches.
- Critic: attack the installer-store idea (is it over-engineering for a 2-surface problem? does
  Vue 2.7 reactivity make a store painful here?); stress-test the shortlist compromise.
- Synthesizer: hold the four tensions; begin converging on framings that survive.
