# R2 — Explorer

**Mandates:** (a) fill the gaps the Critic flagged — exit-semantics matrix, concurrency, `hasHfToken`;
(b) operational reality check — ground Theme A in exact current behavior.

**Settled (do not restate):** capability manifest + per-backend gate landed; composer auto-download
chain exists; one-card modal; cramped optional list; three icon languages; mouse-only recent menu;
chip string surgery; no disk-space check; LM Studio precedent.

## Verification results

### V1. Cancel is REAL now — Claim 2 resolved, inverted

`App.vue dismiss_model_setup()` (lines ~716–740): if `is_downloading_model`, calls
`assets_manager.cancel_download(model_to_download.id)`, which sends sync IPC `download-cancel`
with the stored `download_id`. `AssetsManager.on_cancelled` deletes the entry; the comment states
the main process already removed the partial. The code even carries a confession: *"Previously
this was cosmetic — dismissing the dialog stopped the poller but the stream kept writing."*
The 08-18 §3.4-family defect was fixed for downloads since that session wrote.

**But the fix created a new consent loop (new finding):**
`dismiss_model_setup` also unconditionally calls `completeOnboarding()` → `onboarding_completed =
true` → `needsOnboarding` goes false → banner gone, auto-launch gone. Meanwhile the *composer*
path (`ensureModelReadyForGeneration`) doesn't consult `onboarding_completed` at all — it checks
only whether a default model is downloaded and not currently downloading. Since cancel deleted the
`downloading` entry and never downloaded the asset, the next prompt submit **silently restarts the
exact download the user explicitly cancelled.** Explicit refusal is overridden by implicit retry.
This is the sharpest single finding of the session.

### V2. Exit-semantics matrix (all five paths)

| Dialog state | "Skip/Cancel" side effects | Onboarding flag | Download killed? | Partial file |
|---|---|---|---|---|
| Checking… | hide overlay | ✅ completed=true | n/a | n/a |
| Model card | hide overlay | ✅ completed=true | none running | n/a |
| Downloading | IPC `download-cancel` | ✅ completed=true | ✅ real abort | removed by main |
| Success ✓ | hide overlay | ✅ (already set) | n/a | n/a |
| Optional list | stop polling | ✅ + optional_offered=true | ❌ **in-flight optional downloads NOT cancelled** (`dismiss` only cancels `model_to_download`) | keeps writing |

Two surprises: (1) every skip permanently completes onboarding — one accidental Skip during the
spinner removes the guided path forever (recovery = ModelStore only); (2) dismissing during the
optional-downloads step leaves those transfers running with their poller stopped — progress UI
gone, bytes still flowing.

### V3. Concurrency — dedup guard landed

`AssetsManager.download_asset` early-returns when `downloading[asset_id].status == 'downloading'`
(with an explicit dedup comment). So dialog-click while a composer-initiated download runs is a
no-op, and vice versa. 08-18 §3.8's interleaved-writer corruption is closed at the renderer layer.
Residual gap: nothing tells the *user* the two entry points share one transfer — the dialog will
happily show progress for a transfer it didn't start (fine), but the composer toast won't appear
for a dialog-started transfer (also fine) — acceptable, actually coherent once you know.

### V4. `hasHfToken` is dead code

Confirmed Critic's flag: `isSelectableOnboardingModel(model)` forwards to the single-argument
`isSelectableStableDiffusionModel(model)`; the `{profile, hasHfToken}` options passed from both
`App.vue.fetch_models_list` and `pickOptimalOnboardingModel` are accepted and ignored. Token-aware
filtering happens nowhere at selection time. Currently harmless only because FLUX entries are
excluded by the capability gate anyway — the moment a gated *runnable* model enters the catalog,
it will be recommended to tokenless users and fail at download. Latent regression, settled claim #3 reopened by omission.

### V5. Operational reality check on Theme A

The pieces of a download store already exist, scattered:
- state: `assets_manager.downloading[id] {status, progress, download_id}` (renderer truth)
- verbs: `download_asset`, `cancel_download` (IPC round-trip)
- consumers: App.vue modal poller (300ms), Homepage pending-prompt poller (700ms), AssetsManager tiles, ModelStore DownloadButton

Theme A is therefore not greenfield architecture — it is **re-homing four existing pollers onto
one reactive source**. In Vue 2.7 the cheapest shape is a plain observable module
(`install_store.js`: `state(id) → {phase, progress, startedBy, cancelledByUser}` + event bus)
that all four read; no Vuex needed. `startedBy/cancelledByUser` fields directly encode the consent
rules: a user-cancelled model requires explicit confirmation before any path restarts it.

## Gaps still open for final synthesis

- Does `verifyModelsHardwareCompatibility()` render anything, or console-only? (settled #4 status unknown post-M0)
- Server catalog `size_bytes` presence (0 B bug family) — unverifiable offline; keep as open question.
