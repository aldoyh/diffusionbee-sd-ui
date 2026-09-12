# R1 — Critic

Stress-testing the strongest emerging claims from Explorer/Associator.

## Claim 1: "Submitting a prompt silently starts a multi-GB download"

**Mostly true, with mitigations the framing undersells.** Verified chain:
`queuePromptForAutoGeneration` → `ensureModelReadyForGeneration` → `assets_manager.download_asset`.
Mitigations present: a toast fires ("Prompt queued"), the pending-generation note renders, the
retry loop is bounded (~70 attempts) and ends in a corrective toast, and `generatePrompt` refuses
FLUX.2 with an explanatory toast. So it's not *silent*; it's **under-disclosed** — the toast says
the prompt is queued, not that a 4 GB download just began and generation is minutes-to-hours away.
Critic's refinement: the defect is expectation-setting, not automation. Auto-install-on-demand is
arguably *good* plug-n-play design (07-31 session wanted exactly this); shipping it without size,
time, or progress attribution in the composer is the actual bug.

**Also verify in R2:** whether the composer path and dialog path can run *concurrently* — user
clicks "Download default model" (dialog) while a pending prompt already started the same asset
via AssetsManager. Settled claim from 08-18 §3.8 says the dedup guard keys on wrong fields; if
still true, the two installers can interleave writers on one `.partial`.

## Claim 2: "'Cancel download' doesn't cancel"

**Unproven — must be verified against `start_model_download`/`dismiss_model_setup` before it
becomes canon.** The comment block above the mid-download button claims `dismiss_model_setup`
clears `modelDownloadInterval`, which suggests someone thought about stalls. Whether dismissal
also aborts the underlying native download (and deletes the `.partial`, or resumes it later) is
exactly the kind of thing prior sessions got wrong by reasoning from intent. R2 must read the
method bodies, not the comments.

## Claim 3: "Modifier chips corrupt prompts via substring surgery"

**Directionally right, severity overstated.** The chips only render while typing and insert at
end/remove first occurrence; worst realistic case is removing a word the user typed themselves
that matches a chip label, or double-insertion. Annoying, not destructive. The deeper critique is
that chips are *stateless* — they don't know which spans they own. A trivially better contract:
track inserted spans, or operate on comma-separated segments.

## Claim 4: "One-card onboarding is poor agency"

**Half-right.** For the target user (first-run, non-technical, wants one click), a single
pre-chosen card is *better* than a catalog — LM Studio's search-everything wall is famous for
overwhelming newcomers too. The real gap is the escape hatch: "Choose manually" jumps to a full
different page (ModelStore) and abandons the modal context. A 3–5 curated shortlist inside the
modal ("Best for your Mac" + two alternates with size/RAM) would preserve one-click simplicity
while making refusal cheaper than page-leaving. Critic endorses the fix but rejects the framing
"zero choice is wrong."

## Claim 5: "Five skips, one function is dangerous"

**Likely right but partially intentional.** Collapsing exits into `dismiss_model_setup` prevented
the stuck-overlay bugs from earlier sessions (the code comments reference poller leaks). The risk
isn't the collapse per se; it's that *state transitions* (does skip mark onboarding complete? does
it clear `model_to_download`?) are decided implicitly by which branch was visible. R2 should map
the five paths' side effects as a table and look for the one where `onboarding_completed` is set —
if e.g. mid-download cancel doesn't set it, users get re-trapped by the overlay next launch, the
exact failure 08-02 fixed once already (NaN splash / restart loops).

## Claim 6: "The composer is overloaded"

**True but beware the redesign trap.** 08-18's closing tension warned: visual wins must not land
before predicates. Slimming the composer (moving batch/lang/settings to panels) is pure
presentation — safe. But *any* move that touches install-triggering from the composer (finding 16)
must land together with the single-installer-store refactor, or we get three installers instead
of two.

## Counter-check on the "M0 landed" narrative

`model_selection.js` filters call `isSelectableStableDiffusionModel(model)` with **one argument**,
while `pickOptimalOnboardingModel` passes `{profile, hasHfToken}` into
`isSelectableOnboardingModel` — which forwards to the single-arg gate and **ignores them**.
`hasHfToken` filtering appears dead: gated models are excluded/included regardless of token
presence at the selection layer. Either dead options or a latent regression vs settled claim #3.
Flag for R2 verification.

## Verdicts carried to R2

1. Verify cancel/abort/partial-cleanup semantics by reading method bodies (Claim 2).
2. Map the five dismiss paths' state side effects (Claim 5).
3. Verify concurrent-download interleaving risk (Claim 1 extension).
4. Confirm `hasHfToken` dead-option status.
5. Reframe finding 16 as disclosure failure, not automation failure.
