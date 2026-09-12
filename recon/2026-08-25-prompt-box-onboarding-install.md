# Prompt Box & Onboarding Model Install — Deep Recon

**Date:** 2026-08-25 · **Mode:** autonomous + explore · **Builds on:** [[recon/2026-08-18-full-uiux-models-onboarding]] (and the eight sessions it folded in)
**Targets:** the Homepage prompting area (`Homepage.vue` chat-box stack) and the first-run model selection/install flow (`App.vue` setup dialog, `utils/model_selection.js`, `utils/flux2_catalog.js`).
Agent reports: `recon/2026-08-25-prompt-box-onboarding-install/rN-<role>.md`

> [!info] Process Log
> R1 (Explorer/Associator/Critic/Synthesizer): wide inventory of both surfaces; Critic demanded
> verification of three unproven claims before canonizing. R2: Explorer verified against method
> bodies — cancel is real now, dedup guard landed, `hasHfToken` confirmed dead — and produced the
> exit-semantics matrix; Associator traced the consent-resurrection pattern across sessions;
> Critic stress-tested the installer-store and shortlist proposals; Synthesizer converged on four
> framings. ~107k tokens, ~29m wall clock. No subagent Task tool this session; agents ran as
> sequenced role passes by the orchestrator.

---

## The Territory

### What changed since 08-18

The M0 capability work **landed**: `flux2_catalog.js` carries `BACKEND_CAPABILITY_MANIFEST`
(`dev-tf` vs `packaged-binary`; FLUX.1 = `unverified` in binary), and every picker routes through
`resolveModelCapability`. The download fixes partially landed too: `dismiss_model_setup` now does a
real IPC abort (`download-cancel`) with an in-code confession that it *previously* was cosmetic, and
`AssetsManager.download_asset` dedups on `status == 'downloading'` (closing 08-18 §3.8's
interleaved-writer corruption at the renderer layer). Two of last session's highest-trust bugs are
dead. This recon is about what their composition still gets wrong.

### Surface A — the prompting area (verified inventory)

One chat-box stacks: textarea (`⌘/Ctrl+Enter` submit) → tool row → batch panel → collapsible
negative prompt → modifier chips (text present) / inspiration chips (empty) → language toggle →
pending note. Ten small defects, no shared root cause except inconsistent authorship:

1. Three icon languages in one row (SVG strokes vs raw emoji 📋 ⏳ ▶ 🗑 ✕ — emoji bypass theme tokens and render per-OS).
2. Recent-prompts menu closes only via mouseleave/toggle — no Escape, outside-click, arrow keys, or ARIA.
3. Modifier chips mutate text by substring replace — stateless spans can mangle user words.
4. Live CLIP counter (x/75) on the main prompt, none on negative prompt; enforcement happens at submit anyway.
5. Silent transforms at submit: Arabic→English translation (toast), random seed never surfaced.
6. JSON-mode toggle explains itself only via title attribute.
7. Batch items append-only: remove disabled while queued/running; no edit/reorder/regenerate.
8. App-global language toggle lives inside the composer and flips `dir=rtl` mid-typing.
9. Welcome tiles overwrite typed text without confirmation.
10. A 700ms pending-prompt poller runs while queued (the 08-05 "something running the entire time" smell).

Aggregate cost: the box feels hand-made by three people. Fixable in one presentation-only PR.

### Surface B — the onboarding/install flow (verified inventory)

Three entry points (startup auto-launch, Homepage banner, empty quick-controls picker) converge on
a five-state modal: checking → one-card recommendation → progress → success (+optional downloads)
→ optional checkbox list. Verified behavior:

- Recommendation is capability-gated and machine-scored — honest data, single choice, zero rendered reasoning ("An image generation model for DiffusionBee" fallback copy).
- No disk-space check anywhere; sizes depend on catalog `size_bytes` (present for locally merged FLUX.2 entries, unknown server-side — the "0 B" family may persist).
- Optional-downloads step is still the cramped checkbox list (settled claim #5, untouched).
- Success state offers two competing CTAs plus a third path with its own Download/Skip/Later matrix.

---

## Framing α (primary): Consent integrity — no path overrides a refusal

The session's sharpest verified finding. The chain:

1. User clicks **Cancel download** → genuine abort, partial removed by main process ✅
2. `dismiss_model_setup` also calls `completeOnboarding()` → banner gone, auto-launch gone
3. User types a prompt → `ensureModelReadyForGeneration` finds no downloaded model and no
   in-flight entry → **silently re-downloads the exact asset the user refused**, disclosing via
   "Prompt queued" toast only

Every ingredient was fixed correctly since 08-18; the composition betrays the user. Two sibling
defects from the same exit-semantics matrix:

| Dialog state | Skip side effects | Download killed? |
|---|---|---|
| Checking… | hides overlay, marks onboarding complete forever | n/a |
| Model card | same | n/a |
| Downloading | **real cancel** + complete | ✅ |
| Success | complete | n/a |
| Optional list | stops poller, marks offered | ❌ in-flight optionals keep writing |

- One accidental Skip during the spinner permanently exiles the guided flow (recovery = ModelStore only).
- Dismissing during optional downloads abandons those transfers mid-write, progress UI gone.

**Fix shape:** one bit (`userRefused`) living in one place, checked by every start path, rendered
as one sentence ("Resume DreamShaper? 6.4 GB"). Plus two surgical matrix corrections: cancel
in-flight optionals on dismiss, and don't set `onboarding_completed` from the checking-state skip
(nothing was decided yet).

## Framing γ: Install store as re-homing, not architecture

Four consumers already read one dumb map (`assets_manager.downloading`) through four independent
pollers (300ms modal, 700ms pending loop, AssetsManager tiles, ModelStore buttons). None reads
*intent* — which is how α happened. The fix is an ~80-line observable module (`install_store.js`):
phase enum (`idle → picking → downloading(progress) → ready | failed | refused-by-user`),
intent flags (`startedBy`, `userRefused`), subscribers. Ship with a standalone node assertion test
per project convention (`electron_app/scripts/tests/install_store.test.js`), e.g. asserting that
restart-after-cancel requires confirmation. States carry a copy table so surfaces cannot improvise prose.

## Framing δ: Capability-as-copy

M0 made verdicts computable but nothing renders them: absence in the dropdown reads as brokenness,
the modal card can't say "verified on your Mac," gated models are invisible rather than
locked-with-login. Extend the vocabulary with `refused-by-user` and give each state exactly one
sanctioned sentence per surface. Template-level cheap; retires the presentation half of settled
claims #3/#4.

## Framing β (runner-up): Composer coherence

Surface A's ten defects form one parallel-track PR touching only `Homepage.vue` + `theme.css`:
unify icon language, add Escape/outside-click/ARIA to the recent menu, span-track the chips,
counter for negative prompt, surface seed in gallery metadata post-generation (not in-composer),
move the language toggle out of the composer. Nearly disjoint code from α/γ — the two tracks land
independently.

---

## Tensions (deliberately unresolved)

- **Does any code path override an explicit human refusal?** Binary and testable — today the answer is yes (one). Should stay binary at zero.
- **Skip-during-checking:** permanent respect for impatience vs re-arming the banner next launch.
- **One card vs shortlist:** alternates inside the modal preserve one-click while making refusal cheaper than page-leaving — but only if they pass the capability gate and have honest sizes.
- **Consent honesty > ambient honesty:** surfacing refusal-state is mandatory; surfacing seed/translation stays optional polish.
- **Comments citing recons are documentation debt:** `flux2_catalog.js` now cites three recon docs; prose drifts first.

## Open Questions

1. Does `verifyModelsHardwareCompatibility()` render anywhere user-visible post-M0?
2. Server-catalog `size_bytes` presence (0 B family) — needs live API inspection.
3. Windows parity for partial-file cleanup on `download-cancel` (main-process side unreviewed this session).
4. Can the 700ms pending-prompt poller convert to event-driven readiness off existing `utds`/`sdbk` messages, or is a new renderer download-progress channel needed?
5. `hasHfToken`: remove the dead options or implement token-aware filtering? Currently latent — harmless until a gated *runnable* model enters the catalog.
