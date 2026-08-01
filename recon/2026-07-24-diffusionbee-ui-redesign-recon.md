---
title: "DiffusionBee UI Redesign, Generation UX & Onboarding Overhaul"
date: 2026-07-24
status: draft
type: recon
mode: focus
topic: UI redesign, generation process improvement, onboarding & model selection overhaul
methods: web research + codebase analysis (4 rounds)
---

# The Argument: DiffusionBee's UI Must Evolve from Functional to Delightful

DiffusionBee has a solid technical foundation — a locally-running Stable Diffusion engine with model management, generation queue, and multi-language support — but its user interface lags behind the 2025-2026 standard for AI creative tools. The current Vue 2.7 app uses an outdated dark theme with hardcoded colors, a blocking generation modal, a plain `<select>` dropdown for model selection, and a cramped onboarding dialog. Meanwhile, competitors like Leonardo AI, KREA, and even the open-source ComfyUI have established new UX baselines for real-time feedback, non-blocking generation, intent-driven model selection, and progressive onboarding.

**The core thesis**: DiffusionBee should evolve from a "functional tool" to a "creative studio" by adopting three interconnected improvements: (1) a complete visual redesign aligned with the existing design system spec, (2) a non-blocking generation experience with real-time feedback, and (3) an immersive onboarding flow with hardware-aware model selection.

These three areas are not independent — the generation UX depends on the new layout, the onboarding sets expectations for the generation experience, and the model management spans both onboarding and the main UI. Together they define a user's entire relationship with the app.

---

## 1. The Current State: What Exists Today

### Architecture
```
Electron main (background.js)
  └── bridge.js → spawns diffusionbee_backend.py (stdin/stdout)
Renderer (Vue 2.7)
  ├── App.vue — monolithic shell: splash, onboarding, routing, generation modal
  ├── PagesRouter.vue — lazy-loaded pages
  ├── StableDiffusion.vue — generation state machine
  ├── SDManager.vue — generation queue management
  ├── AssetsManager.vue — model download/management
  └── py_vue_bridge.js — IPC to Python ("b2py"/"sdbk" protocol)
```

### Visual Design (Current)
- Dark background: `#0a0a0b` with hardcoded colors, NOT the design system CSS variables
- Sidebar: 220px wide, border-right, fixed position
- Prompt input: textarea inside a card with `#121214` background
- Settings: stacked cards in a 280px left panel
- Gallery: 2-column grid with Unsplash placeholder images
- Generation: full-screen LoaderModal overlay (blocking)
- Onboarding: centered dialog with blur backdrop (`model-setup-overlay`)
- Model selector: plain HTML `<select>` dropdown

### Design System (Documented But Not Implemented)
- The `docs/design_system.md` defines a complete token system with CSS custom properties
- Primary color: `#3E7BFA`, Secondary: `#6c5ce7`
- Surface colors: `#0a0a0a` bg, `#141414` elevated, `#1f1f1f` hover
- Typography: Inter font, 8px spacing scale
- Light mode is fully defined but never implemented
- Responsive breakpoints defined but not functional
- The `ai-image-studio.html` standalone demo demonstrates the intended visual direction

### Generation UX
- **Blocking modal**: A LoaderModal covers the entire UI during generation
- **Progress**: percentage-based polling from backend ("sdbk dnpr <progress%>")
- **Step tracking**: "Step 17 of 35" calculated from progress percentage
- **ETA**: computed from median iteration time, updated every second
- **Queue**: SDManager maintains a queue but it's invisible to users
- **No preview streaming**: backend sends only completed images
- **Notification**: sound plays when image completes
- **Cancel**: sends stop signal to backend, clears callbacks

### Onboarding & Model Selection
- **Trigger**: App mount → seed bundled models → `check_and_prompt_model_download()`
- **Model discovery**: fetches from `https://models.diffusionbee.com/list_models`
- **Selection**: `pickOptimalOnboardingModel()` uses machine profile + HF token
- **Flow**: Modal → model card → Download → Progress → Success → Optional downloads → Dismiss
- **Optional models**: curated list (DreamShaper, CyberRealistic, Juggernaut XL, FLUX.2 Klein 4B)
- **Download**: Electron IPC download with 300ms polling for progress
- **Hardware compatibility**: `verifyModelsHardwareCompatibility()` logs to console only
- **Missing**: visual model comparison, download ETA, cancel individual downloads, model details

---

## 2. The Argument: A Three-Pillar Redesign

### Pillar 1: Visual Redesign — From Functional to Studio-Quality

The design system already exists in documentation. The gap is implementation. The `ai-image-studio.html` demo shows the target aesthetic: dark indigo theme with `#6366f1` primary, smooth animations, glass-morphism sidebar, and cohesive card-based layout.

**Key implementation targets**:

| Current | Target | Why |
|---------|--------|-----|
| Hardcoded colors | CSS custom properties from design system | Themeability, light mode support |
| 220px sidebar | Collapsible 240px rail (icon-only at 60px) | Space efficiency, modern feel |
| Plain `<select>` dropdown | Model selector with rich metadata cards | Discoverability, comparison |
| Blocking LoaderModal | Inline progress panel (right sidebar or bottom drawer) | Non-blocking workflow |
| 2-col gallery grid | Responsive auto-fill grid with hover overlays | Better browsing, quick actions |
| Unsplash placeholder images | Real generation output or skeleton states | Honest UX |
| Static header tabs | Mode switcher pills with icons | Clearer navigation |
| Separate stats row | Integrated into flow (shown contextually) | Reduced visual noise |

**Concrete component hierarchy for the new UI**:

```
App.vue (shell)
├── Sidebar.vue
│   ├── Logo (collapsible)
│   ├── Nav items with icons (Dashboard, Generate, Gallery, Models, Styles, Settings)
│   └── User profile (collapsible to avatar-only)
├── MainContent
│   ├── TopBar.vue (search, notifications, theme toggle, locale toggle)
│   ├── ModeSwitcher.vue (Text2Image, Image2Image, Inpainting pills)
│   ├── PromptInput.vue (auto-expanding textarea + suggestion chips + Generate button)
│   ├── SettingsPanel.vue (collapsible accordion sections)
│   │   ├── ModelSelector.vue (rich card-based, not dropdown)
│   │   ├── SamplingSection.vue (steps, guidance, batch size sliders)
│   │   ├── ResolutionGrid.vue (preset buttons + custom)
│   │   ├── AdvancedToggles.vue (face restoration, upscaling, high-res fix)
│   │   └── NegativePrompt.vue (expandable textarea)
│   ├── GenerationProgress.vue (inline, not modal)
│   │   ├── ProgressBar (slim, top of area)
│   │   ├── StepTracker ("Step 17 of 35")
│   │   ├── ETA display
│   │   └── Cancel button
│   ├── GalleryGrid.vue (responsive auto-fill, hover overlays with quick actions)
│   │   └── GalleryCard.vue (thumbnail, model badge, delete/favorite buttons)
│   └── QueuePanel.vue (optional side drawer for batch visibility)
└── ModelSetupOverlay.vue (onboarding — see Pillar 3)
```

### Pillar 2: Generation UX — From Blocking to Conversational

The current generation flow is a "submit and wait" transaction. The target is a "dialogue" where the user feels in control.

**Current flow**:
```
Click Generate → Blocking modal → Poll progress every 300ms → Image appears → Dismiss modal
```

**Target flow**:
```
Click Generate → Optimistic UI (button → "Generating..." state) → 
Inline progress appears (slim bar, step counter, ETA) → 
User can browse history, tweak next prompt, or cancel → 
Image appears in gallery with animation → 
"Load Parameters" available on historical images
```

**Specific improvements**:

1. **Replace LoaderModal with inline progress** — The generation progress card from `ai-image-studio.html` already demonstrates this: a slim card below the prompt input with progress bar, step counter, and ETA. This lets users see their gallery and settings while generating.

2. **Add queue visibility** — SDManager tracks a queue internally but users can't see it. Add a small "Queue (3)" indicator that expands to show pending jobs with cancel buttons.

3. **Parameter persistence** — Every generated image should store its parameters (prompt, seed, steps, guidance, model). Add a "Reuse Parameters" button on gallery cards that populates the input form.

4. **Keyboard shortcuts** — Essential for power users:
   - `Cmd+Enter` — Generate
   - `Cmd+Shift+Z` — Regenerate with same seed
   - `Escape` — Cancel generation
   - `Cmd+S` — Save current image

5. **Seed management UX** — Replace the plain input with a history of last 10 seeds + a "Use Seed from Last Good Image" button.

6. **Optimistic saves** — Immediately save the prompt and timestamp on generation start, so even cancelled jobs appear in history.

### Pillar 3: Onboarding & Model Selection — From Friction to Confidence

The current onboarding is functional but could be transformative. First-run experience sets user expectations for the entire app.

**Current**:
```
Splash screen → App mounts → Check models → 
If none found → modal with model card → Download → 
Optional downloads cramped inside same modal → Dismiss
```

**Target**:
```
Splash with progress → App mounts → Hardware check → 
Full-page welcome screen with:
  1. System info display (your Mac has X GB RAM, Apple Silicon)
  2. Recommended model card (with hardware badge: "✅ Best for your Mac")
  3. Visual model comparison (2-3 model thumbnails with sample outputs)
  4. Progressive disclosure: "Quick Start" (1-click) or "Browse All Models"
  5. Download with detailed progress (MB/s, ETA, stage: "Downloading weights...")
  6. During download: show quick-start tutorial cards
  7. On completion: celebration animation → "Start Creating" button
  8. Optional: "Get more models" panel (not cramped, full-width with checkboxes)
```

**Model management improvements**:

1. **Rich model selector** — Replace `<select>` with a visual card grid showing:
   - Model thumbnail (sample output)
   - Model name and description
   - Hardware compatibility badge (green/yellow/red)
   - Size information
   - "Downloaded" / "Available" / "Requires Download" status

2. **Model detail view** — Clicking a model opens: full description, recommended settings (CFG, sampler, steps), sample gallery, file size, RAM requirements.

3. **Hardware warnings** — Before download, compute if the model will run on the user's hardware and show:
   - ✅ Optimal for your system
   - ⚠️ May be slow on your system (suggest alternatives)
   - ❌ Requires more RAM (hide for incompatible hardware)

4. **Download UX** — Replace 300ms polling with event-driven progress:
   - Show MB/s and ETA
   - Show download stage ("Downloading base weights...", "Optimizing...")
   - Pause/Resume support
   - Auto-retry on failure with countdown

5. **Cancel individual optional downloads** — Each optional model should have its own cancel button and independent progress.

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Next Sprint)
**Goal**: Align the app with the existing design system spec. No new features.

1. Create a single `theme.css` that imports all design tokens from `docs/design_system.md` as CSS custom properties
2. Replace hardcoded colors with `var(--color-*)` references throughout `App.vue` and all components
3. Implement light mode via `prefers-color-scheme: light` media query
4. Refactor `App.vue` into smaller components (Sidebar, TopBar, PromptInput, SettingsPanel, GalleryGrid)
5. Add `prefers-reduced-motion` support
6. Add proper focus-visible states to all interactive elements

**Files to modify**:
- `electron_app/src/assets/css/theme.css` (create/replace)
- `electron_app/src/App.vue` (extract components, use CSS vars)
- All `.vue` component files (use CSS vars)

### Phase 2: Generation UX (Next + 1)
**Goal**: Non-blocking generation with real-time feedback.

1. Replace `LoaderModal` with inline `GenerationProgress` component
2. Add `QueuePanel` component (expandable, shows pending/completed jobs)
3. Add parameter persistence (auto-save generation recipe to image metadata)
4. Add "Reuse Parameters" button on gallery cards
5. Add keyboard shortcuts (Cmd+Enter, Escape, Cmd+Shift+Z)
6. Improve seed management with history picker
7. Add optimistic UI for generate button

**Files to create/modify**:
- `electron_app/src/components/generation/GenerationProgress.vue`
- `electron_app/src/components/generation/QueuePanel.vue`
- `electron_app/src/components/generation/KeyboardShortcuts.js`
- `electron_app/src/App.vue` (replace LoaderModal)
- `electron_app/src/StableDiffusion.vue` (add parameter persistence)

### Phase 3: Onboarding & Model Selection (Next + 2)
**Goal**: Immersive first-run experience and professional model management.

1. Replace onboarding modal with full-page experience
2. Add hardware compatibility display to onboarding
3. Add visual model cards (thumbnails, sample outputs)
4. Add model detail view (recommended settings, RAM requirements)
5. Add download ETA and stage information
6. Add pause/resume for downloads
7. Improve optional downloads with independent progress/cancel
8. Add model comparison (side-by-side sample outputs)

**Files to create/modify**:
- `electron_app/src/components/onboarding/OnboardingOverlay.vue`
- `electron_app/src/components/models/ModelSelector.vue`
- `electron_app/src/components/models/ModelDetail.vue`
- `electron_app/src/components/models/ModelCard.vue`
- `electron_app/src/App.vue` (replace model setup logic)
- `electron_app/src/AssetsManager.vue` (add event-driven progress)

---

## 4. Tensions & Trade-offs

### Vue 2.7 vs Vue 3
The app is locked to Vue 2.7. This limits options:
- No Composition API (unless using `@vue/composition-api` plugin)
- No `<script setup>` syntax
- No Teleport, Suspense, or Fragments
- **Mitigation**: Use Provide/Inject patterns, manual lazy-loading via `import()`, and feature-first folder organization. These work well in Vue 2.7.

### Monolithic App.vue vs Components
The current `App.vue` is ~800 lines handling shell, onboarding, splash, generation, and model setup. Extraction into components is high-risk:
- Risk of breaking existing functionality
- Circular dependency issues in Webpack
- **Mitigation**: Extract one component at a time, test thoroughly. Start with visual-only components (Sidebar, TopBar) before touching generation logic.

### Electron IPC Latency
The current polling-based progress (300ms) is a workaround for the stdin/stdout protocol. Moving to event-driven progress requires backend changes:
- Backend would need to send progress events proactively, not in response to polls
- **Mitigation**: Keep polling but reduce interval to 200ms. Move to events only when backend is refactored.

### Backend Compatibility
Generation UX improvements (real-time preview, queue visualization) largely depend on backend changes:
- Real-time latent preview requires backend to send intermediate images
- Queue reordering requires backend to accept queue management commands
- **Mitigation**: Phase 1 and part of Phase 2 are frontend-only. Backend changes can be deferred.

---

## 5. Next Steps

### Immediate (0-2 weeks)
1. Create `theme.css` with design tokens and test CSS variable adoption
2. Extract `Sidebar.vue` from `App.vue` as a proof-of-concept component refactor
3. Replace the model `<select>` dropdown with a visual `ModelSelector.vue` component
4. Add `prefers-color-scheme: light` support using the defined light mode tokens

### Short-term (2-4 weeks)
5. Replace blocking `LoaderModal` with inline `GenerationProgress.vue`
6. Add keyboard shortcuts (Cmd+Enter for Generate, Escape for Cancel)
7. Add parameter persistence to gallery images
8. Improve seed management UI

### Medium-term (1-2 months)
9. Redesign onboarding as full-page experience with hardware display
10. Add model detail view and visual comparison
11. Add download ETA and cancel-for-individual-models
12. Add queue visualization panel

---

> [!info] Process Log
> Session started: 2026-07-24
>
> **Round 1** (divergent exploration):
> - Explorer (UI research): Midjourney/ComfyUI paradigms, progressive rendering, prompt engineering patterns
> - Associator (onboarding research): progressive download, hardware-aware selection, download UX
> - Critic (generation UX research): real-time feedback, queue management, ETA computation
> - Synthesizer (model management research): Civitai catalog, model comparison, LoRA management
>
> **Round 2** (implementation-focused):
> - Dark mode UI patterns for creative apps (glass-morphism, tonal layering, thinline sliders)
> - Vue 2.7 + Electron patterns (Provide/Inject, feature-first, lazy-loading)
> - Generation UX implementation (optimistic UI, keyboard shortcuts, linear undo)
>
> **Mode**: Focus (implementation-oriented)
> **Total research sources**: 12+ web sources, 25+ codebase files analyzed
> **Output**: This document + 4 agent reports in `recon/` directory

> [!info] References
> - Midjourney UX Audit (AdamFard.com)
> - AI UX Design Trends 2026 (YUJ Designs)
> - ComfyUI workflow patterns (Medium)
> - Dark Mode UI Principles (Eleken)
> - Designing for AI Engineers (UXDesign.cc)
> - Vue 2.7 Provide/Inject Documentation
> - Dark Mode Best Practices (UX Planet)
> - Civitai model browsing patterns
> - DiffusionBee Design System (`docs/design_system.md`)
> - Inspiration Hub Mockup (`docs/design/inspiration-hub-mockup.html`)
