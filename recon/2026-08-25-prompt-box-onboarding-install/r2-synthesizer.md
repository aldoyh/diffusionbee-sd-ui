# R2 — Synthesizer

## Where the session converged

Four framings survived R2's attacks; two earned implementation priority.

### Framing α (primary): Consent integrity — "no path overrides a refusal"

Verified chain: user clicks "Cancel download" → real IPC abort, partial removed, onboarding marked
complete → user types a prompt → `ensureModelReadyForGeneration` finds no model and no in-flight
entry → silently re-downloads the very asset the user refused. Every ingredient was individually
fixed correctly since 08-18; the composition betrays the user. The fix is one bit (`userRefused`)
living in one place, checked by every start path, rendered as one sentence ("Resume DreamShaper?
6.4 GB"). Secondary consent defects in the same family: checking-state skip permanently exiles the
guided flow; optional-list dismissal abandons in-flight transfers mid-write.

### Framing β (runner-up): Composer coherence — one author's handwriting

Ten small defects (emoji/SVG mix, mouse-only menu, counter asymmetry, chip surgery, silent seed,
misplaced language toggle) share no root cause except inconsistent authorship. They form a single
parallel-track PR touching only `Homepage.vue` + `theme.css`, nearly disjoint from Framing α's
code. Sequencing insight from R2-Critic: the two tracks can land independently — the earlier
fear of coupling applied to predicates, not presentation.

### Framing γ: Install store as re-homing, not architecture

~80-line observable (`install_store.js`) absorbing four pollers' decision logic, shipping with a
standalone node assertion test per project convention. States carry a copy table so surfaces
cannot improvise prose. This is Framing α's enforcement mechanism.

### Framing δ: Capability-as-copy, extended

`runnable / unverified / unsupported` + `refused-by-user` rendered as sentences at every point of
absence or action; retires settled claims #3/#4 presentation halves. Cheap template work gated on
nothing.

## Tensions deliberately left open

- Should skip-during-checking re-arm the banner on next launch, or is permanent completion the
  right respect for impatience? (Leaned "not-yt-decided state shouldn't complete" but no consensus.)
- Seed surfacing: gallery-metadata-only (recommended) vs in-composer control.
- Whether the shortlist belongs in the modal at all vs a richer empty-state picker in quick controls.
- Server-catalog `size_bytes` backfill — blocked on live API inspection.

## Open questions carried out of the session

1. Does `verifyModelsHardwareCompatibility()` render anywhere user-visible post-M0?
2. Windows parity for partial-file cleanup on cancel (main-process code unreviewed this session).
3. Does the 700ms pending-prompt poller convert cleanly to event-driven readiness off existing
   `utds`/`sdbk` messages, or does the renderer need a new download-progress event channel?
4. `hasHfToken` removal vs implementation — which is the intended contract?

## Handoff

Ready to write the final document. Structure: frontmatter → Process Log callout → The Territory
(two surfaces as verified inventory) → Framings α–δ → Tensions → Open Questions. No Focus-mode
commitment; this is a map, not a thesis.
