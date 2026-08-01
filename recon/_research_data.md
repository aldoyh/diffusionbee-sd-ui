# Combined Research Data for Synthesizer

## ROUND 1 FINDINGS

### R1-Explorer: AI Image Generation UI/UX Trends (2025-2026)
- Two dominant paradigms: "Request Lines" (Midjourney low-UI conversational) vs "Assembly Lines" (ComfyUI node-based glass-box)
- Progressive rendering: showing image emerge from noise provides tactile feedback
- Prompt engineering via LLM integration (expand vague prompts automatically)
- Intent-driven model filtering (choose by style, not model name)
- "Golden PNG" reproducibility — every generated image saves full parameter metadata
- Self-correcting loops: VLM "sees" output and re-prompts to fix errors
- Fail-state design: clearly communicate *why* AI failed (uncertainty, content policy, hardware limits)
- Progressive disclosure: surface technical complexity only when requested
- Social learning: community feed to inspire (balanced with privacy)

### R1-Associator: Onboarding & Model Download Best Practices
- Progressive download: minimal core first, curated models offered later
- "Model Garden" or "Hub" view as first-class citizen of app
- Hardware-aware selection with badges (Recommended, Optimal, Compatible)
- Pre-installation system check (VRAM, RAM, GPU type)
- Dynamic configuration warnings before user finishes setup
- Detailed progress: MB/s, time remaining, granular stages
- Use download time productively (tutorials, quick-start prompts)
- Checkpoint resumability for downloads
- Specific copywriting about model capabilities, not generic promises
- "Recipes" or "Starter Projects" with pre-selected models

### R1-Critic: Generation Queue & Progress Patterns
- ComfyUI: live node highlighting, latent tensor preview flowing through edges
- Midjourney: progressive rendering from noise, early abort capability
- KREA: real-time canvas (non-blocking generation as dialogue)
- Queue management: cancel individual items, reorder, see queue depth
- Time estimates with actual iteration tracking (median iteration time)
- Generation transparency — show what's happening behind the scenes
- Batch progress visualization (e.g., "Batch 3 of 4")

### R1-Synthesizer: Model Management UX Patterns
- A1111/Forge: form-based model selector dropdown with lazy load
- ComfyUI: modular model loaders (wire different models into workflow)
- Civitai: rich metadata cards with architecture, recommended settings
- Model comparison: split-screen, A/B comparison sliders, comparison matrix
- Hardware compatibility warnings and predictive VRAM requirements
- Resource forecasting before model load
- LoRA management: drag-and-drop nodes, library popup with search
- Filtered faceting in catalog browsing
- Version pinning with constant seed for model comparison

## ROUND 2 FINDINGS

### R2-UI-Design: Dark Mode Patterns for Creative Desktop Apps
- Sidebar: collapsible to icon-only rail (48-60px), glass-morphism with backdrop-filter
- Prompt input: auto-expanding textarea, character/token count, suggestion chips
- Settings: accordion sections with summary text, thinline sliders with brand color
- Gallery: uniform grids for asset management, masonry for exploration
- Hover overlays with quick actions (Edit, Export, Delete) at 0.8 opacity
- Progress: integrated slim top-border bars, pulsing border effects on cards
- Status: semantic colors desaturated ~20%, color+icon pairings
- Elevation: tonal layering (lighter greys) rather than shadows (invisible on black)
- Surface: #121212 base (never #000000), off-white text (~87% opacity)

### R2-Vue-Patterns: Vue 2.7 + Electron Best Practices
- Feature-first organization: group by domain, not file type
- PagesRouter: simple state-based switcher with store for currentPage
- Provide/Inject preferred over Event Bus for deep component communication
- Clean up Event Bus listeners in beforeDestroy to prevent memory leaks
- Scoped styles in SFCs, CSS Modules for complex reuse
- Manual lazy-loading via dynamic import() for heavy components
- Loading/error/delay/timeout states for lazy-loaded components
- String-based component registration to avoid Webpack circular deps

### R2-Generation-UX: Making Generation Feel Fast
- Optimistic UI: immediately transition button states on click
- Interstitial feedback: spinners, skeleton loaders, progress percentages
- Pre-emptive loading: monitor intent cues (hover detection)
- Incremental streaming: show output as generated ("typewriter" effect)
- Task-centric queues: persistent side-panel showing pending/processing/completed/failed
- Batch overview: stop, pause, reorder priority
- Parameter persistence: auto-save every generation's recipe
- Metadata-connected history: "Load Parameters" button on historical images
- Preset management: User Presets vs System Presets with library UI
- Keyboard shortcuts: standard modifiers + discoverability in tooltips
- Linear undo stack (not branching): revert parameters + output step by step
- Granular reversibility: undo tweaks one by one through history
