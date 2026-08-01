# Context Brief: DiffusionBee UI, Generation Process & Onboarding/Model Selection Overhaul

## Project Overview
DiffusionBee is a **Stable Diffusion GUI app** that runs locally (macOS + Windows installer). Architecture:
- **Frontend**: Vue 2.7 (Electron) + custom CSS (no component framework)
- **Backend**: Python Stable Diffusion (TensorFlow) communicating via stdin/stdout JSON protocol
- **Primary UI file**: `electron_app/src/App.vue` (~800+ lines, does everything: shell, onboarding, model setup)
- **Design System**: `docs/design_system.md` (CSS custom properties, 8px base, dark/light themes, Inter font + Tajawal for Arabic)
- **Mockup**: `docs/design/inspiration-hub-mockup.html` (new design vision)
- **Standalone Demo**: `ai-image-studio.html` (browser-only UI with better visual design)

## Key Files

| File | Purpose |
|------|---------|
| `electron_app/src/App.vue` | Main app: shell, splash screen, model setup dialog, routing |
| `electron_app/src/StableDiffusion.vue` | Generation state machine (text_to_img, progress tracking, callbacks) |
| `electron_app/src/AssetsManager.vue` | Model download/management, disk scanning |
| `electron_app/src/SDManager.vue` | Queue management for generation jobs |
| `electron_app/src/py_vue_bridge.js` | IPC bridge (send_to_py, bind_app_component) |
| `electron_app/src/seed_bundled_models.js` | Bundled model seeding from installer |
| `ai-image-studio.html` | Standalone browser-only demo with modern indigo theme |
| `backends/stable_diffusion/diffusionbee_backend.py` | Python backend entry point |
| `backends/stable_diffusion/stable_diffusion/sd_run.py` | Generation run configuration dataclass |
| `backends/stable_diffusion/stable_diffusion/stable_diffusion.py` | Core SD engine |
| `backends/stable_diffusion/stable_diffusion/utils/model_interface.py` | Model weight loading |
| `scripts/setup_models.py` | Model setup/download orchestration |
| `scripts/bundle_default_models.js` | Bundled default model management |
| `install_hf_model.py` | HuggingFace model download/install |
| `docs/design_system.md` | Complete design token system |
| `docs/design/inspiration-hub-mockup.html` | New design mockup |

## Current UI Structure

**Sidebar**: Logo → Nav (Dashboard, Generate, Gallery, Models, Styles, Settings) → User profile
**Generate Page**: Prompt textarea → Quick prompt chips → Settings panel (model selector, sampling, resolution, advanced toggles, negative prompt) → Stats cards → Gallery grid → Load More → Active generation progress card
**Onboarding**: Full-screen modal with blur backdrop → Welcome header → Model card → Download progress → Success state → Optional additional downloads → Skip → Attribution footer

## Generation Process Flow
1. User enters prompt → adjusts settings → clicks Generate
2. `StableDiffusion.text_to_img()` sets callbacks → sends JSON via stdin to Python
3. Backend runs SD inference → sends progress updates ("sdbk dnpr <progress%>") 
4. Completed images returned ("sdbk nwim <json>") → notification sound plays
5. LoaderModal shows with progress bar, step counter (e.g., "Step 17 of 35"), ETA
6. SDManager manages a queue for batch generation

## Onboarding/Model Download Flow
1. App starts → `mounted()` → seeds bundled models → `check_and_prompt_model_download()`
2. If no models → `fetch_models_list()` → fetches from `https://models.diffusionbee.com/list_models`
3. `pickOptimalOnboardingModel()` selects best model for user's machine profile
4. Dialog shows model card → user clicks "Download & Get Started"
5. `AssetsManager.download_asset()` uses Electron IPC download → progress polling every 300ms
6. On completion → optional downloads offered (DreamShaper, CyberRealistic, Juggernaut XL, FLUX.2 Klein 4B)
7. User clicks "OPEN App" → dismisses, enters main UI

## Known Issues & Opportunities

### UI Issues
1. Actual Vue app has older visual design; `ai-image-studio.html` has much better modern design
2. Design system defines light mode but not implemented in app
3. Generation progress is a blocking modal — no inline progress
4. No generation history visible alongside the generation process
5. Sidebar uses legacy CSS class names, not design system tokens
6. No proper responsive behavior for mobile/tablet
7. The app uses hardcoded dark theme values instead of CSS variables
8. No keyboard shortcuts / power-user features
9. Filter/sort for gallery is mocked but not functional
10. Arabic/RTL support exists but needs more polish

### Generation Process Issues
1. Blocking modal experience — can't browse history or tweak settings during generation
2. No real-time latent preview / streaming of intermediate results
3. Queue is opaque to users (SDManager tracks it but no UI visualization)
4. No prompt history / re-use without navigating away
5. No way to cancel individual jobs in a batch
6. No "reuse parameters" / "save as preset" feature
7. No style mixing / prompt blending
8. Seed management is basic (input field + randomize button)
9. No comparison view (A/B test different seeds/params)

### Onboarding/Model Selection Issues
1. Dialog is a standard modal — could be a full-page immersive experience
2. Optional downloads UI is cramped inside the setup dialog
3. No visual model comparison (example outputs per model)
4. No hardware compatibility warnings are shown to the user (only in console.log)
5. No download ETA / speed information
6. No cancel for individual optional downloads
7. Model selector in settings is just a plain `<select>` dropdown
8. No search/filter/browse for models in the Models page
9. No way to see model details (architecture, recommended settings, sample gallery)
10. No automatic model update notifications
11. Model download progress uses polling (every 300ms) — not event-driven

## Design System (from docs/design_system.md)
- **Colors**: Dark mode (#0a0a0a bg, #141414 elevated, #3E7BFA primary, #6c5ce7 secondary)
- **Typography**: Inter font family, scale from 11px to 28px
- **Spacing**: 8px base unit (4 to 64px)
- **Components**: Buttons (primary/secondary/ghost/destructive), Form inputs, Cards, Navigation, Modals, Toasts, Progress, Dropdowns
- **Accessibility**: WCAG AA contrast, keyboard nav, reduced motion, RTL support
- **Responsive**: Breakpoints at 480/768/1024/1280px

## Current Gaps
- The design system document is comprehensive but NOT fully implemented in the Vue app
- The `ai-image-studio.html` mockup demonstrates some design system principles but is standalone
- The `inspiration-hub-mockup.html` shows a different design direction (side-by-side layout)
- No unified design system CSS file is actually imported in the app (App.vue imports `theme.css` from assets)
- Generation and model management are tightly coupled in App.vue (monolithic component)

## Primary Source URLs
- https://models.diffusionbee.com/list_models (model catalog API)
- https://diffusionbee.com (product website)
- https://huggingface.co (model source)
- https://github.com/divamgupta/diffusionbee-stable-diffusion-ui (source repo)
