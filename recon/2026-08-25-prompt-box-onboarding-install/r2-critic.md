# R2 — Critic

Stress-testing the surviving ideas: installer store, refused-by-user state, shortlist, exit-matrix fixes.

## Attack 1: Is the installer store over-engineering?

**No — but scope it brutally.** Counter-argument considered: two surfaces, one shared
`AssetsManager.downloading` map already exists; a store is indirection for its own sake. Rebuttal
from evidence: the *decision logic* (when may a download start? what does cancel mean? who owns
completion?) is what's duplicated, not the state map. Four independent pollers reading one dumb
map is precisely how the resurrection bug happened — the composer reads presence/absence, the
modal reads status strings, neither reads intent. The minimal store is ~80 lines (phase enum +
intent flags + subscribe), not a framework. Verdict: endorsed, with the constraint that it must
ship with tests mirroring `electron_app/scripts/tests/` conventions (project rule) — e.g.
`install_store.test.js` asserting "restart-after-cancel requires confirmation."

## Attack 2: Is `refused-by-user` just a boolean dressed as a concept?

Partly. The risk is taxonomy inflation — four states where two booleans suffice
(`inFlight`, `userRefused`). What earns the fourth slot is the *rendering contract*: each state
must have exactly one sanctioned sentence per surface. If the store ships states without the copy
map, surfaces will improvise and we're back to plural presenters. Verdict: keep the state, define
the copy table in the same file, treat them as one unit.

## Attack 3: Shortlist — does adding alternates break the one-click promise?

Tested against the actual template: the card state is one `v-else-if` branch rendering
`model_to_download`. Adding "Best for your Mac" (pre-selected) + two collapsed alternates keeps
the primary CTA identical; the escape hatch stops being a page-leap. Real risk is different:
**alternates must pass the same capability gate**, or the modal reintroduces recommendation-of-
unrunnable via a side door. Also: alternates need honest sizes — which re-opens the server-catalog
`size_bytes` question (open, unverifiable offline). Verdict: safe if and only if alternates flow
through `isSelectableOnboardingModel` and size falls back to "size shown before download starts"
rather than "0 B".

## Attack 4: Exit-matrix fixes — is per-path handlers churn worth it?

The matrix shows only two genuinely wrong cells (optional-in-flight not cancelled; skip-during-
checking exiles the user). Full handler-splitting is churn. Minimal diff instead: (a) in
`dismiss_model_setup`, cancel any in-flight optional selections too; (b) make the checking-state
skip NOT set `onboarding_completed` (it's the one state where nothing was decided yet) — or add a
"remind me later" third verb. Everything else stays collapsed. Verdict: surgical, not structural.

## Attack 5: Did we under-attack the prompt box itself?

Self-audit: R1 inventoried ten composer findings but R2 drifted entirely to the installer thread.
Un-stress-tested survivors: chip surgery (Critic already downgraded severity), recent-menu
a11y (real, cheap: Escape/outside-click/ARIA), negative-prompt counter (real asymmetry), silent
seed (genuinely contested — reproducibility matters to SD users more than calm matters here;
recommend surfacing seed post-generation in the gallery tile metadata, not in-composer). The
composer findings are individually small; their aggregate cost is "the box feels hand-made by
three people," which is a presentation-consistency problem solvable in one styling+behavior PR
without touching install logic at all. Important sequencing note: the composer PR and the store
PR share almost no code — they can proceed in parallel, contradicting R1's fear of coupling.

## Final-round instructions to Synthesizer

- Lead with the consent finding (cancel-resurrection) — it is verified, novel vs 08-18, and morally primary.
- Present the store as ~80-line re-homing with a test-file deliverable, not architecture.
- Keep Explore-mode structure: framings, tensions left open, open questions — but name the
  runner-up framing clearly (composer consistency PR).
- Carry forward open questions: verifyModelsHardwareCompatibility visibility; server size_bytes;
  Windows-side partial cleanup parity; whether skip-during-checking should re-arm the banner.
