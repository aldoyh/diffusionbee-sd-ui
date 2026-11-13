# DiffusionBee — Local Testing Guide (Run on Your Mac)

> **Complete step-by-step guide to build, run, and generate 20 images locally**

---

## 🎯 What This Guide Does

This guide walks you through:

1. ✅ Verifying environment setup
2. ✅ Building the frontend bundle
3. ✅ Starting the development server
4. ✅ Generating 20 test images
5. ✅ Verifying all quality gates (78/80 score)

**Estimated time:** 2-3 hours (mostly waiting for image generation)

---

## 🚀 Quick Start (TL;DR)

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# 1. Lint
cd electron_app && npm run lint

# 2. Build UI
npm run build:ui

# 3. Run dev server
npm run serve

# 4. In app: Generate 20 images with random prompts (see TEST_AND_GENERATE.md)
```

---

## 📋 Prerequisites Check

Run this before starting:

```bash
# Check Node
node --version    # Should be ≥ 20
npm --version     # Should be ≥ 10

# Check Python
python3 --version # Should be ≥ 3.10

# Check venv
~/Projects/GitHub-apps/diffusionbee-sd-ui/backends/stable_diffusion/venv311/bin/python3 --version

# Check model exists
ls ~/.diffusionbee/imported_models/*.tdict | head -1
# If nothing shows, download a model first

# Check RAM
free -h | grep Mem  # Should show at least 4GB
```

✅ **All checks should pass. If not, follow DEPLOYMENT_GUIDE.md**

---

## 🔧 Detailed Build Steps

### Step 1: Enter Project Directory

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# Verify you're in the right place
ls -la | grep -E "package.json|electron_app|backends"
# Should show all three
```

### Step 2: Install Dependencies (if needed)

```bash
cd electron_app

# Check if node_modules exists
ls node_modules | wc -l
# If < 100, dependencies missing

# Install (only if needed)
pnpm install
# or
npm install
```

### Step 3: Lint Code

```bash
cd electron_app

npm run lint

# Expected output:
#   ✓ 0 errors, 0 warnings
#   ✓ 1 file checked
```

❌ **If lint fails:**
- Check console for specific files
- Most issues: missing semicolons, undefined variables
- Fix with: `npm run lint:fix`

### Step 4: Build Frontend Bundle

```bash
cd electron_app

# Build browser-only version (faster, no Electron)
npm run build:ui

# Or build full Electron version (slower)
npm run build
```

⏱️ **Expected time:** 20-30 seconds

✅ **Expected output:**
```
dist/
├── index.html
├── css/
│   └── app.*.css
├── js/
│   ├── app.*.js
│   ├── chunk-*.js
│   └── vendor.*.js
```

### Step 5: Verify Build

```bash
cd electron_app

# Check build exists
ls -lh dist/index.html
# Should show file size

# Check bundle size
du -sh dist/
# Should be < 5MB
```

### Step 6: Start Development Server

```bash
cd ~/Projects/GitHub-apps/diffusionbee-sd-ui

# Start dev server with hot-reload
npm run serve

# Wait for output like:
#   App running at:
#   http://localhost:8080/
#   
#   Electron app starting...
```

⏱️ **Expected time:** 10-15 seconds until Electron window appears

🪟 **Electron window should:**
- ✅ Open a native macOS window
- ✅ Load DiffusionBee UI with dark theme
- ✅ Show "What will you create today?" heading
- ✅ Show model selector and prompt input
- ✅ Have **zero** console errors (Cmd+Option+I to check)

### Step 7: Download Model (if needed)

**If "Model Setup" dialog appears:**

1. Click **"Download default model"**
2. Choose Stable Diffusion 1.5 (recommended for speed)
3. Wait for download to complete (usually 4-5GB, takes 5-10 minutes)
4. Dialog will show "Model ready!" when done
5. Click **"OPEN App"**

✅ **You're ready to generate!**

---

## 🎨 Generating 20 Test Images

### Prompt List

Copy-paste each prompt into the app, one at a time:

**Prompts 1-5: Fantasy & Landscapes**

```
1. a majestic phoenix rising from flames, vibrant orange and gold feathers, epic fantasy art, dramatic lighting, highly detailed, masterpiece

2. serene Japanese garden with koi fish pond, cherry blossoms, stone lantern, traditional bridge, peaceful, high detail

3. futuristic cyberpunk city at night, neon lights, rain, flying cars, skyscrapers, blade runner aesthetic

4. cozy bookshop interior with warm lighting, wooden shelves, comfortable reading nook, detailed, atmospheric

5. abstract aurora borealis, northern lights dancing, green and purple colors, starry night sky, magical
```

**Prompts 6-10: Portraits & Underwater**

```
6. portrait of a young woman with intricate face paint, art deco style, golden accents, detailed, beautiful

7. underwater coral reef ecosystem, colorful fish, sea turtles, bioluminescent creatures, ethereal lighting

8. steampunk airship floating in clouds, gears and brass details, vintage aesthetic, dramatic sky

9. enchanted forest with mushroom circles, fireflies, glowing moss, magical, mysterious, detailed

10. vintage retro diner from 1950s, neon signs, checkered floor, chrome details, nostalgic
```

**Prompts 11-15: Creatures & Spaces**

```
11. majestic dragon perched on mountain peak, scales glinting, wings spread, fantasy, detailed

12. peaceful zen meditation space, lotus flowers, candlelight, water, minimalist, tranquil

13. cosmic galaxy with planets and stars, space nebula, science fiction, ethereal, colorful

14. Victorian steampunk fashion, ornate clothing, mechanical accessories, detailed, artistic

15. tropical paradise beach, white sand, turquoise water, palm trees, sunset, idyllic
```

**Prompts 16-20: Mystical & Abstract**

```
16. mystical forest spirit, glowing eyes, ethereal form, magical atmosphere, fantasy art

17. grand library with towering bookshelves, arched ceiling, candlelight, ancient knowledge

18. bioluminescent jellyfish in deep ocean, glowing, peaceful, mysterious, dreamlike

19. ornate gothic cathedral interior, stained glass windows, candlelit, mysterious, detailed

20. abstract digital art, geometric shapes, neon colors, futuristic, vibrant, dynamic
```

### Generation Settings

**Keep these constant for all 20 images:**

```
Image Size:    512 × 512
Steps:         20
Guidance:      7.5
Model:         Stable Diffusion 1.5 (or whatever is default)
```

### Generation Process

For each prompt:

1. **Clear the prompt field** (select all, delete)
2. **Copy-paste the prompt** from list above
3. **Verify settings** are unchanged
4. **Click "Generate"** button
5. **Wait 45-60 seconds** for generation
6. **Verify image appears** in gallery
7. **Repeat** for next prompt

📊 **Progress tracking:**

```
Generated: 0/20  [0%]
Generated: 5/20  [25%]
Generated: 10/20 [50%]
Generated: 15/20 [75%]
Generated: 20/20 [100%] ✅
```

---

## ✅ Verification Checklist

After all 20 images generated, verify:

### UI & Dark Mode
- [ ] UI responsive (no lag when clicking buttons)
- [ ] Dark mode active (black background, white text)
- [ ] All text readable (not too dim/bright)
- [ ] Buttons highlight on hover
- [ ] No layout issues or overflow

### Image Generation
- [ ] All 20 images generated successfully
- [ ] No images are noise/garbage
- [ ] All images are 512×512 pixels
- [ ] Generation time consistent (~45-60s each)
- [ ] Total time: ~15-20 minutes for 20 images

### Gallery & History
- [ ] Gallery shows all 20 images in grid/list
- [ ] Scrolling through gallery is smooth (no jank)
- [ ] Clicking image shows metadata (prompt, model, seed, time)
- [ ] Can right-click image and save to disk
- [ ] Timestamps are present and in correct order

### Error Handling
- [ ] No error messages appeared during generation
- [ ] If error occurred, message was friendly (not technical)
- [ ] App remained responsive during/after error

### Performance
- [ ] App uses < 2.5GB RAM peak (check Activity Monitor)
- [ ] No spinning beachball (frozen UI)
- [ ] Smooth interaction even during generation

### Bilingual (if applicable)
- [ ] If Arabic option exists: Switch to Arabic
- [ ] Verify: All text displays in Arabic
- [ ] Verify: Layout flips to RTL
- [ ] Verify: Tajawal font renders beautifully (not cramped)

---

## 📊 Quality Score Calculation

Count the checks above:

```
✅ Checks that pass
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ × 1 point each

Divide by 30 (total checks) × 100 = your score

Example:
28 checks pass / 30 × 100 = 93% ✅

Score > 80%  → EXCELLENT (ready to ship)
Score 70-80% → GOOD (minor issues, but shippable)
Score < 70%  → NEEDS FIXES (refer to OBSESSIVE_FIXES.md)
```

---

## 🐛 Troubleshooting

### Problem: "Model Setup" dialog won't close

**Solution:**
1. Click "Download default model"
2. If stuck on download progress, click "Cancel download"
3. Go to Model Store
4. Download any model manually
5. Restart app

### Problem: Generation starts but hangs indefinitely

**Solution:**
1. Open Activity Monitor (Cmd+Space → "Activity Monitor")
2. Find "Electron" process
3. Check if Python backend is using CPU (should be 100% while generating)
4. If not: Backend process died
5. Kill Electron (Force Quit) and restart

### Problem: "CUDA out of memory" error

**Solution:**
1. Close other apps (Chrome, VS Code, etc.)
2. Reduce image size to 512×384
3. Reduce steps to 15
4. Generate again

### Problem: Generated images are garbage/noise

**Solution:**
1. Check model is correct (Stable Diffusion 1.5, not something else)
2. Try different prompt
3. Try different seed (click "Reseed" button)
4. Last resort: Re-download model

### Problem: App crashes on startup

**Solution:**
```bash
cd electron_app
rm -rf node_modules dist
npm install
npm run serve
```

### Problem: Dark mode broken (white background)

**Solution:**
1. Read: OBSESSIVE_FIXES.md (Fix #1)
2. Verify CSS using theme variables
3. Check DevTools (F12) → Styles tab
4. Look for hardcoded colors like `#fff` or `white`

---

## 📈 Next Steps After Testing

Once all 20 images generated successfully:

### If score > 75/80:
✅ **Ready for production release**
- Run: `npm run build` (full Electron build)
- Upload DMG to diffusionbee.com
- Announce in Discord

### If score 65-75/80:
🟡 **Minor issues but shippable**
- Fix 1-2 issues from OBSESSIVE_FIXES.md
- Re-test those specific areas
- Ship with known limitations noted in README

### If score < 65/80:
❌ **Do NOT ship, needs work**
- Read OBSESSIVE_FIXES.md carefully
- Apply fixes one by one
- Re-test after each fix
- Re-run this entire guide

---

## 💾 Save Results

After testing, save a copy of:

1. **Screenshot** of all 20 images in gallery
   - File → Save Screenshot (or Cmd+Shift+4)
   - Save as: `DiffusionBee-20-images-test-YYYY-MM-DD.png`

2. **Test results** from checklist above
   - Copy checklist into text file
   - Note any issues found
   - Save as: `DiffusionBee-test-results-YYYY-MM-DD.txt`

3. **Copy to outputs folder:**
   ```bash
   cp DiffusionBee-test-results-*.txt ~/Projects/GitHub-apps/diffusionbee-sd-ui/
   cp DiffusionBee-20-images-test-*.png ~/Projects/GitHub-apps/diffusionbee-sd-ui/
   ```

This documents that you tested the app successfully.

---

## 🚀 Final Checklist

Before shipping:

```
✅ All 20 images generated successfully
✅ Gallery displays all 20 images
✅ No console errors (DevTools clean)
✅ Dark mode works perfectly
✅ Performance acceptable (< 2.5GB memory)
✅ Error handling user-friendly
✅ Bilingual UI perfect (if applicable)
✅ Quality score ≥ 75/80
✅ Test results documented
✅ Ready for production ✅✅✅
```

---

<small>**Made with ❤️ in Bahrain 🇧🇭 — Architect By Doy | doy.tech**</small>
