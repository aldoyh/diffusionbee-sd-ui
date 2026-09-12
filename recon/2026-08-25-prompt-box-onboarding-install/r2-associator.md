# R2 — Associator

**Settled claims from R1 (build on, don't restate):** one-installer-two-mouths theme; capability-as-copy;
composer ownership rule; exit-matrix need; automation-vs-disclosure tension.

## Connection 1: The cancel-resurrection loop is §3.4's ghost in a new body

R1-Critic demanded we verify before canonizing "cancel is a lie" — good instinct: the *dialog* now
cancels honestly. But R2-Explorer found the lie migrated rather than died: the composer restarts a
user-cancelled download without asking. Pattern across sessions: every trust bug fixed in one
surface re-emerges where another surface owns a parallel copy of the same decision. This is the
strongest empirical argument yet for the single-store refactor — not as elegance, but as **the only
way consent decisions stop leaking between surfaces**. A `cancelledByUser` bit living in one place
is enforceable; the same bit living in "whoever last polled" is not.

## Connection 2: "One accidental skip = permanent exile" connects to the plug-n-play thesis

07-31 wanted zero-setup first run. Current behavior delivers the inverse edge case: the spinner
skip (a natural click for an impatient user watching "Checking for available models…") sets
`onboarding_completed=true`, killing banner AND auto-launch. Combined with the composer fallback,
the app splits users into two castes after one click: those who skipped get silent background
installs triggered by their own prompts, and those who never opened Home never see onboarding at
all (`launchOnboarding` silently completes when models exist — correct — but there's no gentle
re-entry to the guided flow ever again). Compare LM Studio: first-run model choice is re-reachable
from the primary nav forever; onboarding is a door, not a one-shot gate. DiffusionBee has the
door (quick-controls empty picker) but only while `availableModels` is empty.

## Connection 3: Capability-as-copy meets the exit matrix

The verdict vocabulary (`runnable / unverified / unsupported`) wants a fourth state the matrix
exposes: **`refused-by-user`**. Three of the four are about the machine; the fourth is about the
relationship. Rendering it ("You cancelled DreamShaper — resume? 6.4 GB") turns the resurrection
bug into a feature and gives the composer its honest inline pill for free. One vocabulary, four
states, projected everywhere — this is exactly what Theme B was missing.

## Connection 4: The four pollers are one metronome played by four hands

300ms modal poller, 700ms pending-prompt poller, AssetsManager tile bindings, ModelStore buttons.
The 08-05 audit ("something running the entire time") was about invisible timers eroding agency;
here they also fragment *narrative* — each poller knows part of the story, so no surface can tell
it whole. The backend already speaks events (`utds`/`sdbk`); the main process already emits
download abort events (the `on_cancelled` callback proves the event path exists). The store is
therefore less "new architecture" than "finish the sentence the IPC protocol started."

## Connection 5: Emoji buttons and dead options are the same species

Both are contract violations that today happen to be invisible: emoji bypass the i18n contract
every other control honors; ignored `hasHfToken` bypasses the options contract the call sites
believe they're using. Both would become user-facing bugs within one catalog refresh or one
Windows build. Lesson for the final doc: audit for **contracts honored in prose but not in code**
— comments citing recons are documentation debt waiting to drift (the flux2_catalog comment chain
now cites three recon docs; when M-next lands, someone must update prose in four files).

## Reframed tensions for synthesis

1. Automation vs disclosure sharpens into: **does any code path override an explicit human
   refusal?** (Today: yes, one.) This is decidable, testable, and binary — better tension format
   than the vague original.
2. One card vs shortlist dissolves slightly: the exit matrix shows the modal is already a
   multi-state machine; adding a shortlist state is incremental, not architectural.
3. Honesty treadmill gains a floor: surfacing `refused-by-user` is mandatory honesty (consent),
   while seed/translation surfacing remains optional polish (calm). Consent honesty > ambient honesty.
