---
name: Hauers
description: Adaptive CSE Review — CSPC ACCESS
colors:
  primary: "#2563EB"
  primary-dark: "#1E40AF"
  primary-light: "#60A5FA"
  neutral-bg: "#E4EBF4"
  surface: "#FFFFFF"
  border: "#B0C4DF"
  border-strong: "#8AA7C9"
  text-main: "#0F172A"
  text-subdued: "#3A5274"
  accent-gold: "#F5A623"
  accent-orange: "#EA580C"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  "2xs": "4px"
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
---

# Design System: Hauers

## 1. Overview

**Creative North Star: "The Institutional Console"**

The Hauers design system is built to evoke the authority and precision of a high-stakes academic testing environment. It rejects the "startup" aesthetic of noisy gradients and playful blurs in favor of rigid geometry, solid surfaces, and high-contrast clarity.

The system is optimized for high information density without visual noise. Every element serves a functional purpose, mirroring the structured nature of the Civil Service Examination.

**Key Characteristics:**
- Rigid architectural grid (4px base).
- Deep institutional blues paired with high-contrast neutrals.
- Layered semantic shadows instead of translucency.
- Typographic hierarchy that signals authority.

## 2. Colors

The palette is professional and restrained, using a monochromatic blue foundation with strategic gold accents for urgency and achievement.

### Primary
- **Institutional Blue** (#2563EB): Used for primary actions, progress indicators, and brand presence.
- **Deep Navy** (#1E40AF): Used for headers and high-authority states.

### Neutral
- **Academic Gray** (#E4EBF4): The base background color, providing a solid foundation for cards.
- **Slate Text** (#0F172A): High-contrast text for maximum legibility.

### Named Rules
**The Rarity Rule.** The primary blue accent is used on ≤10% of any given screen. Its rarity ensures that interactive elements are immediately distinguishable.

## 3. Typography

**Display Font:** Plus Jakarta Sans
**Body Font:** Inter

The pairing combines a bold, geometric display face with a highly legible, neutral body face, balancing institutional authority with long-form readability.

### Hierarchy
- **Display** (800, clamp(2.5rem, 5vw, 4.7rem), 1.1): Used for hero titles.
- **Headline** (700, 2.45rem, 1.25): Used for section headers.
- **Body** (400, 1rem, 1.5): Standard reading text, capped at 75ch for comfort.
- **Label** (600, 0.72rem, 1): Used for eyebrows and meta-information.

## 4. Elevation

Hauers uses physical depth conveyed through solid layering and structured shadows. Surfaces do not overlap haphazardly; they sit on clearly defined planes.

### Shadow Vocabulary
- **Surface Shadow** (`0 2px 8px rgba(15, 23, 42, 0.12)`): Used for standard cards.
- **Interactive Shadow** (`0 10px 30px rgba(15, 23, 42, 0.16)`): Used for hover states.

## 5. Components

### Buttons
- **Shape:** Sharp corners (4px or 6px radius).
- **Primary:** Solid blue with bold white text.
- **Hover:** translateY(-2px) with a deepened shadow to signal tactility.

### Cards
- **Style:** 1.5px solid border (#B0C4DF) with a 12px radius.
- **Content:** Generous internal padding (24px) to prevent information crowding.

### Navigation
- **Sidebar:** Fixed width (240px) with a semi-hidden collapsed state. Uses high-contrast active states with a left accent bar.

## 6. Do's and Don'ts

### Do:
- **Do** use OKLCH for dynamic color tints.
- **Do** maintain a strict 4px grid rhythm.
- **Do** ensure every card has a visible 1.5px border.

### Don't:
- **Don't** use glassmorphism or background blurs.
- **Don't** use low-contrast text for primary information.
- **Don't** use side-stripe borders greater than 1px as a colored accent.
