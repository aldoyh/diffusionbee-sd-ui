# DiffusionBee Quality Gates — Jaw-Breaking Checklist

> **No merge, no ship, no demo until ALL boxes are ✅.**

---

## 🧠 The Obsessive Loop Philosophy

**Never ship code you wouldn't be proud to put in your portfolio.**

Every feature addition, UI change, or backend optimization must pass through this loop:
```
Research (what exists?) 
  → Design (what should it be?) 
  → Implementation (make it real) 
  → Critique (does it pass 69/80?)
```

If it fails, go back to Phase 3. **Loop until jaw-dropping quality.**

---

## ✅ GATE 1: Code Quality (Phase 2/3)

- [ ] **Linting passes with 0 warnings**
  ```bash
  cd electron_app && npm run lint
  # Exit code must be 0
  ```

- [ ] **No console errors in DevTools**
  - Open app in dev mode
  - Open DevTools (Cmd+Option+I)
  - Console tab shows 0 errors
  - Only warnings are acceptable (deprecations, etc.)

- [ ] **Vue templates are syntactically correct**
  - No invalid prop types
  - No undefined methods/computed properties
  - No missing event handlers

- [ ] **Python backend imports without errors**
  ```bash
  cd backends/stable_diffusion
  source venv311/bin/activate
  python3 -c "from diffusionbee_backend import *"
  # No import errors
  deactivate
  ```

- [ ] **Accessibility labels on all interactive elements**
  - Every button has aria-label or accessible text
  - Form inputs have labels
  - Images have alt text
  - Links have descriptive text (not "click here")

---

## 🎨 GATE 2: Dark Mode Obsession (Phase 2)

- [ ] **Dark mode is the PRIMARY mode**
  - Default theme is dark on app launch
  - All colors derive from dark base

- [ ] **Text contrast ≥ 4.5:1 (WCAG AA)**
  - Test with: WebAIM Contrast Checker
  - Headings, body text, buttons, links
  - Use inspector to verify final color

- [ ] **No white backgrounds anywhere**
  - Search codebase: `background.*white|background.*#fff|background.*#f\|background.*rgb(255`
  - All must be intentional (accents, not primary)

- [ ] **Hover states visible in dark mode**
  - All hoverable elements change on `:hover`
  - Change is visible against dark background (not just brightness diff)

- [ ] **Dark mode shadows intentional**
  - No drop shadows (that's web design)
  - Use blur/opacity layers for depth
  - Elevation shown via `BackdropFilter` + `opacity` (if Vue allows)

- [ ] **Theme switching works (if toggled)**
  - App remembers user's theme choice
  - Instant switch on toggle (no page reload)
  - Both modes fully functional

---

## 🌍 GATE 3: Bilingual Arabic/English (Phase 2)

- [ ] **Arabic font is Tajawal (Google Fonts)**
  - Imported correctly in CSS
  - Available weights: 200, 300, 400, 500, 700, 800, 900
  - Fallback to system fonts works

- [ ] **RTL layout flips correctly**
  - Arabic UI reads right-to-left
  - All margins/padding flip (start/end, not left/right)
  - Images, icons stay in correct positions

- [ ] **Text direction correct**
  - Arabic text: `dir="rtl"`
  - English text: `dir="ltr"`
  - Mixed text handled gracefully

- [ ] **All UI strings translated**
  - No hardcoded English text in Vue components
  - All strings use `$t('key.name')` or i18n function
  - Arabic translations exist for 100% of English strings

- [ ] **Tajawal renders beautifully**
  - No font sizing issues
  - Line-height proportional (1.6 for body, 1.4 for headings)
  - Letter-spacing adequate (Tajawal can get cramped)

- [ ] **Both languages have equal visual weight**
  - Neither language feels like a second-class translation
  - Both font sizes readable
  - Both button sizes adequate

- [ ] **Layout doesn't break in either language**
  - Longest English word + longest Arabic word both fit
  - Labels don't overflow into inputs
  - Buttons accommodate both languages

---

## ⚡ GATE 4: Performance (Phase 3/4)

- [ ] **App cold-start < 2 seconds**
  ```bash
  npm run serve
  # From app.vue mounted() to "Home screen visible" = < 2s
  ```

- [ ] **Zero jank during generation**
  - UI stays responsive while backend runs
  - Progress bar updates smoothly
  - Gallery doesn't freeze when adding new image

- [ ] **Memory usage < 2GB during single generation**
  - Monitor with: `Activity Monitor` or `top`
  - Generation of 512x512 should not spike > 2GB

- [ ] **No memory leaks after 10 consecutive generations**
  ```bash
  # Run: Generate → Save → Generate (repeat 10 times)
  # Memory should not climb linearly
  # Check: Activity Monitor → Memory tab
  ```

- [ ] **Bundle size acceptable**
  - Frontend bundle (electron_app/dist): < 5MB
  - App size with backend: < 500MB (excluding models)

- [ ] **No "jank" on model/preset switches**
  - Switching models: UI updates in < 200ms
  - Changing presets: Instant feedback

- [ ] **Animations are smooth (60 FPS minimum)**
  - Open DevTools → Rendering → FPS meter
  - Generation progress: stays green (60 FPS)

---

## 🖼️ GATE 5: Image Generation (Phase 4 — Critical)

### Before Generating

- [ ] **At least one model installed**
  ```bash
  ls ~/.diffusionbee/imported_models/*.tdict
  # Should list at least 1 file
  ```

- [ ] **Backend process can start**
  ```bash
  cd backends/stable_diffusion
  source venv311/bin/activate
  python3 diffusionbee_backend.py &
  sleep 2
  # Should show "Backend ready" or similar
  pkill -f diffusionbee_backend
  deactivate
  ```

### Generation Test (Happy Path)

- [ ] **Smoke Test: Simple prompt generates**
  - Prompt: `"a cat"`
  - Model: SD 1.5 (or available default)
  - Size: 512x512
  - Steps: 20
  - **Result**: Image appears in gallery in < 90 seconds

- [ ] **Image quality acceptable**
  - Image is not noise/garbage
  - Recognizable objects present
  - No major artifacts

- [ ] **Multiple generations work**
  - Queue 3 images: all complete without error
  - Progress updates in real-time
  - Gallery shows all 3 with correct seeds

- [ ] **Image to Image works**
  - Upload an image
  - Use Img2Img mode
  - Generation produces related image
  - Output resembles input (not completely different)

- [ ] **Inpainting works (if applicable)**
  - Upload image + mask
  - Generation fills masked area
  - Blends naturally with original

- [ ] **Upscaling works (if Real-ESRGAN available)**
  - Generate normal image
  - Upscale to 2x
  - Result is larger, not blurry

### Error Handling

- [ ] **Invalid prompt → graceful error**
  - Empty prompt message: "Please enter a prompt"
  - Too long: truncate or warn, don't crash
  - Special chars: handled correctly

- [ ] **Model fails to load → clear message**
  - Error: "Model not found. Choose another or download."
  - Suggestion: "Download models" button appears

- [ ] **Backend crashes → recovery**
  - User clicks "Retry"
  - Backend restarts automatically
  - Generation resumes

- [ ] **Out of memory → caught gracefully**
  - Instead of hung process: "Out of memory. Try smaller image size."
  - Suggestion: "Reduce size to 512x384 or steps to 20"

---

## 📊 GATE 6: Gallery & History (Phase 4)

- [ ] **Generated images appear immediately**
  - Click "Generate" → image shows in gallery with loading spinner
  - Once done → spinner replaced with real image
  - No wait between file write and UI update

- [ ] **Gallery scrolls smoothly**
  - 100+ images: scroll without stutter
  - Lazy-loading works (don't render offscreen images)

- [ ] **Image metadata correct**
  - Clicking image shows: prompt, model, seed, steps, timestamp
  - Reseed button works (regenerates with same seed)
  - Copy button copies prompt to input

- [ ] **Search/filter works**
  - Search by prompt: finds matching images
  - Filter by model: shows only that model's generations
  - Sort by date: newest first (or user choice)

- [ ] **Save/export works**
  - Right-click → "Save" → writes to chosen location
  - Format: PNG with metadata embedded
  - Drag-and-drop export: drag image to Finder/Desktop

---

## 🎛️ GATE 7: Settings & Model Management (Phase 3)

- [ ] **Model switching works**
  - Select different model: UI updates instantly
  - Backend switches model before next generation
  - No errors if switching mid-generation

- [ ] **Settings persist**
  - Close app with custom settings
  - Reopen app: settings restored
  - Check: electron-settings correctly saves to disk

- [ ] **Add/remove models from UI**
  - "Download Models" shows list of available models
  - "Import Model" lets user browse local files
  - Delete button removes model (with confirmation)

- [ ] **Advanced options work**
  - Negative prompt: modifies output as expected
  - Guidance scale: higher = more prompt adherence
  - Steps: more steps = longer generation, better quality

---

## 🔐 GATE 8: Security & Privacy (Phase 3)

- [ ] **No data sent to cloud**
  - Proxy all network requests through local backend
  - Only exception: model download from HuggingFace (intentional)
  - Verify with: Network tab in DevTools

- [ ] **No credentials stored insecurely**
  - HuggingFace token (if used): stored in venv only
  - User settings: stored in ~/.diffusionbee/ (encrypted or machine-local)

- [ ] **Models downloaded securely**
  - HTTPS only (no HTTP)
  - Verify SHA256 after download
  - Check: install_hf_model.py validates hashes

---

## 🚀 GATE 9: Deployment (Phase 3)

### macOS Build

- [ ] **Build completes without errors**
  ```bash
  npm run build
  # Should complete in < 5 minutes
  ```

- [ ] **DMG is valid**
  ```bash
  # Check: electron_app/dist_electron/DiffusionBee-*.dmg exists
  # Try: Mount DMG, drag app to Applications folder, launch
  ```

- [ ] **Signed & notarized for macOS**
  - Check: `codesign -dv /Applications/DiffusionBee.app`
  - Should show developer cert (not unsigned)

- [ ] **Works on both Apple Silicon AND Intel**
  - Test on M1/M2/M3 Mac
  - Test on Intel Mac (if available)
  - Same binary works on both (universal binary)

### Windows Build (if applicable)

- [ ] **NSIS installer builds**
  ```bash
  npm run build:win
  # Result: electron_app/dist_electron/*.exe
  ```

- [ ] **Installer works**
  - Double-click: launches installer
  - Follow prompts: app installs to Program Files
  - Shortcut created in Start Menu

---

## 📋 GATE 10: Documentation (Phase 2)

- [ ] **README.md is current**
  - Version number matches package.json
  - Setup instructions tested (actually follow them)
  - Known issues documented

- [ ] **DEPLOYMENT_GUIDE.md exists**
  - Quick-start for developers
  - Testing instructions
  - Troubleshooting section

- [ ] **Screenshots in docs/screenshots/ are real**
  - Not placeholders or mockups
  - Actually generated by the app
  - Verify with script: `./scripts/ensure_doc_screenshots.sh`

- [ ] **Code comments explain intent**
  - Complex algorithms have comments
  - Non-obvious Vue logic documented
  - Backend generation loop well-explained

---

## 🎯 FINAL SCORING (69/80 Threshold)

| Category | Max Score | Your Score | Notes |
|----------|-----------|-----------|-------|
| Code Quality | 10 | /10 | Lint 0 warnings |
| Dark Mode | 10 | /10 | All text readable |
| Bilingual | 10 | /10 | Arabic perfect |
| Performance | 10 | /10 | No jank, < 2GB |
| Generation | 10 | /10 | Images appear |
| Gallery | 10 | /10 | Smooth, fast |
| Settings | 10 | /10 | Persist correctly |
| Security | 10 | /10 | No data leaks |
| Deployment | 10 | /10 | Builds clean |
| Docs | 10 | /10 | Current, accurate |
| **TOTAL** | **100** | **/80** | **Pass: ≥69** |

---

## 🚨 Failure Conditions (Do NOT Ship)

If ANY of these are true, **STOP and fix before shipping**:

1. ❌ Generation fails more than once in 10 tries
2. ❌ Any console errors on app load
3. ❌ Text contrast < 3:1 (or 4.5:1 for normal text)
4. ❌ Arabic text not using Tajawal font
5. ❌ UI freezes during generation
6. ❌ Memory usage > 4GB for single generation
7. ❌ Models cannot be switched
8. ❌ Dark mode shows white backgrounds
9. ❌ Build fails or app won't launch
10. ❌ Lint has > 0 errors

---

## ✨ Shipping Ritual

**When all 10 gates PASS:**

```bash
# 1. Final lint
cd electron_app && npm run lint

# 2. Final build
cd .. && npm run build

# 3. Final test
npm run test:generation:full

# 4. Screenshot verification
./scripts/ensure_doc_screenshots.sh

# 5. Commit message
git commit -m "feat: obsessive quality gates passed (69/80+ score)"

# 6. Tag version
git tag -a v2.5.0 -m "Production release: Dark mode, Arabic, jaw-breaking UI"

# 7. Push
git push origin main --tags
```

**Then:**
- Upload DMG to diffusionbee.com
- Announce in Discord
- Celebrate 🎉

---

<small>**Made with ❤️ in Bahrain 🇧🇭 — Architect By Doy | doy.tech**</small>
