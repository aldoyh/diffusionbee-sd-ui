# DiffusionBee Design System & UI Testing Guide

## Overview

This document describes the complete design system for DiffusionBee, including design tokens, component library, accessibility standards, and UI testing methodology.

---

## 1. Design Tokens

### Spacing Scale (8px Base Unit)
```css
--space-xxs: 4px   /* 0.5 × base */
--space-xs: 8px    /* 1 × base */
--space-sm: 12px   /* 1.5 × base */
--space-md: 16px   /* 2 × base */
--space-lg: 24px   /* 3 × base */
--space-xl: 32px   /* 4 × base */
--space-xxl: 48px  /* 6 × base */
--space-xxxl: 64px /* 8 × base */
```

### Typography Scale
```css
--font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-family-arabic: 'Tajawal', var(--font-family-sans);

--font-size-xs: 11px;
--font-size-sm: 13px;
--font-size-base: 14px;
--font-size-lg: 16px;
--font-size-xl: 18px;
--font-size-xxl: 22px;
--font-size-display: 28px;

--font-weight-light: 300;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.7;
```

### Color System (Semantic)

#### Dark Mode (Default)
```css
:root {
  /* Surfaces */
  --color-bg: #0a0a0a;
  --color-bg-elevated: #141414;
  --color-bg-hover: #1f1f1f;
  
  /* Borders */
  --color-border: #262626;
  --color-border-hover: #404040;
  --color-border-strong: #525252;
  
  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #737373;
  --color-text-placeholder: #525252;
  
  /* Semantic Colors */
  --color-primary: #3E7BFA;
  --color-primary-hover: #2d6ae8;
  --color-primary-light: rgba(62, 123, 250, 0.1);
  --color-primary-foreground: #ffffff;
  
  --color-secondary: #6c5ce7;
  --color-secondary-hover: #5b4bd8;
  
  --color-success: #34c759;
  --color-success-hover: #2db84e;
  --color-success-light: rgba(52, 199, 89, 0.1);
  
  --color-warning: #ff9500;
  --color-warning-hover: #e08400;
  --color-warning-light: rgba(255, 149, 0, 0.1);
  
  --color-error: #ff453a;
  --color-error-hover: #e03a31;
  --color-error-light: rgba(255, 69, 58, 0.1);
  
  /* Component Specific */
  --sidebar-bg: #141414;
  --sidebar-border: #262626;
  --card-bg: #141414;
  --card-border: #262626;
  --input-bg: #141414;
  --input-border: #262626;
  --input-border-focus: #3E7BFA;
  --dropdown-bg: #141414;
  --dropdown-border: #262626;
  --modal-bg: #141414;
  --modal-backdrop: rgba(0, 0, 0, 0.7);
  --toast-bg: #141414;
  --toast-border: #262626;
  --slider-track: #262626;
  --slider-thumb: #3E7BFA;
  --progress-bg: #262626;
  --code-bg: #1f1f1f;
  --code-text: #e5e5e5;
}
```

#### Light Mode
```css
@media (prefers-color-scheme: light) {
  :root {
    --color-bg: #fafafa;
    --color-bg-elevated: #ffffff;
    --color-bg-hover: #f5f5f5;
    --color-border: #e5e5e5;
    --color-border-hover: #d4d4d4;
    --color-border-strong: #a3a3a3;
    --color-text-primary: #171717;
    --color-text-secondary: #525252;
    --color-text-tertiary: #737373;
    --color-text-placeholder: #a3a3a3;
    --sidebar-bg: #ffffff;
    --sidebar-border: #e5e5e5;
    --card-bg: #ffffff;
    --card-border: #e5e5e5;
    --input-bg: #ffffff;
    --input-border: #e5e5e5;
    --dropdown-bg: #ffffff;
    --dropdown-border: #e5e5e5;
    --modal-bg: #ffffff;
    --modal-backdrop: rgba(0, 0, 0, 0.5);
    --toast-bg: #ffffff;
    --toast-border: #e5e5e5;
    --slider-track: #e5e5e5;
    --progress-bg: #e5e5e5;
    --code-bg: #f5f5f5;
    --code-text: #171717;
  }
}
```

### Border Radius
```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### Transitions
```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Responsive Breakpoints
```css
--breakpoint-mobile: 480px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 1024px;
--breakpoint-large: 1280px;
```

---

## 2. Component Library

### Buttons

#### Base Button (`.btn`)
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  text-decoration: none;
}
```

#### Variants
| Variant | Class | Background | Border | Text Color |
|---------|-------|------------|--------|------------|
| Primary | `.btn-primary` | `--color-primary` | `--color-primary` | `--color-primary-foreground` |
| Secondary | `.btn-secondary` | transparent | `--color-border` | `--color-text-primary` |
| Ghost | `.btn-ghost` | transparent | transparent | `--color-text-secondary` |
| Destructive | `.btn-destructive` | `--color-error` | `--color-error` | `--color-primary-foreground` |

#### Sizes
| Size | Class | Padding | Font Size | Icon Size |
|------|-------|---------|-----------|-----------|
| Small | `.btn-sm` | `4px 12px` | `13px` | `28px` |
| Default | (base) | `8px 16px` | `14px` | `36px` |
| Large | `.btn-lg` | `12px 24px` | `16px` | `44px` |

---

### Form Inputs

#### Base Input (`.form-input`, `.form-textarea`, `.form-select`)
```css
.form-input {
  width: 100%;
  padding: var(--space-xs) var(--space-md);
  font-size: var(--font-size-base);
  font-family: inherit;
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--input-border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

#### States
| State | Border | Box Shadow |
|-------|--------|------------|
| Default | `--input-border` | none |
| Hover | `--color-border-hover` | none |
| Focus | `--input-border-focus` | `0 0 0 3px var(--color-primary-light)` |
| Disabled | opacity 0.5 | none |
| Error | `--color-error` | `0 0 0 3px var(--color-error-light)` |

---

### Cards

```css
.card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.card:hover {
  border-color: var(--color-border-hover);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-lg);
}
```

#### Card Structure
```html
<div class="card">
  <div class="card-header">...</div>
  <div class="card-body">...</div>
  <div class="card-footer">...</div>
</div>
```

---

### Navigation

#### Sidebar
```css
.sidebar {
  width: 240px;
  min-width: 240px;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
}

.sidebar.collapsed {
  width: 64px;
  min-width: 64px;
}
```

#### Nav Items
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.nav-item.active {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}
```

---

### Mode Switcher

```css
.mode-switcher {
  display: flex;
  gap: var(--space-md);
}

.mode-pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mode-pill.active {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light);
}
```

---

### Prompt Input

```css
.prompt-input-wrapper {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  transition: border-color var(--transition-fast);
}

.prompt-input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.prompt-textarea {
  width: 100%;
  min-height: 80px;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: var(--color-text-primary);
}
```

---

### Sample/Inspiration Grid

```css
.sample-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.sample-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-xl);
  border: 1px solid var(--card-border);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.sample-card:hover {
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

---

### Modals

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  z-index: 1000;
  animation: fade-in var(--transition-fast);
}

.modal {
  background-color: var(--modal-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modal-in var(--transition-normal);
}
```

---

### Toasts

```css
.toast-container {
  position: fixed;
  bottom: var(--space-xl);
  right: var(--space-xl);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background-color: var(--toast-bg);
  border: 1px solid var(--toast-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  min-width: 280px;
  max-width: 400px;
  animation: toast-in var(--transition-normal);
}
```

---

### Progress & Loading

```css
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-bg-hover) 50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.progress {
  height: 6px;
  background-color: var(--progress-bg);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}
```

---

### Dropdowns

```css
.dropdown-menu {
  position: absolute;
  top: calc(100% + var(--space-xs));
  right: 0;
  min-width: 200px;
  background-color: var(--dropdown-bg);
  border: 1px solid var(--dropdown-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: var(--space-xs);
  z-index: 100;
  animation: dropdown-in var(--transition-fast);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}
```

---

## 3. Layout System

### App Frame Structure
```html
<div class="app-frame">
  <aside class="sidebar">...</aside>
  <main class="main-content">
    <header class="content-header">...</header>
    <div class="content-body">...</div>
  </main>
</div>
```

### Grid System
```css
.grid {
  display: grid;
  gap: var(--space-lg);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
.grid-cols-auto { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
```

### Responsive Behavior
| Breakpoint | Sidebar | Grid Columns | Sidebar Width |
|------------|---------|--------------|---------------|
| Mobile (< 768px) | Collapsed / Overlay | 1 | 100% / 280px |
| Tablet (768-1024px) | Collapsible | 2 | 240px / 64px |
| Desktop (> 1024px) | Expanded | 3-4 | 240px |

---

## 4. Accessibility Standards

### Color Contrast Requirements
| Element | Minimum Ratio | Target Ratio |
|---------|---------------|--------------|
| Body text | 4.5:1 | 7:1 |
| Large text (≥18px) | 3:1 | 4.5:1 |
| UI components (borders, icons) | 3:1 | 4.5:1 |
| Focus indicators | 3:1 | 4.5:1 |

### Keyboard Navigation
- All interactive elements reachable via Tab
- Logical tab order following visual layout
- Visible focus indicators (`:focus-visible`)
- Skip links for main content
- Escape key closes modals/dropdowns

### Screen Reader Support
- Semantic HTML structure (`<nav>`, `<main>`, `<aside>`, `<section>`)
- ARIA labels on icon-only buttons
- Live regions for toast notifications
- RTL support with `dir="rtl"` and `lang="ar"`

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. UI Testing Methodology

### Automated Visual Testing

#### Screenshot Capture Pipeline
```bash
# Full documentation pipeline
./scripts/ensure_doc_screenshots.sh

# Individual steps
python3 scripts/prepare_doc_screenshots.py --generate   # Generate sample images
./scripts/capture_screenshots.sh                        # Capture UI screenshots
python3 scripts/compose_txt2img_screenshot.py           # Composite samples
python3 scripts/verify_doc_screenshots.py              # Verify content
```

#### Required Screenshots
| Screenshot | Description | Validation |
|------------|-------------|------------|
| `01-homepage.png` | Homepage with welcome carousel | Has sample images |
| `02-txt2img.png` | Text-to-image page | Form visible |
| `03-img2img.png` | Image-to-image page | Input area visible |
| `04-inpainting.png` | Inpainting page | Mask tools visible |
| `05-upscaler.png` | Upscaler page | Upload area visible |
| `06-models.png` | Models page | Model cards visible |
| `07-history.png` | History page | Generated images visible |
| `sample-generation.png` | Real backend output | Not placeholder |

#### Screenshot Validation
```python
# verify_doc_screenshots.py checks:
# 1. File exists
# 2. File size > threshold (not empty)
# 3. Image dimensions match expected
# 4. Content has variation (not solid color)
```

### Manual Testing Checklist

#### Homepage
- [ ] Welcome carousel displays 12 sample images
- [ ] Mode switcher (Txt2Img, Img2Img, Inpainting) interactive
- [ ] Prompt input accepts text, shows token counter
- [ ] Generate button enabled when prompt entered
- [ ] Onboarding banner shows when no models
- [ ] RTL layout works for Arabic locale

#### Text-to-Image Page
- [ ] Form loads with all advanced options
- [ ] Model selector shows downloaded models
- [ ] Negative prompt toggle works
- [ ] Generation starts and shows progress
- [ ] Results appear in gallery
- [ ] Queue system functions correctly

#### Image-to-Image Page
- [ ] Input image upload works
- [ ] Strength slider updates preview
- [ ] Mask drawing tools functional
- [ ] Generation uses input image correctly

#### Inpainting Page
- [ ] Mask drawing tools work
- [ ] Inpaint area generates correctly
- [ ] Blend slider affects edges

#### Models Page
- [ ] Model cards display correctly
- [ ] Download/install flow works
- [ ] Filtering by type works
- [ ] Custom model import functions

#### History Page
- [ ] Grid loads generated images
- [ ] Filtering by date/model works
- [ ] Image preview on click
- [ ] Delete/export functions

#### Settings
- [ ] Theme toggle (light/dark) works
- [ ] Language selector changes locale
- [ ] Paths configuration saves
- [ ] Advanced options accessible

#### Responsive Testing
| Viewport | Test Cases |
|----------|------------|
| 375px (iPhone SE) | Sidebar collapses, grid = 1 col, prompt input full width |
| 768px (iPad) | Sidebar toggle works, grid = 2 col, mode pills horizontal scroll areas side-by-side |
| 1024px (MacBook) | Sidebar expanded, grid = 3 col, full layout |
| 1440px (Desktop) | Grid = 4 col, generous spacing |

#### Accessibility Testing
- [ ] Tab through entire interface
- [ ] Screen reader (VoiceOver) reads all elements
- [ ] Color contrast passes WCAG AA
- [ ] RTL layout for Arabic (text direction, icons)
- [ ] Reduced motion respected
- [ ] Focus indicators visible

---

## 6. Implementation Files

### Primary Design System File
```
electron_app/src/assets/css/theme.css
```
Complete design token system and component library (2700+ lines)

### Design Documentation
```
docs/design_system.md          # This document
docs/design/inspiration-hub-mockup.html  # Interactive mockup
```

### Testing Scripts
```
scripts/prepare_doc_screenshots.py
scripts/capture_screenshots.sh
scripts/compose_txt2img_screenshot.py
scripts/verify_doc_screenshots.py
scripts/ensure_doc_screenshots.sh
```

### Screenshots Output
```
docs/screenshots/
├── 01-homepage.png
├── 02-txt2img.png
├── 03-img2img.png
├── 04-inpainting.png
├── 05-upscaler.png
├── 06-models.png
├── 07-history.png
└── sample-generation.png
```

---

## 7. Backward Compatibility

The design system includes legacy class mappings to ensure existing Vue components continue working:

| Legacy Class | Maps To |
|--------------|---------|
| `.l_button` | `.btn` (ghost variant) |
| `.l_button.button_colored` | `.btn-primary` |
| `.sidebar_item` | `.nav-item` |
| `.options_input` | `.form-input` wrapper |
| `.form-control` | `.form-input` |
| `.dropdown-menu` | `.dropdown-menu` (enhanced) |
| `.tabs_bar` | `.tabs` |
| `.image_area` | `.card` |
| `.splash_screen` | Background color var |

---

## 8. Migration Guide

### For New Components
1. Use design tokens via CSS custom properties
2. Apply component classes (`.btn`, `.card`, `.form-input`, etc.)
3. Follow responsive grid patterns (`.grid`, `.grid-cols-auto`)
4. Include proper ARIA attributes
5. Test in both light/dark modes
5. Verify RTL layout

### For Existing Components
1. Remove custom CSS that duplicates design system
2. Replace hardcoded values with design tokens
3. Update to semantic color names
4. Apply consistent spacing scale
5. Add focus-visible states

---

## 9. Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.4.0 | 2026-07-16 | Complete design system rewrite with tokens, components, accessibility |
| 2.3.x | 2026-06 | Legacy CSS with hardcoded values, limited theming |

---

## 10. Contributing

### Adding New Components
1. Define in `theme.css` using design tokens
2. Document in this file
3. Add to Storybook (if available)
4. Include RTL variants
5. Test accessibility

### Updating Design Tokens
1. Modify values in `theme.css` `:root`
2. Test across all breakpoints
3. Update documentation
4. Run visual regression tests

---

*Generated as part of DiffusionBee v2.4.0 design system overhaul*