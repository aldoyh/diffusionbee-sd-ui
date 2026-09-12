# R1 — Associator

**Method:** connections between this session's explorer inventory, the nine prior recon sessions, and external precedent.

## Connection 1: The secret download is the two-truth disease, mutated

08-18 diagnosed a *two-truth system* (UI hand-authors state instead of projecting it). Finding 16
(prompt submit silently starts a model download) is that disease in a new organ: **two installers**.
`App.vue.start_model_download()` (dialog-owned, progress-visible, skippable) and
`AssetsManager.download_asset()` (composer-owned, invisible) are parallel implementations of the
same act — exactly like the Homepage-vs-applet batch queues (settled claim #10) and the
ModelSelector-vs-native-select split (#6). The repo keeps growing one implementation per surface
instead of one store projected everywhere. Prediction: any future fix to download UX applied to
the dialog will silently not apply to the composer path, and vice versa.

## Connection 2: Capability honesty won at the data layer but not yet at the presentation layer

M0 gave us `runnable | unverified | unsupported` as a *predicate*. But neither surface *renders*
capability verdicts:
- The onboarding card says "An image generation model for DiffusionBee" fallback copy — it cannot
  say "runs on your machine, verified" vs "unverified on this build."
- The composer never explains *why* the model dropdown lacks FLUX (unverified) — the user just sees
  absence. Absence without reason reads as brokenness.
The 08-09 session's HF-token finding (hidden vs locked-with-login) is the same shape: gating is
fine, **silent** gating is hostile. Every capability decision currently renders as a missing thing.

## Connection 3: Five skips, one function ≈ the "cancel is a lie" family

§3.4 of 08-18 showed Cancel that doesn't cancel. `dismiss_model_setup` serving five distinct
semantic exits (checking/pre-download/mid-download/post-success/optional) is the same smell:
one handler, many meanings, none audited. Mid-download it even relabels itself "Cancel download"
while (to be verified in R2) possibly leaving the byte stream running — a literal repeat of §3.4
for downloads. Trust cost compounds: users who were lied to about cancel will not believe the
next progress bar.

## Connection 4: The composer is becoming a second app shell

Inventory of what lives inside `chat-container`: generation settings exposure (quick controls),
batch queue management, language switching, install orchestration (finding 16), inspiration
discovery, recent-history recall. The 07-24 redesign thesis was "functional → delightful"; the
drift since is "delightful → everything." Compare Midjourney web / Leonardo: the prompt bar stays
thin because settings, history, and discovery live in *adjacent panels with their own identity*.
Here the mode pills, quick-controls card, and batch panel all compete for the same vertical stack.
The 08-11 gallery finding ("structure right, access poor") rhymes: right contents, wrong address.

## Connection 5: LM Studio precedent maps almost 1:1

LM Studio's first-run contract: install → "you need to download your first LLM" → searchable
catalog with parameter-count/size badges → default pre-highlighted → chat unlocks. DiffusionBee
already has every ingredient (catalog API, capability filter, scoring, fixtures) but presents the
choice as *one card*. The gap is presentation, not data — which means it's cheap to close, and it
would retire three prior-recon complaints (agency, cramped optional list, hardware opacity) in one
surface change.

## Connection 6: Emoji buttons are an i18n symptom

Arabic is first-class (Tajawal, rtl, dir flips). Emoji batch buttons are the only controls with no
Arabic treatment path — they're glyphs pretending to be labels. In RTL, 📋 ▶ 🗑 keep LTR visual
weight and ambiguous meaning. The i18n system already proves the right pattern (every control has
`en`/`ar` pairs); the batch buttons predate or bypassed it. Same for ✕ remove and ⏳ run-state.

## Connection 7: The 700ms pending timer meets the 08-05 blocking-loops audit

`queuePromptForAutoGeneration` polls every 700ms up to ~70s. The 08-05 audit's lesson was that
invisible timers erode the feeling of control ("unable to simply click and type"). A better-shaped
mechanism exists in-repo: the backend already emits state (`utds`/`sdbk`) — event-driven readiness
instead of polling would delete the timer *and* the give-up heuristic.

## Synthesis for R2

Both surfaces fail the same way the rest of the app fails: **correct predicates, plural presenters.**
R2 should deepen three framings rather than resolve them:
(a) *one installer store, two projections* — make download state a single owned store;
(b) *capability as copy* — verdicts rendered as honest sentences, not absence;
(c) *composer slimming* — what genuinely belongs in the prompt box vs adjacent panels.
