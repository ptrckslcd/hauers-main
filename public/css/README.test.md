# Design Token and Typography Unit Tests

## Overview

This directory contains unit tests for the design system defined in `base.css` and `landing.css`. The tests verify that design tokens meet accessibility standards, follow the architectural grid system, and that the typography system implements the correct font families, type scales, and responsive adjustments.

## Test Coverage

### 1. Color Contrast Ratios - WCAG AA Standards

**Validates: Requirements 1.2, 2.4, 10.4**
**Test file**: `base.test.js`

Tests verify that color combinations meet WCAG AA accessibility standards:

- **Body text (4.5:1 ratio)**: Tests verify that `--text-main` and `--text-subdued` meet the 4.5:1 contrast ratio against background colors (`--bg-base`, `--card-bg`)
- **Large text (3:1 ratio)**: Tests verify that headings and large UI elements meet the 3:1 contrast ratio
- **Button text**: Tests verify that button text has sufficient contrast against button backgrounds
- **Both themes**: All contrast tests run for both light and dark modes

### 2. Spacing Scale - 4px Base Unit

**Validates: Requirements 1.2**
**Test file**: `base.test.js`

Tests verify that the spacing scale follows the 4px architectural grid:

- All spacing tokens (`--space-2xs` through `--space-2xl`) are defined
- Each spacing value is a multiple of 4px
- Spacing values match the design specification:
  - `--space-2xs`: 4px (0.25rem)
  - `--space-xs`: 8px (0.5rem)
  - `--space-sm`: 16px (1rem)
  - `--space-md`: 24px (1.5rem)
  - `--space-lg`: 40px (2.5rem)
  - `--space-xl`: 64px (4rem)
  - `--space-2xl`: 104px (6.5rem)

### 3. Shadow Values - Proper Definition

**Validates: Requirements 2.4**
**Test file**: `base.test.js`

Tests verify that shadow values are properly defined:

- All shadow tokens are defined with valid CSS syntax
- Shadow values use `rgba()` color format for transparency
- Shadow values include proper offset, blur, and spread values
- Both light and dark mode shadows are defined

### 4. Token Consistency

**Test file**: `base.test.js`

Tests verify that all required design tokens are defined:

- All color tokens are present in both light and dark modes
- All spacing tokens are defined
- All shadow tokens are defined

### 5. Typography System

**Validates: Requirements 8.1, 8.2, 8.3**
**Test file**: `typography.test.js`

Tests verify the typography system implementation across `base.css` and `landing.css`:

#### Font Family Fallback Chain (8.1)
- Plus Jakarta Sans is used for all headings with proper fallback chain
- Inter is used for body text with system font fallbacks
- All font families end with `sans-serif` as final fallback
- Hero title and section titles use Plus Jakarta Sans

#### Type Scale Ratios (8.2)
- Hero title: 4.7rem (75.2px)
- Section title: 2.45rem (39.2px)
- CTA title: 2.35rem (37.6px)
- Feature heading: 1.18rem (18.88px)
- Hero subtitle: 1.12rem (17.92px)
- Section sub: 1.02rem (16.32px)
- Eyebrow text: 0.72rem (11.52px)
- Type scale maintains proper hierarchy from largest to smallest

#### Responsive Font Size Adjustments (8.3)
- **Mobile (< 720px)**:
  - Hero title: 2.65rem
  - Section title: 2rem
  - CTA title: 1.85rem
  - Hero subtitle: 1rem
- **Tablet (720px - 1060px)**:
  - Hero title: 3.65rem
  - Section title: 2.45rem (unchanged)
- **Desktop (> 1060px)**:
  - Full type scale sizes
- Progressive font size reduction from desktop to mobile
- Minimum 16px base maintained on mobile for readability

#### Font Weight Consistency
- Weight 800 for hero title, section title, eyebrow text, and buttons
- Consistent weight application across typography elements

#### Line Height and Letter Spacing
- Hero title: line-height 0.98, letter-spacing 0
- Section title: line-height 1.08
- Hero subtitle: line-height 1.7
- Section sub: line-height 1.65
- Eyebrow text: letter-spacing 0.12em

## Running Tests

```bash
# Run all tests once
npm test

# Run specific test file
npm test -- base.test.js
npm test -- typography.test.js

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Test Framework

- **Framework**: Vitest
- **Environment**: jsdom
- **Test files**: 
  - `public/css/base.test.js` (Design tokens)
  - `public/css/typography.test.js` (Typography system)

## Test Implementation Details

### Color Contrast Calculation

The tests implement the WCAG 2.1 contrast ratio algorithm:

1. Convert hex colors to RGB
2. Calculate relative luminance for each color
3. Calculate contrast ratio: `(lighter + 0.05) / (darker + 0.05)`

### Spacing Validation

The tests parse CSS custom properties and convert rem values to pixels (assuming 16px base font size) to verify the 4px grid system.

### Shadow Validation

The tests use regex patterns to verify that shadow values follow valid CSS syntax and include all required components (offset-x, offset-y, blur-radius, color).

### Typography Validation

The tests parse CSS files to extract:
- Font family declarations from selectors
- Font size values from class definitions
- Media query content for responsive breakpoints
- Font weight, line height, and letter spacing values

The tests handle nested CSS structures and multi-line declarations to accurately verify typography implementation.

## Maintenance

When updating design tokens or typography in `base.css` or `landing.css`:

1. Run the tests to ensure changes don't break accessibility standards or design specifications
2. Update test expectations if intentionally changing token or typography values
3. Add new tests for any new token categories or typography elements

## Related Files

- `public/css/base.css` - Design token definitions and base typography
- `public/css/landing.css` - Landing page typography and responsive styles
- `.kiro/specs/landing-page-redesign/design.md` - Design system specification
- `.kiro/specs/landing-page-redesign/requirements.md` - Accessibility and typography requirements
