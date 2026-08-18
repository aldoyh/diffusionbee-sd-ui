# Round 2 — Explorer Report

**Role:** Explorer — fill gaps identified by R1: metadata/params viewer patterns + delete patterns in competitor galleries.
**Session:** 2026-08-11 gallery & image action menu recon.

## Feature 1: Metadata / parameters viewer

| Tool | Mechanism | Copy actions |
|---|---|---|
| **InvokeAI** | Integrated Gallery Panel; select image → full config metadata; action buttons: *Remix Image* (all settings except seed), *Use Prompt*, *Use Seed*, *Use All* | Metadata embedded in image/db; drag-drop rework |
| **A1111** | Separate **PNG Info tab**; drop any PNG → parses infotext (prompt, negative, steps, sampler, CFG, seed, model hash) | "Send to txt2img/img2img/inpaint" auto-populates params |
| **Midjourney** | Organize/Create pages; asset cards with prompts, ratios, job IDs, params | Search by prompt/params; copy prompt/job links |
| **Krita AI Diffusion** | Reads/writes A1111-compatible metadata into document history/layers | Re-apply prompts/masks/controlnet from dock panel history |
| **ComfyUI-Gallery** | **Info button** on card → media info popup + **Raw Metadata Viewer** (full JSON workflow) | **Click-to-copy individual metadata values**; easy metadata copy |

**Key insights for DiffusionBee:**
- The app has `copy_params` (copies JSON) but NO *viewer* — params are invisible until copied or re-sent. InvokeAI's gallery-panel + "Use Prompt/Use Seed/Use All" model maps directly onto the existing `use_params_current_page` / `copy_params` actions.
- A1111's "Send to txt2img/img2img/inpaint" is exactly this app's "Send To" group — validation that the grouping is right.
- ComfyUI-Gallery's per-value click-to-copy is a lightweight alternative to a full viewer: each parameter shown as a copyable chip.
- **PNG infotext embedding** (A1111, Krita) — the app does NOT write params into the PNG files themselves (no pnginfo sidecar). Worth flagging: a user who opens a generated PNG outside the app loses all provenance. (Check: `save_image` copies the file; nothing writes infotext.)

## Feature 2: Delete patterns

| Tool | Per-image | Batch | Undo/confirm |
|---|---|---|---|
| **InvokeAI** | Yes (Gallery Panel) | Via boards/selection | Confirmation prompts |
| **A1111** | Not in core UI (OS-level file management) | Third-party extensions | OS Recycle Bin |
| **Midjourney** | Yes (Trash / Discord ❌ reaction) | Bulk selection + Trash | **"In Trash" filter + restore** — recoverable delete |
| **Krita AI Diffusion** | Via Krita undo stack | N/A | Native undo |
| **ComfyUI-Gallery** | Yes (Info modal → Delete) | **Ctrl/Cmd+Click multi-select → Delete Selected** | Confirmation dialogs + progress |

**Key insights:**
- **Deletion should be recoverable** — Midjourney's trash-with-restore is the strongest pattern for an app with persistent history. InvokeAI/ComfyUI use confirm dialogs.
- ComfyUI-Gallery is the reference for *batch delete with keyboard multi-select* (Ctrl/Cmd+Click) — the same selection model the Associator found for batch download.
- The app currently has: group-level Delete on History page (`deleteEntry` → removes from historyStore, presumably the files remain on disk) and `SDManager.stop_all()` calling `gallery.delete_group()` to clear queued groups. **No per-image delete anywhere.**

## Sources
- https://invoke.ai/features/gallery/ — Gallery Panel, remix/use-prompt/use-seed actions
- https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/features — PNG Info tab, send-to buttons
- https://docs.midjourney.com/hc/en-us/articles/33329462451469-Organizing-Your-Creations — trash + restore, search by params
- https://github.com/PanicTitan/ComfyUI-Gallery — Info modal, per-value copy, batch delete with Ctrl/Cmd+Click
