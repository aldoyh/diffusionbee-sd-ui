# Round 1 — Explorer Report

**Role:** Explorer (web) — cast a wide net on dropdown mechanics, gallery UX patterns, lightbox conventions, CSS engineering.
**Session:** 2026-08-11 gallery & image action menu recon.

## 1. BootstrapVue 2 `b-dropdown` mechanics

- **`boundary` prop**: default `'scrollParent'` constrains the menu within the nearest scrollable ancestor (Popper.js v1). If the gallery container has `overflow: auto/hidden`, the menu gets clipped or flips. Setting `boundary="viewport"` tethers bounds to the window viewport instead — the fix the app already uses (`GalleryImage.vue` sets `boundary="viewport"`).
- **`overflow: hidden` ancestors clip absolutely/fixed-positioned children**: Popper cannot fully escape unless the dropdown is appended to `<body>`/portal layer, or `boundary="window"` is used. Since `GalleryImage` is inside `.gal_media` (which has `overflow: hidden` + `isolation: isolate`), the menu must live OUTSIDE the media layer — the working tree already does this (`.gal_actions` is a sibling of `.gal_media`).
- **`right` prop**: aligns the menu's right edge with the toggle's right edge. Needed for top-right-corner toggle buttons in tight grids (working tree uses `right`).
- **Deep-scoped CSS (`>>>`) over `.dropdown-menu`**: scoped `[data-v-*]` selectors won't reach Popper-rendered menus unless deep combinators are used; overrides risk polluting other dropdowns app-wide. The working tree's `>>>` rules target `.gal_actions` scope, which is contained. Prior recon (08-04) fixed a related Bootstrap `.dropdown-menu { display: none }` conflict in ModelSelector by forcing `display: block` — same hazard class exists for this menu (base rule hides until `.show`; b-dropdown does add `.show` via its own JS, unlike ModelSelector's custom `v-if`).

## 2. Per-image action menu UX patterns across AI tools

| Tool | Display | Menu structure | Hover / selection |
|---|---|---|---|
| A1111 | Always-visible inline icon buttons | Flat row (Send to txt2img/img2img, Extra, Save) | Minimal hover; direct buttons |
| ComfyUI | Right-click context menu + floating preview toolbar | Context-menu driven | Minimalist preview modal |
| InvokeAI | **Hover-reveal overlay** | Floating icon toolbar on hover | Clean fade-in; metadata viewer |
| Midjourney web | Hover-reveal + persistent selection indicator | "More actions" (…) dropdown + quick icons (Upscale, Variation, Download) | Checkbox selection mode for batch ops |
| Krita AI Diffusion | Docked panels | Docker menu + context actions | Layer-based |

**Key takeaways:**
- Always-visible icon buttons clutter dense grids; **hover-reveal** keeps galleries clean (but hurts discoverability/touch — trade-off).
- Best-of-both: persistent direct icons for frequent actions + three-dot dropdown for secondary/destructive.
- **Multi-select / selection mode** is a major missing capability in the current single-action-per-image menu (Midjourney/A1111 both support batch ops).
- Metadata viewer (InvokeAI) — the app has params per image; a "view/copy params" action exists but no dedicated metadata popover.

## 3. Lightbox design patterns

- Zoom: smooth wheel-zoom anchored at cursor (`transform-origin` / cursor-anchored math) + drag-pan when zoomed; double-click toggles 100% / fit. Working tree `utils.js` implements cursor-anchored wheel zoom, drag-pan, `0` reset, `+`/`−` — **missing double-click toggle and spacebar**.
- Keyboard: Esc close, ←/→ nav, **Space** toggle zoom/slideshow, **Cmd/Ctrl+S** quick save. Working tree: Esc, ←/→ (RTL-aware), `0`, `+`/`−`. Missing Space and Cmd/Ctrl+S.
- Toolbar conventions: Zoom in/out, Reset, Open in external viewer, Save As, Copy to clipboard, Close. Working tree has zoom −/+/1:1, Open, Save, counter, caption — **missing Copy-to-clipboard** in lightbox (app has `copy_to_clipboard` IPC).

## 4. CSS engineering (Chromium/Electron)

- **backdrop-filter paint bug**: confirmed class of Chromium compositor issues (issue 40175472) — backdrop-filter elements can drop from paint while a sibling runs a GPU transform animation. The working tree's decision to avoid `backdrop-filter` on the actions toggle (comment at `GalleryImage.vue:310-311`) matches known Chromium behavior. Mitigations when needed: `will-change: backdrop-filter` or isolating stacking contexts.
- **`isolation: isolate`**: forces a new stacking context without layout change — the working tree uses it on `.gal_media` to trap the zooming `<img>`'s stacking context so it can't paint above the actions button. Correct and cheap.
- **Safe hover zoom**: wrap in `overflow: hidden` + border-radius container, transform on the `<img>` itself with `will-change: transform`, `object-fit: cover`. The working tree's `.gal_main_img` approach matches; could add `will-change: transform`.

## Sources
1. https://bootstrap-vue.org/docs/components/dropdown/ — boundary, right, menu-class props
2. https://developer.mozilla.org/en-US/docs/Web/CSS/isolation — stacking contexts
3. https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter — backdrop roots
4. https://issues.chromium.org/40175472 — backdrop-filter blur dropping during animation
5. https://github.com/bootstrap-vue/bootstrap-vue/issues/4941 — boundary/clipping in scrollable wrappers
