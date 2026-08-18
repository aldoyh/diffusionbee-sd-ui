# Round 2 — Synthesizer Report

**Role:** Synthesizer — refine themes, decide whether R3 is warranted, prepare the final document brief.
**Session:** 2026-08-11 gallery & image action menu recon.

## Where R2 landed

The reality-check sharpened every R1 tension into something concrete:

1. **The deep-ref fix is cheap and in-pattern.** `generation_broadcast.js` already provides the `app.functions` registry; `getTxt2ImgGallery(app)` is already used by PagesRouter. The two parameter-taking menu actions (`use_params_current_page`, `generate_similar_images`) are the ONLY menu actions bypassing it. The fix (register app-level actions, wire at page mount like `send_to_img2img`) is the single highest-value, lowest-risk change identified all session.

2. **Batch queue ↔ gallery is the biggest missed connection.** The FIFO batch machinery exists and is prompt-shaped; the gallery has no set-operations. Multi-select feeding the batch panel (or a selection action bar) is the natural next feature, and it rides on existing plumbing (group_id, SDManager FIFO).

3. **Metadata is invisible until copied.** `copy_params` exists but there's no viewer; competitors (InvokeAI gallery panel, A1111 PNG Info, ComfyUI-Gallery per-value copy) all surface params. The app also does NOT embed infotext into PNGs — provenance dies outside the app.

4. **Delete has no contract.** No per-image delete anywhere; three stores in play (live gallery groups, historyStore manifest, disk files). Midjourney's trash-with-restore is the pattern worth borrowing; at minimum a confirm + explicit store semantics.

5. **The 3-group menu structure is validated** — A1111's "Send to txt2img/img2img/inpaint" is the same Send To concept; InvokeAI's Use Prompt/Seed/All maps onto `use_params_current_page`/`copy_params`. The structure stays; the access model (ellipsis-only) is the thing to evolve.

6. **Polish items are small and real**: imgbb 32 MB pre-check, Settings deep-link from the imgbb toast, lightbox token theming, `copy_params` strip-list hygiene.

## R3 decision

R2 found **no new complications requiring a third research round** — the remaining open questions are product decisions (delete contract, batch-from-selection scope), not unknowns that web research or vault reading would resolve. Per the skill (R3 only if tensions need more development), I recommend **finalizing after R2**. The document will frame the two product decisions as Open Questions rather than resolving them.

## Final document brief (for the final-round Synthesizer)

- **Title**: DiffusionBee — Gallery & Image Action Menu: Structure Right, Access Poor
- **Format**: Explore mode — The Territory, competing framings, Tensions, Open Questions, Process Log.
- **Core argument**: the sectioned 3-group menu and the redesigned tiles are structurally sound (validated against A1111/InvokeAI/Midjourney/ComfyUI conventions), but (a) a single ellipsis is the only access path to 11 actions, (b) power-user capabilities (per-image delete, multi-select/batch, keyboard shortcuts, metadata viewing) are absent, (c) two menu actions route through fragile deep refs while the app already has a registry pattern that fixes them, and (d) the gallery's set-operations opportunity (batch queue) is unexploited.
- **Settled claims to preserve**: the 10 CRIT findings from R1/R2; the CSS engineering validation (isolation:isolate, no backdrop-filter); the RTL thoroughness; the registry pattern as the architectural spine.
- **Open questions**: delete contract (manifest-only vs trash vs disk); batch-from-selection scope; hover-reveal vs always-visible (product call); whether to embed PNG infotext; light mode shipping status.
