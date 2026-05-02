# Design Document: Landing Page Redesign

## Overview

This design document specifies the visual design system, component architecture, and implementation details for the CSPC ACCESS Hauers landing page redesign. The redesign transforms the current generic landing page into a professional institutional interface with strong visual hierarchy, meaningful iconography, and content that accurately reflects the adaptive CSE-PPT review context.

### Design Goals

1. **Establish Visual Hierarchy**: Create clear information architecture through typography, color, and spacing
2. **Strengthen Brand Identity**: Reflect CSPC ACCESS institutional character through color, terminology, and visual elements
3. **Improve Readability**: Ensure all content meets WCAG AA contrast standards and uses appropriate typography
4. **Enhance Engagement**: Use meaningful visual elements and clear calls-to-action to guide reviewees
5. **Maintain Accessibility**: Support keyboard navigation, screen readers, and reduced motion preferences
6. **Optimize Performance**: Minimize HTTP requests and ensure fast load times

### Design Principles

- **Institutional Over Generic**: Every design choice should reflect academic professionalism rather than commercial marketing
- **Content Over Decoration**: Visual elements should support content comprehension, not distract from it
- **Contrast Over Subtlety**: Use strong color contrast and clear boundaries between sections
- **Clarity Over Cleverness**: Straightforward layouts and terminology over creative ambiguity

## Architecture

### System Architecture

The landing page follows a server-rendered architecture with progressive enhancement:

```
┌─────────────────────────────────────────────────────────┐
│                     Express Server                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Landing Route Handler                 │    │
│  │  GET / → renders landing.ejs                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   EJS Template Layer                     │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐               │
│  │  landing.ejs   │  │   Partials     │               │
│  │                │  │  - header.ejs  │               │
│  │  - Hero        │  │  - footer.ejs  │               │
│  │  - Briefing    │  └────────────────┘               │
│  │  - Features    │                                     │
│  │  - Coverage    │                                     │
│  │  - Steps       │                                     │
│  │  - CTA         │                                     │
│  └────────────────┘                                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    CSS Layer (Cascade)                   │
│                                                          │
│  base.css → layout.css → landing.css                   │
│  (tokens)   (header/footer) (page-specific)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Client-Side Enhancement                  │
│                                                          │
│  - theme-toggle.js (dark mode)                          │
│  - main.js (scroll reveal, animations)                  │
│  - Inline scripts (bar animations, intersection obs)    │
└─────────────────────────────────────────────────────────┘
```

### Page Structure

The landing page consists of 7 major sections rendered in sequence:

1. **Hero Section**: Primary value proposition with visual preview card
2. **Briefing Section**: Three-step review path summary
3. **Features Section**: Editorial layout with 5 key platform features
4. **Coverage Section**: CSE domain coverage cards
5. **Steps Section**: Detailed process timeline
6. **CTA Section**: Final call-to-action before footer
7. **Footer**: Site navigation and institutional information

## Components and Interfaces

### Design Token System

All visual properties are defined through CSS custom properties in `base.css`:

#### Color Tokens

**Light Mode:**
```css
--bg-base: #E4EBF4          /* Page background */
--card-bg: #FFFFFF          /* Card surfaces */
--input-bg: #F8FAFC         /* Form inputs */

--border-default: #B0C4DF   /* Standard borders */
--border-strong: #8AA7C9    /* Emphasized borders */
--border-subdued: rgba(37, 99, 235, 0.12)  /* Subtle dividers */

--text-main: #0F172A        /* Primary text */
--text-subdued: #3A5274     /* Secondary text */
--text-muted: #6482A6       /* Tertiary text */

--fs-blue: #2563EB          /* Primary brand */
--fs-blue-dark: #1E40AF     /* Primary brand dark */
--fs-blue-light: #60A5FA    /* Primary brand light */
--fs-gold: #F5A623          /* Accent brand */
--fs-gold-dark: #D48C1A     /* Accent brand dark */
```

**Dark Mode:**
```css
--bg-base: #0B1120
--card-bg: #111827
--input-bg: #1A2538

--border-default: #1F2E47
--border-strong: #2D4065
--border-subdued: rgba(255, 255, 255, 0.06)

--text-main: #E8EDF8
--text-subdued: #7A93B5
--text-muted: #4B6183

--fs-button-bg: #3B82F6
--fs-button-hover: #2563EB
```

#### Spacing Tokens

Based on 4px architectural grid:

```css
--space-2xs: 0.25rem  /* 4px */
--space-xs:  0.5rem   /* 8px */
--space-sm:  1rem     /* 16px */
--space-md:  1.5rem   /* 24px */
--space-lg:  2.5rem   /* 40px */
--space-xl:  4rem     /* 64px */
--space-2xl: 6.5rem   /* 104px */
```

#### Shadow Tokens

```css
--card-shadow: 0 2px 8px rgba(15, 23, 42, 0.12), 
               0 8px 24px rgba(15, 23, 42, 0.08)
--card-shadow-hover: 0 10px 30px rgba(15, 23, 42, 0.16), 
                     0 3px 10px rgba(15, 23, 42, 0.10)
--shadow-blue: 0 6px 24px rgba(37, 99, 235, 0.22)
--focus-glow: 0 0 0 3px rgba(37, 99, 235, 0.2), 
              0 2px 8px rgba(15, 23, 42, 0.06)
```

### Typography System

#### Font Families

```css
/* Headings */
font-family: 'Plus Jakarta Sans', sans-serif

/* Body Text */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

#### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| Hero Title | 4.7rem (75.2px) | 800 | 0.98 | 0 |
| Section Title | 2.45rem (39.2px) | 800 | 1.08 | 0 |
| CTA Title | 2.35rem (37.6px) | 800 | 1.12 | 0 |
| Feature Heading | 1.18rem (18.88px) | 800 | 1.25 | 0 |
| Body Large | 1.12rem (17.92px) | 400 | 1.7 | 0 |
| Body Default | 1rem (16px) | 400 | 1.65 | 0 |
| Body Small | 0.875rem (14px) | 400 | 1.6 | 0 |
| Eyebrow | 0.72rem (11.52px) | 800 | 1.35 | 0.12em |

#### Responsive Typography

```css
/* Mobile (< 720px) */
.hero-title: 2.65rem
.section-title: 2rem
.cta-title: 1.85rem

/* Tablet (720px - 1060px) */
.hero-title: 3.65rem
.section-title: 2.45rem (unchanged)

/* Desktop (> 1060px) */
.hero-title: 4.7rem
.section-title: 2.45rem
```

### Component Specifications

#### 1. Hero Section

**Layout:**
- Two-column grid: `1.08fr` (content) | `0.92fr` (visual)
- Max width: 1220px
- Padding: 5rem 2rem 4.75rem
- Gap: clamp(2.25rem, 5vw, 5rem)

**Components:**
- Hero Kicker: Institutional badges (CSPC ACCESS, CSE-PPT)
- Hero Title: Primary headline (4.7rem, weight 800)
- Hero Subtitle: Supporting copy (1.12rem, line-height 1.7)
- Hero Actions: Primary + Ghost button pair
- Hero Ledger: 3-column data grid (Target, Scope, Practice bank)
- Hero Visual: Score preview card with domain breakdown

**Score Preview Card Structure:**
```
┌─────────────────────────────────────────┐
│ Header: Label + Live indicator          │
├─────────────────────────────────────────┤
│ Score Block: 76% + Target chip          │
│ Ruler: 0 - 40 - 80 - 100               │
│ Progress Bar: 76% fill with 80% marker │
├─────────────────────────────────────────┤
│ Next Assignment Card                     │
├─────────────────────────────────────────┤
│ Domain Breakdown (4 rows):              │
│ - Verbal: 82%                           │
│ - Numerical: 64%                        │
│ - Analytical: 77%                       │
│ - Gen. Info: 58%                        │
└─────────────────────────────────────────┘
```

#### 2. Briefing Section

**Layout:**
- Three-column grid: `1fr 1fr 1fr`
- Card-based design with borders
- First card: Blue background (--fs-blue-dark)
- Cards 2-3: White background (--card-bg)

**Content Pattern:**
```
┌──────────────────┐
│ 01               │
│ Baseline test    │
│ Description...   │
└──────────────────┘
```

#### 3. Features Section

**Layout:**
- Editorial two-column: `0.72fr` (sticky sidebar) | `1.28fr` (content)
- Sidebar: Sticky at `top: 112px`
- Content: Vertical stack of feature items

**Feature Item Structure:**
```
┌─────────────────────────────────────────────────┐
│ 01  │  Diagnostic Assessment                    │
│     │  Description paragraph...                 │
└─────────────────────────────────────────────────┘
```

- Grid: `190px` (number + title) | `minmax(0, 1fr)` (description)
- Border-top: 1.5px solid --border-default
- Last item gets border-bottom

#### 4. Coverage Section

**Layout:**
- Two-column: `0.85fr` (copy) | `1fr` (cards)
- Top border: 2px solid --text-main
- Bottom border: 1.5px solid --border-default

**Coverage Card Structure:**
```
┌─────────────────────────────────────┐
│ ● Ability Tests          CORE       │
├─────────────────────────────────────┤
│ • Verbal Ability         [TRACKED]  │
│ • Numerical Ability      [TRACKED]  │
│ • Analytical Ability     [TRACKED]  │
└─────────────────────────────────────┘
```

- Header: Colored dot + title + meta label
- List items: Bullet + text + optional badge

#### 5. Steps Section

**Layout:**
- Three-column timeline: `1.2fr 1fr 1fr`
- First card: Active state (blue background)
- Cards 2-3: Default state (white background)

**Step Item Structure:**
```
┌──────────────────────────┐
│ ●  │  01                 │
│ │  │  Take Diagnostic    │
│ │  │  Description...     │
│ │  │                     │
└──────────────────────────┘
```

- Marker column: Dot + vertical line
- Content column: Number + title + description
- Active state: Gold dot with glow effect

#### 6. CTA Section

**Layout:**
- Two-column: `minmax(0, 1fr)` (copy) | `minmax(220px, auto)` (actions)
- Background: --fs-blue-dark
- Border: 1.5px solid gold
- Border-radius: 8px
- Padding: 2.4rem

**Button Hierarchy:**
- Primary: Gold background (--fs-gold)
- Ghost: Transparent with white border

### Icon System

The landing page uses inline SVG icons for:

1. **Arrow Right** (CTA buttons):
```svg
<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
</svg>
```

2. **Status Indicators**:
- Live dot: 7px circle with box-shadow glow
- Domain dots: 9px circles (blue for primary, gold for secondary)
- Progress markers: 2px vertical line

3. **Visual Register** (Hero):
- Vertical text labels: "ACCESS" and "CSE-PPT"
- Writing-mode: vertical-rl
- Transform: rotate(180deg)

### Button Components

#### Primary Button

```css
.btn-primary {
  background: var(--fs-blue);
  color: oklch(0.99 0.006 255);
  border: 1.5px solid var(--fs-blue);
  padding: 0.8rem 1.45rem;
  border-radius: 8px;
  font-weight: 800;
  box-shadow: 0 8px 18px oklch(0.42 0.17 260 / 0.24);
}

.btn-primary:hover {
  background: var(--fs-blue-dark);
  transform: translateY(-2px);
  box-shadow: 0 14px 28px oklch(0.35 0.17 260 / 0.28);
}
```

#### Ghost Button

```css
.btn-ghost {
  color: var(--text-main);
  background: var(--card-bg);
  border: 1.5px solid var(--border-default);
  padding: 0.8rem 1.25rem;
  border-radius: 8px;
  font-weight: 800;
}

.btn-ghost:hover {
  color: var(--fs-blue-dark);
  border-color: var(--fs-blue);
  background: oklch(0.97 0.018 255);
}
```

#### CTA Primary Button (Gold)

```css
.btn-cta-primary {
  background: var(--fs-gold);
  color: oklch(0.22 0.035 82);
  border: 1.5px solid var(--fs-gold);
  padding: 0.82rem 1.35rem;
  box-shadow: 0 8px 20px oklch(0.72 0.15 82 / 0.24);
}

.btn-cta-primary:hover {
  background: oklch(0.84 0.14 82);
  transform: translateY(-2px);
}
```

### Layout Specifications

#### Container Widths

```css
.hero-section,
.briefing-section,
.features-section,
.coverage-section,
.steps-section,
.cta-section {
  width: min(100%, 1220px);
  margin: 0 auto;
  padding-inline: 2rem;
}
```

#### Section Padding

```css
.hero-section: 5rem 2rem 4.75rem
.briefing-section: 0 2rem 4.5rem
.features-section: 4.25rem 2rem 5rem
.coverage-section: 2rem 2rem 5rem
.steps-section: 3rem 2rem 5rem
.cta-section: 1.5rem 2rem 6rem
```

### Responsive Breakpoints

#### Desktop (> 1060px)
- All multi-column layouts active
- Full typography scale
- Sticky sidebar in features section

#### Tablet (720px - 1060px)
- Hero: Single column stack
- Features: Single column (sidebar no longer sticky)
- Coverage: Single column
- Steps: Single column
- Hero title: 3.65rem

#### Mobile (< 720px)
- All sections: Single column
- Hero title: 2.65rem
- Section title: 2rem
- Full-width buttons
- Reduced padding: 1rem inline
- Ledger/Briefing: Vertical stack
- Grid backgrounds: 56px (from 80px)

### Dark Mode Implementation

#### Theme Toggle

Located in header, controlled by `theme-toggle.js`:

```javascript
// Reads from localStorage: 'theme'
// Applies data-theme="dark" to <html>
// Persists preference across sessions
```

#### Dark Mode Color Adjustments

```css
[data-theme='dark'] {
  /* Surfaces become darker */
  --bg-base: #0B1120
  --card-bg: #111827
  
  /* Borders become lighter */
  --border-default: #1F2E47
  --border-strong: #2D4065
  
  /* Text inverts */
  --text-main: #E8EDF8
  --text-subdued: #7A93B5
  
  /* Shadows become darker */
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 
                 0 4px 16px rgba(0, 0, 0, 0.2)
}
```

#### Logo Handling

```css
/* ACCESS logo inverts in dark mode */
[data-theme="dark"] .logo-access {
  filter: invert(1);
  opacity: 0.9;
}
```

### Accessibility Patterns

#### Semantic HTML

```html
<main id="main-content" class="landing-main">
  <section class="hero-section">
    <h1 class="hero-title">...</h1>
  </section>
  
  <section class="features-section" id="features">
    <h2 class="section-title">...</h2>
  </section>
</main>
```

#### ARIA Labels

```html
<!-- Decorative elements -->
<div class="visual-register" aria-hidden="true">

<!-- Descriptive labels -->
<div class="hero-ledger" aria-label="Readiness ledger">

<!-- Live regions -->
<div class="spc-live">
  <span class="spc-live-dot"></span>
  Updating
</div>
```

#### Focus Management

```css
/* Keyboard focus indicator */
button:focus-visible,
a:focus-visible {
  outline: none;
  box-shadow: var(--focus-glow);
}
```

#### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  [data-reveal],
  .spc-bar-fill,
  .spc-domain-fill,
  .btn-primary,
  .btn-ghost {
    transition: none;
  }
}
```

#### Skip Links

```html
<!-- In header partial -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

#### Alt Text Requirements

All images and icons must have appropriate alt text:
- Logos: "CSPC ACCESS logo", "Hauers logo"
- Decorative SVGs: `aria-hidden="true"`
- Functional icons: Descriptive text in adjacent span

## Data Models

### Theme Preference

```typescript
interface ThemePreference {
  theme: 'light' | 'dark'
  storage: 'localStorage'
  key: 'theme'
}
```

### Scroll Reveal State

```typescript
interface RevealElement {
  element: HTMLElement
  delay: number // 0, 1, 2, 3, 4
  threshold: number // 0.12
  isVisible: boolean
}
```

### Animation Data

```typescript
interface BarAnimation {
  element: HTMLElement
  targetWidth: number // from data-width attribute
  duration: number // 1.1s - 1.2s
  delay: number // 0.25s - 0.45s
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
}
```

## Error Handling

### Font Loading Failures

```css
/* System font fallbacks */
font-family: 'Plus Jakarta Sans', sans-serif;
/* Falls back to: sans-serif */

font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
/* Falls back through chain */
```

### JavaScript Enhancement Failures

All JavaScript features are progressive enhancements:

1. **Scroll Reveal**: Page is fully readable without animations
2. **Bar Animations**: Bars display at 0% width if JS fails
3. **Theme Toggle**: Defaults to light mode if localStorage unavailable

### Image Loading Failures

```html
<!-- SVG logos are inline, no external dependencies -->
<img src="/assets/access-logo.svg" alt="ACCESS logo" 
     onerror="this.style.display='none'">
```

### CSS Custom Property Fallbacks

```css
/* Not required - all browsers support CSS custom properties */
/* Fallback is to use default browser styles */
```

## Testing Strategy

### Visual Regression Testing

**Tool**: Playwright with screenshot comparison

**Test Cases**:
1. Hero section renders correctly (light mode)
2. Hero section renders correctly (dark mode)
3. All sections visible on desktop viewport (1920x1080)
4. All sections visible on tablet viewport (768x1024)
5. All sections visible on mobile viewport (375x667)
6. Theme toggle switches between light and dark
7. Hover states on all buttons
8. Focus states on all interactive elements

**Implementation**:
```javascript
// tests/landing-visual.spec.js
test('hero section matches snapshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const hero = await page.locator('.hero-section');
  await expect(hero).toHaveScreenshot('hero-light.png');
});
```

### Accessibility Testing

**Tool**: axe-core via Playwright

**Test Cases**:
1. No color contrast violations (WCAG AA)
2. All images have alt text
3. Heading hierarchy is correct (h1 → h2 → h3)
4. All interactive elements are keyboard accessible
5. Focus indicators are visible
6. ARIA labels are present where required
7. Reduced motion preference is respected

**Implementation**:
```javascript
// tests/landing-a11y.spec.js
test('landing page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Responsive Design Testing

**Tool**: Playwright with multiple viewports

**Test Cases**:
1. Layout adapts correctly at 1920px width
2. Layout adapts correctly at 1280px width
3. Layout adapts correctly at 1024px width
4. Layout adapts correctly at 768px width
5. Layout adapts correctly at 375px width
6. No horizontal scroll at any breakpoint
7. Touch targets are at least 44x44px on mobile

**Implementation**:
```javascript
// tests/landing-responsive.spec.js
test.describe('responsive layouts', () => {
  test('mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const hero = await page.locator('.hero-section');
    expect(await hero.evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    )).toBe('1fr');
  });
});
```

### Performance Testing

**Tool**: Lighthouse CI

**Metrics**:
- Performance score: ≥ 90
- Accessibility score: 100
- Best Practices score: ≥ 95
- SEO score: 100

**Test Cases**:
1. First Contentful Paint < 1.8s
2. Largest Contentful Paint < 2.5s
3. Total Blocking Time < 200ms
4. Cumulative Layout Shift < 0.1
5. Time to Interactive < 3.8s

**Implementation**:
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
      },
    },
  },
};
```

### Cross-Browser Testing

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Cases**:
1. All sections render correctly
2. CSS Grid layouts work
3. CSS Custom Properties apply
4. Fonts load correctly
5. Animations run smoothly
6. Theme toggle works
7. Scroll reveal works

### Manual Testing Checklist

**Visual Design**:
- [ ] Typography scale is consistent
- [ ] Color contrast meets WCAG AA
- [ ] Spacing follows token system
- [ ] Borders are visible and consistent
- [ ] Shadows create appropriate depth
- [ ] Icons are crisp at all sizes

**Interaction**:
- [ ] All buttons have hover states
- [ ] All links have hover states
- [ ] Focus indicators are visible
- [ ] Scroll reveal animations trigger
- [ ] Bar animations complete
- [ ] Theme toggle switches modes

**Content**:
- [ ] All text is readable
- [ ] No lorem ipsum or placeholder text
- [ ] Institutional terminology is used
- [ ] CSE-PPT context is clear
- [ ] CTAs are clear and actionable

**Responsive**:
- [ ] Desktop layout is optimal
- [ ] Tablet layout adapts correctly
- [ ] Mobile layout is usable
- [ ] No horizontal scroll
- [ ] Touch targets are adequate

**Accessibility**:
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Alt text is descriptive
- [ ] ARIA labels are appropriate
- [ ] Reduced motion is respected

### Integration Testing

**Test Cases**:
1. Header renders with correct logo
2. Footer renders with correct links
3. Theme preference persists across page loads
4. Navigation links work correctly
5. CTA buttons link to correct routes
6. Login/Signup links work

**Implementation**:
```javascript
// tests/landing-integration.spec.js
test('CTA buttons link correctly', async ({ page }) => {
  await page.goto('/');
  
  const primaryCTA = page.locator('.btn-primary').first();
  await expect(primaryCTA).toHaveAttribute('href', '/signup');
  
  const ghostCTA = page.locator('.btn-ghost').first();
  await expect(ghostCTA).toHaveAttribute('href', '/login');
});
```

## Implementation Notes

### CSS Architecture

The CSS follows a three-layer cascade:

1. **base.css**: Design tokens, reset, global styles
2. **layout.css**: Header, footer, shared layout components
3. **landing.css**: Page-specific styles

This ensures:
- Token changes propagate automatically
- Layout components are reusable
- Page styles don't leak to other pages

### JavaScript Enhancement Strategy

All JavaScript is progressive enhancement:

1. **Critical**: Theme toggle (enhances UX but not required)
2. **Enhancement**: Scroll reveal (page works without it)
3. **Polish**: Bar animations (visual enhancement only)

### Performance Optimizations

1. **Inline Critical CSS**: Consider inlining base.css for first paint
2. **Font Display**: Use `font-display: swap` for web fonts
3. **Defer Non-Critical JS**: Theme toggle loads in head, others defer
4. **Minimize Reflows**: Animations use transform/opacity only
5. **Lazy Load**: Consider lazy loading below-fold images (if added)

### Browser Support

**Target Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Graceful Degradation**:
- CSS Grid: Supported in all target browsers
- CSS Custom Properties: Supported in all target browsers
- Intersection Observer: Supported in all target browsers
- LocalStorage: Supported in all target browsers

### Maintenance Considerations

1. **Token Updates**: Change colors/spacing in base.css only
2. **Component Additions**: Follow existing naming conventions
3. **Responsive Changes**: Test all three breakpoints
4. **Dark Mode**: Always test both themes
5. **Accessibility**: Run axe-core after any changes

---

**Design Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Ready for Implementation