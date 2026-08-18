# Round 1 — Synthesizer Report

**Role:** Synthesizer — refine themes, identify productive tensions from the three R1 reports.
**Session:** 2026-08-11 gallery & image action menu recon.

## What R1 converged on (settled claims for R2)

1. The **3-group sectioned menu** (Preview & Export / Send To / Parameters) matches industry intent-grouping; the structure itself is defensible.
2. The **single always-visible ellipsis is the ONLY access path** to 11 actions — mature tools (Midjourney, A1111, InvokeAI) pair quick-action icons with a "more" menu. This is the central UX divergence.
3. **No per-image delete, no multi-select/batch, no right-click menu, no gallery keyboard shortcuts** — power-user features that are table stakes in competitors (A1111, Midjourney, ComfyUI-Gallery).
4. The **deep-ref plumbing** (`router.$refs[cur_page_id][0].$refs.sd_applet`, `router.$refs["Txt2Img"][0]`) is the most fragile engineering connection — breaks on page-structure change.
5. **`gallery_item_context`** couples the lightbox to GalleryImage's exact parent (`$parent.image_data`) — implicit contract, breaks on re-parenting.
6. The **CSS approach is sound** (isolation:isolate + clip layer + no backdrop-filter) — validated by web research on Chromium compositor behavior.
7. **RTL + bilingual support is thorough and a genuine differentiator** — no other concern outweighs keeping it intact.
8. `menu_items` building is **duplicated** between GenerationGallery and History (drift risk with a third consumer).
9. The lightbox is **permanently dark, hardcoded colors** — escapes the design-token theming system.

## Productive tensions (the shape of R2)

**T1 — Discoverability vs. Density.** Always-visible ellipsis (current) vs hover-reveal (industry) vs quick icons + more menu (Midjourney). Desktop/mouse-first app makes hover-reveal viable, but 11 actions can't all be quick icons. What's the right split of "direct access" vs "more menu"? Tied to: which 2-4 actions are frequent enough to deserve a persistent icon?

**T2 — Menu breadth vs. Depth.** 11 items is at the upper bound of the 5-7 ideal. Options: (a) split actions to a right-click context menu + keep ellipsis short; (b) add a metadata/params popover that offloads the Parameters group; (c) add multi-select and move batch ops to a floating action bar (Eleken pattern), slimming the per-image menu.

**T3 — Feature addition vs. Engineering fragility.** Adding delete/batch/multi-select is exactly what the community expects — but the current plumbing (deep refs, `$parent` coupling, duplicated menu builders) makes additions riskier. Do we stabilize the plumbing first (R2 candidates: registry for load_options/generate_similar_images, group-context prop for the lightbox) or ship features on the current structure?

**T4 — Themability.** The new gallery + lightbox are beautifully token-aligned EXCEPT the lightbox's injected CSS. The app has a defined light mode (`prefers-color-scheme`) that the lightbox ignores. Full theming vs. dark-only viewer (current app shell is dark-only in practice — is light mode even shipped?).

**T5 — Delete + history interplay.** Per-image delete in the generation gallery vs the History page's group-level delete; `clear_old_groups` silently prunes groups beyond `n_to_keep`. Who owns image lifecycle: the gallery (transient) or History (persistent)? A delete in one must not desync the other.

## Round 2 focus recommendations

- **Explorer**: fill gaps — metadata/params viewer patterns in AI galleries; delete patterns & undo; how InvokeAI/A1111 do "send to" affordances; lightbox copy-to-clipboard conventions.
- **Associator**: connect multi-select/batch to the existing batch_queue system (Homepage/Applet batch panels operate on queued prompts, not gallery selections — could selection feed the batch panel?); Settings deep-linking for imgbb.
- **Critic**: reality-check the deep-ref plumbing (read PagesRouter.vue + SDImageGenerationApplet to see if a registry exists), the lightbox theme gap, and whether `clear_old_groups`/history desync is real.
- **Synthesizer**: deepen T1/T2/T3 — the strongest framing is "the menu is structurally right but access-poor; the app lacks gallery power-user features; and the plumbing will bite before the features land."
