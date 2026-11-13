# DiffusionBee — Developer Quick Reference 🚀

> **Keep this open while coding. Refer to it before every merge.**

---

## 🎯 The Obsessive Loop (4 Phases)

```
🔍 RESEARCH       📐 DESIGN        🔧 IMPLEMENT      ✅ CRITIQUE
What exists? ──→ What should it be? ──→ Make it ──→ Does it score 69/80?
   ↓                                                      ↓
Find issues, audit current state              If failing: back to IMPLEMENT
```

**Never ship below 69/80.**

---

## 🚨 Critical Don'ts

| ❌ DON'T | ✅ DO INSTEAD |
|----------|--------------|
| Hardcode colors like `#fff` | Use `var(--color-bg-elevated)` |
| Skip accessibility labels | Add `aria-label`, `title` to every button |
| Render all 100 images in DOM | Implement lazy-loading, visible items |
| Show Python error to user | Map errors to friendly messages |
| Use `line-height: 1.5` for Arabic | Use `line-height: 1.6-1.8` for Tajawal |
| Allow model switch during generation | Disable selector + show friendly message |
| Ignore console warnings | Fix prop validation, no warnings allowed |
| Ship without testing both modes | Test dark AND light mode before commit |

---

## 📋 Pre-Commit Checklist

```bash
# 1. Lint passes (0 warnings)
npm run lint

# 2. Dark/light mode both work
# (Open app, toggle theme, verify both readable)

# 3. Arabic text renders beautifully
# (Switch to Arabic, check line-height not cramped)

# 4. Test generation works
npm run test:generation

# 5. No console errors
# (Open DevTools → Console tab must be clean)

# 6. Accessibility labels present
# (Check all buttons have aria-label or accessible text)

# 7. Gallery scrolls smoothly
# (Generate 50 images, scroll must not jank)
```

**If any fail: FIX before committing.**

---

## 🎨 Design Tokens Cheat Sheet

### Colors (Dark Mode Default)

```css
/* Always use these, never hardcode */
--color-bg: #0a0a0a              /* Main background */
--color-bg-elevated: #141414      /* Raised surfaces (cards, dialogs) */
--color-text-primary: #ffffff     /* Main text */
--color-text-secondary: #a3a3a3   /* Secondary text (disabled, hints) */
--color-primary: #2a6df9          /* Buttons, links, interactive */
--color-success: #34c759          /* Success state */
--color-error: #ff453a            /* Errors, warnings */
```

### Spacing

```css
--space-xs: 8px       /* Small gap */
--space-md: 16px      /* Regular padding/margin */
--space-lg: 24px      /* Large spacing */
```

### Typography

```css
--font-family-sans: 'Inter'        /* English text */
--font-family-arabic: 'Tajawal'    /* Arabic text */
--font-size-base: 14px             /* Body text */
--font-size-lg: 16px               /* Labels, larger text */
--line-height-normal: 1.5          /* English text */
--line-height-relaxed: 1.7         /* Arabic text */
```

---

## 🌍 Bilingual Patterns

### Template (Vue)

```vue
<!-- Always add bilingual labels -->
<button 
  @click="doSomething"
  :aria-label="app.app_state.isArabic ? 'الوصف بالعربية' : 'English description'"
  :title="app.app_state.isArabic ? 'الوصف بالعربية' : 'English description'"
>
  {{ app.app_state.isArabic ? 'نص عربي' : 'English text' }}
</button>

<!-- For text direction -->
<div :dir="app.app_state.isArabic ? 'rtl' : 'ltr'">
  Content automatically flips direction
</div>

<!-- RTL-safe spacing -->
<div class="element" :class="{ 'rtl-text': app.app_state.isArabic }">
  Uses EdgeInsetsDirectional (start/end, not left/right)
</div>
```

### CSS

```css
/* Arabic-specific styling */
.arabic-text {
  font-family: 'Tajawal', sans-serif;
  line-height: 1.6;              /* More space for Arabic script */
  letter-spacing: 0.02em;        /* Better readability */
  word-spacing: 0.1em;
  text-align: right;             /* Explicit RTL */
}

/* English text (default) */
.english-text {
  font-family: 'Inter', sans-serif;
  line-height: 1.5;              /* Standard for Latin script */
  text-align: left;
}
```

---

## 🔧 Common Fixes

### Issue: Component breaks in dark mode

```vue
<!-- ❌ BEFORE (hardcoded color) -->
<div style="background-color: white; color: black;">

<!-- ✅ AFTER (uses theme) -->
<div class="card-bg">
  <!-- CSS: .card-bg { background: var(--color-bg-elevated); } -->
```

### Issue: Button not accessible

```vue
<!-- ❌ BEFORE (icon-only, no label) -->
<button @click="delete">
  <TrashIcon />
</button>

<!-- ✅ AFTER (labeled) -->
<button 
  @click="delete"
  :aria-label="app.app_state.isArabic ? 'حذف الصورة' : 'Delete image'"
  :title="app.app_state.isArabic ? 'حذف الصورة' : 'Delete image'"
>
  <TrashIcon />
</button>
```

### Issue: Gallery lags with many images

```vue
<!-- ❌ BEFORE (all images rendered) -->
<div v-for="img in allImages" :key="img.id">
  <img :src="img.src" />
</div>

<!-- ✅ AFTER (lazy-loaded) -->
<div v-for="img in visibleImages" :key="img.id">
  <img :src="img.src" loading="lazy" />
</div>

<!-- Script: compute only visible items -->
computed: {
  visibleImages() {
    return this.allImages.slice(
      this.scrollIndex - 5,
      this.scrollIndex + 15
    );
  }
}
```

### Issue: Technical error shown to user

```javascript
// ❌ BEFORE (raw Python error)
catch (error) {
  this.$toast.error(error.message);
  // Shows: "RuntimeError: CUDA out of memory"
}

// ✅ AFTER (friendly message)
const ERROR_MAP = {
  'CUDA out of memory': 'Out of VRAM. Reduce image size or steps.',
  'Model not found': 'Model missing. Download from Model Store.',
  'Connection refused': 'Backend not responding. Restart the app.',
};

catch (error) {
  const msg = ERROR_MAP[error.message] || 'Generation failed. Try again.';
  this.$toast.error(msg);
}
```

---

## 🧪 Testing Commands

```bash
# Lint (0 warnings required)
npm run lint

# Build production bundle
npm run build

# Test image generation
npm run test:generation

# Full audit (all 4 phases)
bash OBSESSIVE_AUDIT.sh

# Open app in dev mode
npm run serve
```

---

## 📊 Quality Gates (Before Shipping)

Open `QUALITY_GATES.md`. All 10 gates must ✅ PASS:

1. ✅ Code quality (lint, console clean)
2. ✅ Dark mode (all text readable, intentional)
3. ✅ Bilingual (Arabic & English equal quality)
4. ✅ Performance (60 FPS, no jank, < 2GB memory)
5. ✅ Image generation (works, user-friendly errors)
6. ✅ Gallery/history (smooth, timestamps, search)
7. ✅ Settings (persist, no data loss)
8. ✅ Security (no data leaks, local-first)
9. ✅ Deployment (builds clean, signed)
10. ✅ Documentation (current, tested)

**Score: ≥ 69/80 to ship.**

Current: **78/80** ✅

---

## 🚀 Shipping Ritual

```bash
# 1. One last lint
npm run lint

# 2. Build
npm run build

# 3. Test generation
npm run test:generation

# 4. Verify screenshots are real
./scripts/ensure_doc_screenshots.sh

# 5. Commit
git commit -m "obsessive: fixes applied, 78/80 score"
git tag -a v2.5.0 -m "Production release"

# 6. Push & deploy
git push origin main --tags
# Upload DiffusionBee-*.dmg to diffusionbee.com
```

---

## 💬 When Stuck

### "How do I make dark mode work?"
→ Read: `electron_app/src/assets/css/theme.css`  
→ Use: `var(--color-*)` instead of hardcoded colors  
→ Test: Toggle theme, verify readability

### "How do I add Arabic translation?"
→ File: `electron_app/src/i18n.js`  
→ Pattern: `{{ app.app_state.isArabic ? 'العربية' : 'English' }}`  
→ Font: Tajawal (already imported)

### "How do I make this accessible?"
→ Add: `aria-label`, `title`, semantic HTML  
→ Test: Tab through UI, open screen reader  
→ Check: Contrast ≥ 4.5:1 (WebAIM Contrast Checker)

### "My generation times out"
→ Check: System RAM available (`free -h`)  
→ Reduce: Image size (512x512 → 512x384)  
→ Reduce: Steps (50 → 30)  
→ Use: Smaller model or different algorithm

### "Why does my merge fail?"
→ Run: `npm run lint` (fixes most issues)  
→ Run: `npm run test:generation`  
→ Check: All accessibility labels present  
→ Verify: Dark mode doesn't have white backgrounds

---

## 📞 Emergency Contacts

- **Discord**: [discord.gg/t6rC5RaJQn](https://discord.gg/t6rC5RaJQn)
- **Issues**: GitHub Issues (include score from QUALITY_GATES)
- **Docs**: `DEPLOYMENT_GUIDE.md`, `QUALITY_GATES.md`, `OBSESSIVE_FIXES.md`

---

## ✨ Remember

> **Every pixel is a decision. Make every decision on purpose.**

> **Animation without physics is decoration. Animation with physics is life.**

> **Arabic users are not an afterthought. They are the first thought.**

> **60fps is the floor. 120fps ProMotion is the goal. Jank is failure.**

---

**Print this. Pin it to your desk. Refer to it constantly.**

<small>Made with ❤️ in Bahrain 🇧🇭 — Architect By Doy | doy.tech</small>
