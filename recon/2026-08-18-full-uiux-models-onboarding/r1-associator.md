# R1 Associator — Pattern Map: Full UI/UX + Models Onboarding

**Agent**: associator · **Round**: 1 · **Mode**: Focus
**Thesis of this report**: all seven seams are instances of **one** structural law —
*capability and lifecycle must be derived from a single source of truth (a manifest, a
control file, a job store, a catalog), and the UI is a **projection** of that state, never a
hand-authored copy of it.* DiffusionBee already owns most of these sources of truth
(`GENERATABLE_MODEL_TYPES`, `getMachineProfile()`, `downloaded_assets.json`,
`SDManager.queue`, `history_service`). The gap is almost never "we need to build the state"
— it is "we render a bespoke, divergent view instead of projecting the state we already
have." Each seam below names the mature system that solved the projection problem, the
mechanism it uses, the exact mapping onto this codebase, and the concrete win.

---

## 1. "Onboarding promises a model the app can't run" (FLUX trap)

- **(a) Analog system**: Steam / Epic game launchers, and the macOS/iOS App Store
  compatibility filter. Specifically Steam's *"This item is currently unavailable in your
  region/platform"* and the App Store's *"Requires macOS 13.0 or later"* disabled-download
  state.
- **(b) Mechanism**: the client owns a **single capability predicate** (platform + OS version
  + entitlement, or detected GPU/RAM vs. the game's min-spec) and *every* UI surface — store
  card, Install/Play button, wishlist — derives its enabled/disabled state and its "why not"
  copy from that one predicate. Crucially, Steam does **not** let marketing copy decide what's
  clickable; the predicate does. And it makes the refusal **legible**: the disabled button
  says *why* ("requires X, you have Y"), it never silently vanishes.
- **(c) Mapping**: DiffusionBee already has every ingredient of this predicate, split across
  two files. `flux2_catalog.js:85` holds the gate
  (`GENERATABLE_MODEL_TYPES = ['sd_model','sd_model_inpaint']`) and `FLUX2_MODELS` carry
  `min_ram_gb` (13/20/28) and `size_bytes`. `model_selection.js:29` `getMachineProfile()`
  already computes `totalMemGB`, `freeMemGB`, `isAppleSilicon`, arch. `pickOptimalOnboardingModel`
  (`model_selection.js:277`) already filters through `isSelectableOnboardingModel`. What's
  missing is the **projection**: the FLUX.2 card in ModelStore / the onboarding banner currently
  either advertises or hides FLUX.2, but never *renders the predicate* as a legible
  "Not runnable on this build — backend has no FLUX inference" state with the *why*.
- **(d) Concrete win**: the trap dies *permanently* rather than being patched per-surface. One
  predicate → onboarding picker, Homepage picker, applet dropdowns, ModelStore badges, banner
  copy all agree, and a disabled card that explains itself is better than a silent hide (a
  hidden FLUX.2 still gets searched on Google and pasted into the app). Zero new data
  collection — it's a derivation over fields already in the code.

---

## 2. "Multi-GB download with no resume"

- **(a) Analog system**: aria2 (the downloader under Hugging Face's `hf` CLI and many torrent
  frontends), apt/pip, and Steam's depot downloader. aria2 is the sharpest.
- **(b) Mechanism**: aria2 writes a **control file** (`.aria2`) as a sidecar that records the
  expected total length, the piece/digest map, and which ranges are already on disk. The body
  goes to a `.partial` file. On restart it re-reads the control file and issues `Range:`
  requests only for the missing bytes, verifies each completed piece against its digest, and
  only then **atomically renames** `.partial → final`. apt/pip are the degenerate form: a
  `.part` file + atomic rename, no piece map. Steam adds a "verifying install" pass against a
  depot manifest of per-chunk SHA-1s.
- **(c) Mapping**: this pattern is **already half-installed** in the working tree's
  `native_functions.js` (the `download-file` handler, lines ~860–1071): `.partial` path,
  `Range: bytes=${existingSize}-` on retry (`:1066-1069`), `416` "already whole" handling
  (`:929-948`), `ETag`/`x-linked-etag` capture and mismatch-triggered internal restart
  (`:927`, `:1036`), MD5 re-verify of a resumed stream by re-reading the whole file
  (`:1004-1019`), and atomic `renameSync(partialPath, dest)` finalize (`:891`). The remaining
  aria2 gap is the **control file's persistence**: `.partial` files are orphaned across app
  restarts because `scan_disk_for_models` only matches `.tdict`, so a resume after quit/relaunch
  never sees them. There is a sidecar today but it only survives in-memory within a session.
- **(d) Concrete win**: "dies at 90% → resumes at 90%" is already true *within* a session;
  extending it to *across restarts* (persist the sidecar with expected digest + a startup sweep
  that offers to resume orphaned `.partial`s) converts the single most user-hostile assumption
  from "mostly fixed" to "actually fixed," and gives the ModelStore a real
  "Resume download" row instead of a dead restart.

---

## 3. "Model selection: inconsistent picker across pages"

- **(a) Analog system**: VS Code's single `QuickPick` primitive (every feature that chooses
  from a list — theme, language, command — goes through one component), and Chrome's
  search-engine registry (the address bar's "default engine" and the settings page both
  reference the same entries; there is no second copy of the list).
- **(b) Mechanism**: **one picker primitive + one registry, many views.** The picker owns
  keyboard nav, filtering, ARIA, and theming exactly once; a feature only supplies *which
  registry + a label formatter*. "Manage…" is a link out of the picker into the single
  management surface (Chrome's search settings / VS Code's marketplace), so the picker never
  becomes a second management UI.
- **(c) Mapping**: `ModelSelector.vue` is already the correct primitive — WAI-ARIA listbox,
  roving tabindex, type badge + title + meta, full RTL support (it even comments that it
  exists to replace the native `<select>`). But `BasicSDApplet` still renders a native
  `<select>` for Txt2Img/Img2Img/Inpainting. The fix is two moves: (1) swap `BasicSDApplet` to
  `ModelSelector`; (2) feed both from the **same catalog store** that `ModelStore`/`AssetsManager`
  own (i.e. the filtered, enriched list produced by `mergeFlux2IntoCatalog` + the
  `GENERATABLE_MODEL_TYPES` gate), with a "Manage models…" affordance that deep-links to
  ModelStore — the Chrome pattern.
- **(d) Concrete win**: one keyboard/ARIA/RTL/badge/compat-disabled implementation means the
  "compat gate" and "FLUX disabled" state are *automatically* consistent everywhere (ties seams
  1 and 3 together). It also eliminates the whole bug class where Homepage shows the rich
  picker and the applets show a bare text list.

---

## 4. "Blocking generation modal, invisible queue"

- **(a) Analog system**: Adobe Media Encoder (the "Render Queue" docked panel that runs while
  Premiere/After Effects stay fully editable), with the *state model* of a CI dashboard
  (GitHub Actions / CircleCI: queued → running → succeeded/failed, each job carrying its own
  logs).
- **(b) Mechanism**: **the job store is the source of truth; the queue panel is a read-only
  projection of it, rendered non-modally.** Media Encoder gives each job a thumbnail, its own
  progress bar, and pause/cancel/reorder affordances, while the host app keeps accepting input.
  CI adds a durable, append-only state machine per job so the dashboard can be re-mounted or
  re-navigated-to without losing history. Nothing blocks; the work is a background actor with a
  visible ledger.
- **(c) Mapping**: the job store *already exists* — `SDManager.vue` holds
  `queue.groups_todo` / `current_group` / per-job `job_state: todo|doing|done`
  (`:44-95`, `:282-313`), and `generation_broadcast.js` is the bus that already emits state.
  The problem is purely presentation: `LoaderModal.vue` wraps generation in a full-screen
  `aria-modal` overlay, and the batch queue is page-bound (navigating away stops the poller).
  The Media Encoder move is to replace the blocking overlay with (1) inline progress on the
  applet for the *current* job and (2) a persistent, collapsible queue drawer that projects
  `SDManager`'s state, stays alive across page navigation, and exposes per-group/per-image
  progress + cancel.
- **(d) Concrete win**: directly resolves the 08-05 audit's headline complaint — "unable to
  simply click and type, something running the entire time." A user can queue a batch, type the
  next prompt, and watch progress, because the queue UI is a projection of a store they can
  navigate away from. This is also the structural home for killing the duplicated batch
  implementation (settled claim #10).

---

## 5. "Hardware compat is console-only"

- **(a) Analog system**: Steam's hardware survey + per-game system-requirements line ("min:
  … / recommended: …"), PCGameBenchmark "Can I Run It," and Apple's one-line
  "Requires macOS 13.0 or later" badge.
- **(b) Mechanism**: **detected profile (client-side, cheap) + per-title min-spec (catalog
  field) + a badge computed at render time from the same numbers the recommender uses.** Steam
  reports GPU/CPU/RAM once; every store page just compares. Apple's badge is literally a single
  `min_os` field rendered as one sentence. The badge is honest and comparative ("you have
  Y GB, this wants ~X GB"), not a binary lock-out — Steam lets you buy the under-spec game, it
  just warns you first.
- **(c) Mapping**: `getMachineProfile()` (`model_selection.js:29`) already detects
  `totalMemGB`, `freeMemGB`, `isAppleSilicon`; `FLUX2_MODELS` already carry `min_ram_gb` and
  `size_bytes`; `scoreStableDiffusionModel` already applies an Apple-Silicon `+5`. This is the
  *cheapest* seam: the data is all present and currently only printed to console
  (`native_functions.js:18-19`). The work is a single `CompatBadge` that renders
  "Requires ~13 GB unified memory · you have 16 GB" or "Below recommended" next to each model in
  ModelStore/onboarding, plus the disk-space economics from `size_bytes`.
- **(d) Concrete win**: honesty at the moment of choice (settled claim #4) with **zero new
  data collection** — it is a pure render of fields already in the code, and it makes seam 1's
  disabled state *explainable* ("not runnable" vs "runnable but too big for your RAM").

---

## 6. "HF token from env only"

- **(a) Analog system**: `gh auth login` (GitHub CLI), `aws configure sso`, and the generic
  "Connect account" OAuth flow in Notion/Figma integrations.
- **(b) Mechanism**: three-step **credential helper**: (1) accept the secret in-app, never from
  ambient shell env; (2) store it encrypted at rest via the OS keychain/DPAPI; (3) immediately
  **verify** it with a cheap round-trip and render an identity/status ("Logged in as `aldoy`"),
  not just a boolean. `gh auth status` and AWS's profile validation are the verification
  step that makes the flow feel alive and catches typos before a 19 GB download fails on auth.
- **(c) Mapping**: `hf_auth.js` currently does `ipcRenderer.sendSync('get_hf_token')` → a
  main-process env read (`:19-21`). The `gh auth` replacement: a Settings field →
  `ipcRenderer.invoke('set_hf_token')` → main validates via HF
  `GET https://huggingface.co/api/whoami-v2` → `safeStorage.encryptString` → persist. The
  downstream plumbing is already done: `enrichFlux2Model` (`flux2_catalog.js:93`) consumes the
  token to unlock gated 9B/dev, and `clearHfTokenCache()` (`hf_auth.js:51`) is the correct
  invalidation hook. `getHfTokenSync` becomes a thin cache over the main-process store.
- **(d) Concrete win**: gated 9B/dev models become reachable for non-developers (a GUI app never
  inherits shell env — the current path is dead-on-arrival in the installed product), and the
  token is *safer* than an env var. The `whoami-v2` verify also gives a "Connected / Not
  connected" UI state that replaces the current silent-vanish of gated models.

---

## 7. "Gallery: no delete / metadata / provenance"

- **(a) Analog system**: Lightroom Classic (and Apple Photos) for the **asset lifecycle
  contract**, and the A1111/Civitai **PNG info chunk** for provenance specifically.
- **(b) Mechanism**: two distinct mechanisms that compose. (1) Lightroom's catalog contract:
  every asset has a stable identity; **delete is a two-step** — "Remove from catalog"
  (non-destructive, reversible) vs "Delete from disk" (destructive, confirmable, moves to
  trash not oblivion); edits are non-destructive. (2) A1111's provenance: on save/export, the
  renderer writes a **PNG tEXt/iTXt chunk** containing prompt, negative prompt, seed, sampler,
  CFG, steps, and a model hash — so the *file itself* carries its provenance through export,
  upload, and sharing, independent of any database.
- **(c) Mapping**: `history_service.js` + `GenerationGallery.vue` already hold per-image
  records with prompt/seed/model (the identity exists). The two gaps are the two mechanisms:
  no delete IPC/confirm flow (so "delete" is unimplemented), and the PNG export path does not
  write the tEXt chunk (so provenance dies at the app boundary). Adopting the A1111 chunk is a
  *format decision* that pays off forever and costs ~10 lines in the save path; adopting
  Lightroom's two-step delete gives a safe default ("Remove from History" = soft) plus an
  explicit "Delete file from disk" with confirmation.
- **(d) Concrete win**: settled claim #8 in one contract — provenance survives export, delete
  is safe and reversible, and the metadata viewer has a durable, in-file source of truth to
  read back from (`pnginfo`) rather than trusting only the in-memory history record.

---

## Highest-leverage analogies (for the Synthesizer)

1. **Steam's capability predicate (seam 1)** — biggest *retention* lever. It is the first-run
   moment, and the fix is a pure derivation over fields that already exist
   (`GENERATABLE_MODEL_TYPES` + `min_ram_gb` + `getMachineProfile`). Near-zero new data, kills
   the trap structurally, and makes seams 1, 3, and 5 share one predicate.
2. **Adobe Media Encoder's queue-as-projection (seam 4)** — biggest *felt-UX* lever. The queue
   store (`SDManager`) and the broadcast bus already exist; replacing the blocking `LoaderModal`
   with a non-modal projection is the single change that fixes the "can't click and type"
   complaint **and** provides the home for the duplicated-batch cleanup.
3. **A1111's PNG tEXt chunk + Lightroom's two-step delete (seam 7)** — biggest *durable* lever.
   It's the one seam where the fix is a format-level decision (embed provenance in the file) that
   locks in long-term value, is cheap once decided, and gives the metadata/delete work a real
   source of truth to project.

*(Honorable mention — seam 6 `gh auth login`: it un-gates the expensive models and is a small,
self-contained main-process change, but it is gated on first shipping a stable download path.)*
