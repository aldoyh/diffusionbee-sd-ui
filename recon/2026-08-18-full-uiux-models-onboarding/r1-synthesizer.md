# Round 1 — Synthesizer: One Verified Truth, Faithfully Projected

**Session**: 2026-08-18 · Focus mode · **Agent**: SYNTHESIZER · **Round**: 1
**Topic**: "the entire full UI/UX and the models onboarding functionality — improved dramatically"

## 0. The ground moved under the brief

This is Focus mode, but round 1 already converged further than the brief assumed. Three of the
ten "settled claims" are now **fixed in the uncommitted working tree**: download
resume/ETag/cancel (claim 2), the picker generatability gate (claim 6), and the FLUX banner
copy (part of claim 1). The Critic's round-1 verdict is therefore not "validate 10 to-dos" but
"**audit what the fixes break, and what the next naive fix will break**" (`r1-critic.md`).

Three independent agents converged on the same two observations, and they are the spine of
everything below:

1. **The dominant failure mode is a two-truth system.** The gate is a hardcoded renderer
   constant (`GENERATABLE_MODEL_TYPES = ['sd_model','sd_model_inpaint']`, `flux2_catalog.js:85`),
   but what is actually runnable differs between the dev `venv311` TF backend (no SDXL, no FLUX)
   and the reused upstream 2.5.3 binary (SDXL yes, FLUX.1 `flux_nnc` possibly). A single hardcoded
   truth cannot express either family correctly.
2. **The UI is a hand-authored copy, not a projection.** (Associator's whole thesis.) The app
   already owns every source of truth — `getMachineProfile()`, `downloaded_assets.json`,
   `SDManager.queue`, `history_service` — but renders bespoke, divergent views instead of
   projecting that state. The gap is almost never "build the state"; it is "render the state you
   already have."

That reframes the topic: **"dramatic improvement" is not a list of new screens. It is making
every surface a faithful projection of a single, runtime-verified model-and-job state — and
fixing the lies before projecting them.**

---

## 1. Candidate framings

### Framing A — "One verified truth, faithfully projected" *(projection + runtime truth)*

**Thesis**: Every broken surface in DiffusionBee — the FLUX trap, the "0 B" sizes, the lying
hardware report, the invisible queue, the un-cancelable modal — is the *same bug*: a hand-authored
view that has diverged from a state the app already holds. Dramatic improvement means (1)
reconciling the truth first, then (2) making every surface a projection of one model/job store.

**Spine**: single source of truth + projection, with runtime verification as the precondition.

**Evidence**: The Associator's entire pattern-map (`r1-associator.md`) is this law restated across
seven seams; the Critic's "single-truth fixes applied to a two-truth system" is the corollary.
Concretely: the gate is now unified *across pickers* but the ModelStore 🔵 "download-only" path
still lets a user download a 7.75 GB FLUX.2 they cannot run (`canDownloadModel` is a version
gate, not a generatability gate); the hardware report is computed but "surfacing it" would surface
a lie ("Great on Apple Silicon (MPS)" for FLUX); the 0 B bug exists because the catalog has no
`size_bytes` but the view renders `model.size_bytes || 0` anyway (`App.vue:124`).

**Requires**: a per-family capability verdict + a runtime probe where the backend reports its own
supported types (replacing the hardcoded allowlist); catalog schema enrichment (`size_bytes`,
`min_ram_gb`, license, tier); one projected model store; corrected hardware data; SDManager
job-store semantics.

**Biggest risk**: projecting *before* reconciling makes the lie louder and more consistent. The
projection law is only as good as the truth it projects — so the first move must be to correct
the truth, not to widen the projection.

---

### Framing B — "Trust restoration, round 2" *(honesty)*

**Thesis**: The FLUX gate was round-1 honesty, but it now over-corrects (it hides possibly-working
FLUX.1) and the app still lies elsewhere (hardware report, cancel button, resume, ModelStore
download). Before any delight, the app must become *verifiably* truthful.

**Spine**: truthfulness.

**Evidence**: Critic F1–F7: modal "Cancel" does not stop generation (clears `attached_cbs`, never
clears the SDManager queue → re-dispatches on next `inrd`); resume is same-session/manual only
(`.partial` swept at startup); hardware surfacing would lie (no VRAM detection, VRAM-flavored
`min_ram_gb` vs total RAM, `cpuModel = navigator.userAgent`); the gate drops `flux_nnc` (FLUX.1)
while the shipped binary is upstream 2.5.3.

**Requires**: runtime capability probe; VRAM/free-memory floors; cross-restart resume +
auto-retry + ETag-required append; wire `SDManager.stop_all()` to the modal; gated-model browser
hand-off; correct the hardware report before showing it.

**Biggest risk**: an endless honesty treadmill — "one more lie" keeps surfacing. Needs a
definition of done or it becomes permanent subtraction without visible improvement.

---

### Framing C — "The unified Model Hub" *(one first-class model surface)*

**Thesis**: Model discovery, download, selection, and management are scattered across four
surfaces with contradictory truth; collapse them into ONE hub that projects capability, hardware,
license, size, and speed — and make onboarding a thin entry to it.

**Spine**: unification of the model surface.

**Evidence**: settled claims 5 & 6; the live catalog carries no `size_bytes`/`min_ram_gb`/license/
tier fields (Explorer's `list_models` fetch); LM Studio / Ollama / ComfyUI-Manager all ship a
Discover/Explore hub with accurate sizes, fit indicators, and 1-click queues.

**Requires**: catalog schema enrichment (server-side); size/ETA/disk-economics; hardware badges;
license guardrails; move optional downloads out of the cramped setup modal into ModelStore.

**Biggest risk**: unifying before the capability predicate is correct *spreads the lie* — the hub
is only as honest as the predicate, and today the ModelStore download path is the one place the
gate is still bypassed.

---

### Framing D — "The non-blocking studio" *(generation & queue as projection)*

**Thesis**: The heart of the app is a blocking modal with an invisible queue and a cancel button
that lies; make generation inline/observable and the queue a live projection of the job store.

**Spine**: non-blocking + queue visibility.

**Evidence**: settled claims 7 & 10; Critic F1/F3/F8 — `SDManager.on_img` early-returns *without*
`finish_current_job()` when the gallery ref is gone (stall/double-gen); batch queue is duplicated
across two localStorage keys (`APPLET_KEY`/`HOMEPAGE_KEY`) with two 600 ms pollers; Associator's
"Adobe Media Encoder queue-as-projection" analogy.

**Requires**: fix SDManager semantics *first* (wire `stop_all` to cancel, replace the single
`attached_cbs` slot, guarantee `finish_current_job`), then consolidate the batch poller, then
remove the modal.

**Biggest risk**: making the modal dismissible *today* invites navigation mid-generation, which is
exactly the F1/F3 trigger — it would resurrect the 08-05 "can't click and type — something running
the entire time" complaint this framing is meant to cure.

---

### Framing E — "Onboarding as a truthful, hardware-aware journey" *(first-run as a system)*

**Thesis**: Onboarding is a cramped modal making promises it cannot keep; rebuild it as a full
journey showing real hardware fit, honest model options, disk economics, and browser-gated access.

**Spine**: onboarding journey.

**Evidence**: settled claims 4 & 5; the 07-24 pillar-3 roadmap; Explorer's open "16 GB Mac in
2026" default-model question; the skip bug (`dismiss_model_setup` calls `completeOnboarding()` so
skipping hides the banner even with zero models).

**Requires**: corrected hardware data first; optional downloads moved to ModelStore; skip
semantics; Windows parity of RAM detection.

**Biggest risk**: onboarding is the trap's ground zero — a redesign that precedes the capability
probe *amplifies* the lie at the highest-stakes moment, and it invests heavily in a one-time
surface with a narrow payoff window.

---

## 2. Ranked framings + strongest pick

**Strongest: Framing A — "One verified truth, faithfully projected."**

Ranking (1 = strongest):

1. **A — projection + runtime truth** ✅ *chosen*
2. **B — trust restoration** — the non-negotiable first milestone, not a destination
3. **C — unified Model Hub** — the visible "dramatic" deliverable; A's model-surface projection
4. **D — non-blocking studio** — A's job-surface projection; a later phase, gated on SDManager
5. **E — onboarding as journey** — A/C projected onto first-run; must not precede the probe

**Why A wins.** Focus mode demands one convergent direction, and A is the only candidate that is a
*mechanism*, not a feature list:

- It is the synthesis of the two most convergent round-1 reports. The Associator's "UI is a
  projection of state, never a hand-authored copy" and the Critic's "single-truth fixes on a
  two-truth system" are not rivals — they are the positive and negative statement of the same law.
- It explains the round-1 surprise. Three claims are "fixed," yet the Critic still finds lies
  (hardware report, cancel, resume, ModelStore download). A explains why: the fixes were
  single-truth *patches*, applied to a system with *two* truths. Patching surface by surface can
  never finish; projecting a reconciled truth can.
- It converts its own biggest risk into the plan. "Don't project a lie" becomes milestone 0
  (reconcile), which is concrete and testable — not a vague caution.
- It subsumes the others cleanly: B is A's milestone 0; C is A's model-store projection; D is A's
  job-store projection; E is C projected onto first-run. No framing is wasted; they become phases
  of one spine.

I am explicitly **demoting B from a competing framing to a first milestone**. Trust restoration
alone is subtractive — it removes FLUX.2 and tells the truth, which is necessary but does not
"improve dramatically." The winning move is A *with* B folded in as its mandatory opening act:
**reconcile the truth, then project it everywhere.**

---

## 3. Productive tensions (round 2 must develop these)

### T1 — "Project the state everywhere" vs. "don't project a lie."

The projection law says render the capability predicate on every surface (Steam's legible
"requires X, you have Y" disabled-button pattern). But the Critic warns the *current* predicate is
wrong: hardware says "Great on Apple Silicon (MPS)" for FLUX, sizes show "0 B," and the gate
over-corrects on FLUX.1. Projecting a wrong predicate doesn't fix the trap — it makes the lie
louder and *more consistent*. Resolution order is therefore non-negotiable: **correct the truth
(runtime probe, hardware floors, catalog enrichment) before widening the projection.** This is the
single most important sequencing decision of the whole recon.

### T2 — "One source of truth" vs. "two actual truths."

The gate is a hardcoded renderer constant, but the runnable model set differs between the dev
`venv311` TF backend and the reused upstream 2.5.3 binary. SDXL (`sd_type: sdxl_base`, `type:
sd_model`) passes the gate yet is not runnable in the dev backend (`test_all_models.py:729`);
FLUX.1 (`flux_nnc`) fails the gate yet may be runnable in the shipped binary. A single hardcoded
allowlist cannot express either. Resolution: a **per-family capability verdict** (`sd_model` ✅ /
`sdxl` ⚠️-binary-only / `flux_nnc` ⚠️-unverified / `flux2_model` ❌) plus a **runtime probe** where
the backend self-reports its types at startup — which is a small IPC/protocol addition, not a
frontend-only change.

### T3 — "Non-blocking delight" vs. "the blocking-loops/jank history."

The largest felt-UX win is making generation non-modal with a live queue. But the plumbing is
unsafe: cancel doesn't clear the queue (re-dispatches on the next `inrd`), `on_img` early-returns
without `finish_current_job()`, and the batch poller is duplicated across two localStorage keys
with two 600 ms intervals. Making the modal dismissible today triggers precisely these — the same
"can't click and type" complaint the 08-05 audit was fought over. Resolution: the non-blocking
studio is a **job-store refactor first, a CSS change second.** Fix SDManager semantics, then remove
the modal.

---

## 4. Round-2 recommendations

Round 2 should commit to Framing A and fill the remaining *fact* gaps before building. Milestone
order for the eventual plan: **M0 reconcile truths → M1 honest model projection (hub) → M2
onboarding as projection → M3 job-store / non-blocking → visual layer in parallel.**

**Critic** — settle the two-truth facts (this is the round-2 spine):
1. Re-audit the **frozen binary** for `flux_nnc` (FLUX.1) reachability specifically. The 08-09
   audit was FLUX.2-shaped (`flux_dylib`, `flux2` strings) and did not settle FLUX.1.
2. Verify the **SDXL reverse-trap** (sdxl_base passes the gate, not runnable in dev TF) — the
   single-allowlist design did not anticipate it.
3. Design the **per-family capability verdict + runtime probe** contract (which IPC prefix, who
   self-reports, packaging implications for the frozen binary).
4. Produce a line-level fix plan for F1/F3 (`SDManager.stop_all` wiring, the single `attached_cbs`
   slot, `on_img`'s missing `finish_current_job`) — this is the unlock for the non-blocking studio.
5. Audit download-resume edges: cross-restart persistence, ETag-required append, duplicate guard.
   **Deliverable**: a "reconcile-before-project" checklist + the corrected capability model.

**Explorer** — fill the failed/empirical gaps:
1. Re-fetch Leonardo AI / KREA / LM Studio onboarding specifics (307'd last round).
2. Probe the download proxy's `Range`/`ETag` behavior (HEAD + Range on
   `models.diffusionbee.com/list_models?download_model=` and the `fallback_url` hf-mirror) — resume
   correctness depends on it.
3. Benchmark hardware-fit + disk-economics + speed/ETA surfacing in LM Studio / Ollama /
   ComfyUI-Manager / Civitai.
4. Resolve the **16 GB Mac default-model question** with 2026 data (SDXL vs DreamShaper vs
   klein-4B-once-a-backend-exists).
5. Design the **gated-model browser "Agree" hand-off** (HF gated access is browser-first; the
   in-app token field alone is insufficient for first-time access).

**Associator** — deepen the projection architecture:
1. Design the **single model/lifecycle store** (capability predicate + `downloaded_assets` +
   catalog + `getMachineProfile()`) and the projection API every surface reads from.
2. Enumerate every divergent view to kill: `App.vue` optional-downloads list, ModelStore 🔵
   download path, applet selects, banner copy.
3. Decide **catalog schema enrichment** (server-side vs in-app) for size/RAM/license/tier — the
   enabler for the size column, disk economics, and license guardrails.
4. Finalize the durable-store projections: A1111 **PNG tEXt provenance** + Lightroom **two-step
   delete** as the gallery's source-of-truth contract (settles claim 8 in one decision).

**Synthesizer (round 2)** — lock the milestone order and a **definition of done** per claim so the
honesty treadmill is timeboxed, and begin drafting the action-plan skeleton.

### Gaps still to fill (named so they don't get dropped)

- **FLUX.1 (`flux_nnc`) reachability in the frozen binary** — the single biggest open fact.
- **SDXL-in-dev reverse trap** (new this round; the reverse of the FLUX trap).
- **Runtime capability probe design** — backend/IPC + packaging, not frontend-only.
- **Hardware data correctness** (VRAM detection, free-memory floors) — must precede any badge.
- **Catalog schema enrichment** (server-side) — enabler for size/ETA/license/disk economics.
- **Cross-restart resume semantics** (`.partial` is swept at startup today).
- **Real cancel** (`SDManager.stop_all` wiring to the modal).
- **Windows parity** of onboarding hardware detection.
- **16 GB Mac default-model decision** (product call, needs the Explorer's data).




