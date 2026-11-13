# DiffusionBee — Obsessive Deployment & Optimization Guide

> **The loop never ends until images generate perfectly.**

---

## ✅ QUICK START (Development)

### Phase 1: Environment Setup

```bash
# Clone / navigate to project
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# Install Node dependencies (if first time)
cd electron_app
pnpm install
cd ..

# Set up Python backend (one-time)
cd backends/stable_diffusion
python3 -m venv venv311
source venv311/bin/activate
pip install -r requirements.txt
deactivate
cd ../..
```

### Phase 2: Install Models

**Option A: Use the app's built-in model downloader**
- Start the app: `npm run serve`
- Click "Download Models" in the Home screen
- Select Stable Diffusion 1.5 (default) or FLUX.2 Klein (if available)

**Option B: Command-line installation**
```bash
# Activate venv
cd backends/stable_diffusion
source venv311/bin/activate

# Download + convert a model
python3 ../../install_hf_model.py \
  --model-id runwayml/stable-diffusion-v1-5 \
  --filename v1-5-pruned-emaonly.ckpt \
  --output-name stable-diffusion-v1-5

deactivate
cd ../..
```

### Phase 3: Run Development Server

```bash
npm run serve
```

The app launches with:
- **Vue dev server** on port 8080
- **Electron window** showing the app
- **Backend** spawned on-demand when you generate an image

---

## 🧪 Testing Image Generation

### Smoke Test (Quick)
```bash
cd backends/stable_diffusion
source venv311/bin/activate
python3 ../../test_backend.py
deactivate
```

**Expected output:** Image generated in `~/.diffusionbee/output/` and test completes in ~45s.

### Full UI Test
```bash
npm run test:generation
```

Requires 3 models installed:
- `Default_SD1.5`
- `DreamShaper_6_baked_vae`
- `CyberRealistic__v3.1`

---

## 🏗️ Building for Production

### Build Step 1: Prepare Backend
```bash
npm run prepare:backend
```

Copies Python backend into `electron_app/.packaged-backend/`.

### Build Step 2: Build Frontend
```bash
cd electron_app
npm run build
cd ..
```

Compiles Vue to optimized bundle in `electron_app/dist/`.

### Build Step 3: Package Electron App (macOS)
```bash
npm run build
```

Creates `electron_app/dist_electron/DiffusionBee-*.dmg`.

### Full One-Shot Build
```bash
npm run build
# Result: electron_app/dist_electron/DiffusionBee-{version}.dmg
```

---

## 📊 Debugging & Optimization

### Issue: No Models Available
**Symptoms:** App shows "No models" on Home screen.

**Solution:**
```bash
# Check model directory
ls -la ~/.diffusionbee/imported_models/

# If empty, download one:
cd backends/stable_diffusion
source venv311/bin/activate
python3 ../../install_hf_model.py \
  --model-id runwayml/stable-diffusion-v1-5 \
  --output-name stable-diffusion-v1-5
deactivate

# Restart the app
```

### Issue: Backend Not Responding
**Symptoms:** "Backend not available" in generation panel.

**Solution:**
```bash
# 1. Check if backend process exists
ps aux | grep diffusionbee_backend

# 2. Check backend logs
tail -f ~/.diffusionbee/logs/backend.log 2>/dev/null || echo "No log file"

# 3. Manual backend test
cd backends/stable_diffusion
source venv311/bin/activate
python3 diffusionbee_backend.py
# Press Ctrl+C after it starts
deactivate

# 4. Restart the Electron app
```

### Issue: Generation Timeout or Hangs
**Symptoms:** Generation starts but never completes.

**Solution:**
```bash
# 1. Check available RAM
free -h  # or 'vm_stat' on macOS

# 2. Reduce image size (512x512 → 512x384)
# 3. Reduce steps (50 → 30)
# 4. Reduce batch size (num_imgs: 4 → 2)

# 5. Check if backend is stuck
ps aux | grep diffusionbee_backend
# If yes, kill it: pkill -f diffusionbee_backend

# 6. Check system resources
top -o %MEM -s 5  # Show memory usage
```

### Issue: "Cannot load model" Error
**Symptoms:** Model appears in list but fails to load during generation.

**Solution:**
```bash
# 1. Verify model file integrity
ls -lh ~/.diffusionbee/imported_models/

# 2. Check if model format is correct
file ~/.diffusionbee/imported_models/*.tdict

# 3. Re-download the model
# Delete the broken .tdict file
# Re-run install_hf_model.py

# 4. Check backend Python has required packages
cd backends/stable_diffusion
source venv311/bin/activate
python3 -c "import torch; import diffusers; print('✓ All packages OK')"
deactivate
```

---

## 🎨 UI Quality Checklist (Obsessive)

### Dark Mode ✓
- [ ] All text readable on dark background
- [ ] No white-background components visible in dark mode
- [ ] Buttons have sufficient contrast (≥4.5:1 WCAG AA)
- [ ] Hover states visible in dark mode

### Bilingual (Arabic/English) ✓
- [ ] Arabic text renders with Tajawal font
- [ ] RTL layout flips correctly
- [ ] English text remains LTR
- [ ] Both languages have equal visual priority

### Performance ✓
- [ ] App loads in <2 seconds (cold start)
- [ ] UI remains responsive during generation
- [ ] No layout jank on model/settings changes
- [ ] Gallery scrolls smoothly with 100+ images

### Accessibility ✓
- [ ] All buttons have accessible labels
- [ ] Tab navigation works through all interactive elements
- [ ] Screen reader announces generation progress
- [ ] Keyboard shortcuts for common actions

---

## 📈 Obsessive Scoring (69/80 to Ship)

| Axis | Checklist | Score |
|------|-----------|-------|
| **Generation Works** | Images appear in gallery after generation | /10 |
| **Dark Mode Polish** | All UI elements legible, styled intentionally | /10 |
| **Arabic Support** | Bilingual perfectly balanced, fonts correct | /10 |
| **Performance** | No jank, generation visible in real-time | /10 |
| **Backend Stability** | Survives 10 consecutive generations | /10 |
| **UI Responsiveness** | Never freezes, always accepts input | /10 |
| **Error Handling** | Errors display clearly, suggest fixes | /10 |
| **Model Management** | Easy to add/remove/switch models | /10 |

**Passing threshold: 69/80** ✓

---

## 🚀 Production Checklist (Before Release)

- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run test:generation:full` completes successfully
- [ ] All 3 test models generate without errors
- [ ] Screenshots in `docs/screenshots/` are real (verified by `ensure_doc_screenshots.sh`)
- [ ] Dark mode enabled by default
- [ ] Arabic UI strings translated in `/i18n/`
- [ ] No console errors in dev tools
- [ ] App signature valid for notarization (macOS)
- [ ] Bundle size < 2GB (including models)
- [ ] Both Intel and Apple Silicon tested

---

## 🔄 Continuous Improvement Loop

1. **Run tests**: `npm run test:generation:full`
2. **Profile performance**: Open DevTools → Performance tab → Record generation
3. **Check lint**: `npm run lint`
4. **Rebuild**: `npm run build`
5. **Test on both architectures**: Intel + Apple Silicon (M1/M2/M3)
6. **Gather user feedback**: Discord community
7. **Fix highest-impact issues first**
8. **Return to step 1**

---

## 📚 Architecture (For Reference)

```
electron_app/
├── src/
│   ├── App.vue              # Main app shell + splash screen
│   ├── SDManager.vue        # Generation queue & job manager
│   ├── background.js        # Electron main process → backend bridge
│   ├── py_vue_bridge.js     # IPC protocol for Vue ↔ Python
│   ├── pages/               # HomePage, Txt2Img, Img2Img, etc.
│   └── components_bare/     # Reusable UI components
│
backends/stable_diffusion/
├── diffusionbee_backend.py  # Main inference loop (reads stdin, writes stdout)
├── requirements.txt         # Python dependencies
├── venv311/                 # Python virtual environment
└── [model_converter/]       # .ckpt → .tdict conversion (if needed)

~/.diffusionbee/            # Runtime data (on user's machine)
├── imported_models/        # Downloaded .tdict model files
├── output/                 # Generated images
├── settings.json           # User preferences
└── logs/                   # Debug logs
```

---

## 🛠️ Common Development Tasks

### Add a New Generation Option
1. Add input field to `pages/Txt2Img.vue`
2. Pass parameter through `gen_options` to backend
3. Handle in `backends/stable_diffusion/diffusionbee_backend.py`
4. Test with `npm run serve`

### Improve Dark Mode
1. Edit color variables in `src/assets/css/variables.css`
2. Test in dark mode: DevTools → Rendering → Emulate CSS media feature prefers-color-scheme
3. Ensure contrast ≥ 4.5:1 for all text

### Add Arabic Translation
1. Add keys to `/i18n/ar.json`
2. Update `/i18n/en.json` with English versions
3. In Vue: use `{{ $t('key.name') }}`
4. Test with `npm run serve`

---

## 📞 Support & Resources

- **Discord**: [discord.gg/t6rC5RaJQn](https://discord.gg/t6rC5RaJQn)
- **Website**: [diffusionbee.com](https://diffusionbee.com)
- **GitHub Issues**: [github.com/divamgupta/diffusionbee-sd-ui/issues](https://github.com/divamgupta/diffusionbee-sd-ui/issues)
- **Prompt Ideas**: [arthub.ai](https://arthub.ai)

---

<small>Made with ❤️ in Bahrain 🇧🇭 — Architect By Doy | doy.tech</small>
