# DiffusionBee — Complete Build & Generation Test

> **End-to-End Testing: Build → Run → Generate 20 Images**

---

## 📋 Prerequisites

Before running this test, ensure:

- ✅ Node.js ≥ 26 installed: `node --version`
- ✅ npm ≥ 10 installed: `npm --version`
- ✅ Python 3.11 venv set up: `backends/stable_diffusion/venv311/bin/python3 --version`
- ✅ Python dependencies installed: `pip list | grep torch`
- ✅ At least one model downloaded: `ls ~/.diffusionbee/imported_models/*.tdict`
- ✅ macOS with Apple Silicon or Intel
- ✅ At least 4GB free RAM

---

## 🚀 COMPLETE TEST SEQUENCE (Step by Step)

### Step 1: Clean Environment

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# Clean old builds
rm -rf electron_app/dist electron_app/dist_electron
rm -rf electron_app/node_modules/.cache

# Clear old generation output (optional)
rm -rf ~/.diffusionbee/output/*
```

✅ **Expected:** No errors, clean slate

---

### Step 2: Lint & Verify Code Quality

```bash
cd electron_app

# Run linting
npm run lint

# Should output:
# ✓ 0 errors, 0 warnings
```

✅ **Expected:** No lint errors or warnings

---

### Step 3: Build Frontend Bundle

```bash
cd electron_app

# Build production bundle (browser-only, no Electron yet)
npm run build:ui

# Check build succeeded
ls -lh dist/ | head -10
```

✅ **Expected:** 
- Bundle completes in < 30s
- `dist/js/` contains `*.js` files
- `dist/css/` contains theme files
- No errors in output

---

### Step 4: Verify Backend Setup

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui/backends/stable_diffusion

# Activate venv
source venv311/bin/activate

# Test backend imports
python3 -c "
import torch
import diffusers
from PIL import Image
print('✓ PyTorch:', torch.__version__)
print('✓ Diffusers:', diffusers.__version__)
print('✓ PIL:', Image.__version__)
"

deactivate
```

✅ **Expected:**
```
✓ PyTorch: 2.0.x or higher
✓ Diffusers: 0.2x.x
✓ PIL: (version shown)
```

---

### Step 5: Start Development Server

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# Start Electron dev server with hot-reload
npm run serve

# Wait for output like:
#   > App running at:
#   > http://localhost:8080/
#   > Electron app starting...
```

✅ **Expected:**
- Dev server starts in < 10s
- Electron window opens showing DiffusionBee UI
- No console errors

---

### Step 6: Verify UI Loads

Once Electron window is open:

1. ✅ Dark mode active (black background)
2. ✅ Logo visible at top
3. ✅ "What will you create today?" heading visible
4. ✅ Mode switcher shows options (Txt2Img, Img2Img, etc.)
5. ✅ Sample carousel with inspiration images visible
6. ✅ Chat input box for prompts visible

**If Model Setup Dialog appears:**
- Click "Download default model" to download Stable Diffusion 1.5
- Wait for download to complete
- Then proceed to Step 7

---

### Step 7: Generate First Image (Smoke Test)

**In the DiffusionBee app:**

1. Click on "Text to Image" mode (if not already there)
2. Enter prompt:
   ```
   a peaceful mountain landscape with clear blue sky and snow peaks, 
   photorealistic, cinematic, high detail
   ```
3. Verify settings:
   - Image size: 512x512
   - Steps: 20
   - Guidance scale: 7.5
   - Model: Stable Diffusion 1.5 (or available default)
4. Click **"Generate"** button
5. Watch progress bar

✅ **Expected:**
- Progress bar shows 0% → 100%
- Image appears in gallery after ~45-60 seconds
- Image is not noise/garbage
- No error messages in DevTools

---

### Step 8: Generate 20 Images with Random Prompts

**Use this prompt list for generation:**

```javascript
const RANDOM_PROMPTS = [
  1. "a majestic phoenix rising from flames, vibrant orange and gold feathers, epic fantasy art, dramatic lighting, highly detailed, masterpiece",
  2. "serene Japanese garden with koi fish pond, cherry blossoms, stone lantern, traditional bridge, peaceful, high detail",
  3. "futuristic cyberpunk city at night, neon lights, rain, flying cars, skyscrapers, blade runner aesthetic",
  4. "cozy bookshop interior with warm lighting, wooden shelves, comfortable reading nook, detailed, atmospheric",
  5. "abstract aurora borealis, northern lights dancing, green and purple colors, starry night sky, magical",
  6. "portrait of a young woman with intricate face paint, art deco style, golden accents, detailed, beautiful",
  7. "underwater coral reef ecosystem, colorful fish, sea turtles, bioluminescent creatures, ethereal lighting",
  8. "steampunk airship floating in clouds, gears and brass details, vintage aesthetic, dramatic sky",
  9. "enchanted forest with mushroom circles, fireflies, glowing moss, magical, mysterious, detailed",
  10. "vintage retro diner from 1950s, neon signs, checkered floor, chrome details, nostalgic",
  11. "majestic dragon perched on mountain peak, scales glinting, wings spread, fantasy, detailed",
  12. "peaceful zen meditation space, lotus flowers, candlelight, water, minimalist, tranquil",
  13. "cosmic galaxy with planets and stars, space nebula, science fiction, ethereal, colorful",
  14. "Victorian steampunk fashion, ornate clothing, mechanical accessories, detailed, artistic",
  15. "tropical paradise beach, white sand, turquoise water, palm trees, sunset, idyllic",
  16. "mystical forest spirit, glowing eyes, ethereal form, magical atmosphere, fantasy art",
  17. "grand library with towering bookshelves, arched ceiling, candlelight, ancient knowledge",
  18. "bioluminescent jellyfish in deep ocean, glowing, peaceful, mysterious, dreamlike",
  19. "ornate gothic cathedral interior, stained glass windows, candlelit, mysterious, detailed",
  20. "abstract digital art, geometric shapes, neon colors, futuristic, vibrant, dynamic"
];
```

**In the DiffusionBee app, generate each prompt:**

For each prompt (1-20):

1. Clear previous prompt text
2. Paste prompt from list above
3. Keep settings constant:
   - Image size: 512x512
   - Steps: 20
   - Guidance: 7.5
4. Click "Generate"
5. Wait for completion (~45-60s per image)
6. Verify image appears in gallery
7. Move to next prompt

---

### Step 9: Verify Gallery Contains 20 Images

After all 20 generations complete:

1. **Check gallery sidebar:**
   - Scroll down through gallery
   - Count images (should show 20)
   - All images visible and loaded

2. **Test gallery features:**
   - ✅ Click image → opens in preview
   - ✅ Scroll through gallery → smooth (no jank)
   - ✅ Right-click image → save option appears
   - ✅ Hover over image → shows metadata (prompt, model, seed)
   - ✅ Search/filter works (if available)

3. **Test timestamps:**
   - Click first image → note timestamp
   - Click last image → note timestamp
   - Last should be newer than first ✅

4. **Test image metadata:**
   - Click any image
   - Verify visible:
     - ✅ Prompt used
     - ✅ Model name
     - ✅ Seed value
     - ✅ Generation time/date

---

### Step 10: Verify Dark Mode & Bilingual

**Dark Mode Test:**
1. Look for dark mode toggle (usually in settings or toolbar)
2. Click to toggle to light mode
3. Verify:
   - ✅ Background is light
   - ✅ All text readable (≥ 4.5:1 contrast)
   - ✅ No white backgrounds that break
4. Toggle back to dark mode
5. Verify dark mode restored

**Bilingual Test (if Arabic support exists):**
1. Find language selector (usually in settings)
2. Switch to Arabic (العربية)
3. Verify:
   - ✅ All UI text now in Arabic
   - ✅ Layout flips to RTL
   - ✅ Tajawal font renders beautifully
   - ✅ No cramping or text cutoff
   - ✅ Buttons and inputs work in Arabic
4. Switch back to English

---

### Step 11: Test Error Handling

**Intentionally trigger errors to verify user-friendly messages:**

**Error #1: Disconnect backend**
1. While app is running, open Terminal
2. Run: `pkill -f diffusionbee_backend`
3. In app, try to generate
4. ✅ Expected: Friendly message like "Backend not responding. Please restart the app."
5. Not: Technical Python error

**Error #2: Invalid prompt**
1. Enter empty prompt
2. Click generate
3. ✅ Expected: "Please enter a prompt"

**Error #3: Change model during generation**
1. Start generation
2. Try to switch model in dropdown
3. ✅ Expected: Model selector disabled with message "Cannot switch models during generation"

---

### Step 12: Verify Performance

**Memory Usage During Generation:**
1. Open Activity Monitor (Cmd+Space → "Activity Monitor")
2. Find "Electron" process
3. Start generating
4. Watch "Memory" column
5. ✅ Expected: Should not exceed 2.5GB peak

**Frame Rate (Smooth UI):**
1. During generation, interact with UI (scroll, click buttons)
2. ✅ Expected: Responsive, no freezing
3. No lag when generation completes and image loads into gallery

**Generation Speed:**
1. Note time when clicking "Generate"
2. Note time when image appears in gallery
3. ✅ Expected: ~45-60 seconds for 512x512 with 20 steps

---

## 📊 Results Scorecard

Fill in after testing:

```
QUALITY GATES TEST RESULTS
═══════════════════════════════════════════════════

Build & Code Quality:
  ✅ Linting passes (0 warnings)        [yes/no]
  ✅ Build succeeds in < 30s            [yes/no]
  ✅ No console errors on load          [yes/no]
  ✅ Backend imports work               [yes/no]
  Score: ___/10

Dark Mode:
  ✅ Dark mode active by default        [yes/no]
  ✅ All text readable in dark          [yes/no]
  ✅ Light mode toggle works            [yes/no]
  ✅ Text contrast >= 4.5:1             [yes/no]
  Score: ___/10

Image Generation:
  ✅ First image generates successfully [yes/no]
  ✅ All 20 images generate             [yes/no]
  ✅ Images are not noise/garbage       [yes/no]
  ✅ No technical errors shown to user  [yes/no]
  Score: ___/10

Gallery & History:
  ✅ All 20 images visible in gallery   [yes/no]
  ✅ Scrolling smooth (no jank)         [yes/no]
  ✅ Timestamps visible and correct     [yes/no]
  ✅ Image metadata displayed           [yes/no]
  Score: ___/10

Performance:
  ✅ Memory stays < 2.5GB during gen    [yes/no]
  ✅ UI responsive during generation    [yes/no]
  ✅ Generation takes 45-60s per image  [yes/no]
  ✅ No UI freezes or lag               [yes/no]
  Score: ___/10

Bilingual (if applicable):
  ✅ Arabic UI renders correctly        [yes/no]
  ✅ RTL layout flips properly          [yes/no]
  ✅ Tajawal font beautiful, no cramping [yes/no]
  ✅ Both languages equal quality       [yes/no]
  Score: ___/10

Error Handling:
  ✅ User-friendly error messages       [yes/no]
  ✅ No technical Python errors shown   [yes/no]
  ✅ Model switch locked during gen     [yes/no]
  ✅ App recovers from errors gracefully [yes/no]
  Score: ___/10

Accessibility:
  ✅ All buttons have labels            [yes/no]
  ✅ Tab navigation works               [yes/no]
  ✅ Keyboard shortcuts work (Ctrl+Enter) [yes/no]
  ✅ Screen reader friendly             [yes/no]
  Score: ___/10

════════════════════════════════════════════════════
TOTAL SCORE:  ___/80

  ✅ 69-80:   PASS - Ready for production
  🟡 55-68:   NEEDS FIXES - Review OBSESSIVE_FIXES.md
  ❌ < 55:    FAIL - Major issues, do not ship
════════════════════════════════════════════════════
```

---

## 🐛 If Tests Fail

### Generation fails to start
→ Check: `~/.diffusionbee/logs/backend.log`  
→ Ensure: Python venv has all dependencies  
→ Solution: Re-run backend test: `python3 test_backend.py`

### UI won't load
→ Check: DevTools console (Cmd+Option+I)  
→ Look for: JavaScript errors  
→ Solution: Check DEPLOYMENT_GUIDE.md "Debug" section

### Dark mode broken
→ Read: OBSESSIVE_FIXES.md (Fix #1 - Hardcoded Colors)  
→ Verify: All colors use CSS variables  
→ Solution: Search codebase for hardcoded `#fff` or `white`

### Generation too slow (> 120s)
→ Check: System RAM available  
→ Reduce: Image size to 512x384  
→ Reduce: Steps to 15  
→ Use: Smaller model (SD 1.5 instead of SDXL)

### Memory usage too high (> 3GB)
→ Close: Other apps (Chrome, VS Code, etc.)  
→ Restart: The app  
→ Use: Smaller batch size (num_imgs: 1 instead of 4)

---

## ✅ Shipping Decision

Only ship when:

```
✅ All 8 categories score ≥ 8/10
✅ Total score ≥ 78/80
✅ No console errors
✅ All 20 images generated successfully
✅ Dark & light modes both work
✅ Error handling user-friendly
✅ Performance acceptable (< 2.5GB memory)
✅ Bilingual UI perfect (if applicable)
```

---

## 📝 Document Results

After completing this test:

1. Fill in scorecard above
2. Note any issues found
3. Compare against QUALITY_GATES.md
4. If score < 69/80, refer to OBSESSIVE_FIXES.md
5. If score ≥ 69/80, ready to ship! 🚀

---

<small>**Made with ❤️ in Bahrain 🇧🇭 — Architect By Doy | doy.tech**</small>
