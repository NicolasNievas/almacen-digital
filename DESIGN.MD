---
version: alpha
name: Aura-Boutique-design-system
description: A high-end contemporary fashion boutique interface. Relies on radical whitespace, ultra-minimalist framing, and large, uncropped photography. The interface should disappear, letting the products breathe. Flat design is prioritized; shadows are practically non-existent.

colors:
  primary: "#FAD4D8"
  primary-hover: "#F5C2C7"
  on-primary: "#1A1918"
  canvas: "#FAF9F6"
  surface-soft: "#F4F3EF"
  ink: "#1A1918"
  ink-muted: "#737373"
  divider-soft: "#E5E5E5"

typography:
  display-hero:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: 56px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.02em
  display-lg:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.01em
  heading-md:
    fontFamily: "var(--font-playfair), Georgia, serif"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0
  body-md:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  nav-link:
    fontFamily: "var(--font-inter), system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0.05em
    textTransform: uppercase

rounded:
  none: 0px
  sm: 4px
  md: 8px
  pill: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 96px

components:
  boutique-navbar:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 80px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
    padding: 12px 24px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
    padding: 12px 24px
  product-card:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 0px
---

## Overview

Aura Indumentaria is a premium boutique experience. The UI acts as a minimal gallery frame for fashion photography. The background is exclusively off-white/nude (`{colors.canvas}`), never pure white. The primary accent is a soft grapefruit pink (`{colors.primary}`), used deliberately and sparingly.

**Key Characteristics:**
- Typography contrast is extreme: Playfair Display for elegant, large, tightly tracked headings, paired with Inter for clean, highly legible body text and uppercase UI labels.
- Borders and containers are invisible. Products sit directly on the canvas.
- No heavy shadows. No gradients. No rounded bubbles.

## Components

### Top Navigation

**`boutique-navbar`** — Structural and minimal. Must span the full width with `{spacing.xl}` horizontal padding.
- Left: Navigation links in `{typography.nav-link}` (uppercase, tracked out).
- Center: The brand logo or wordmark in `{typography.display-lg}`.
- Right: Minimal utility icons (Search, Cart, User) using `lucide-react` with `strokeWidth={1.5}`.

### Buttons

**`button-primary`** — The main call to action (e.g., "Add to Bag"). 
- Uses `{colors.primary}` with `{colors.on-primary}` text. 
- Corners are subtly rounded (`{rounded.md}`). Never fully pill-shaped.

### Cards

**`product-card`** — The showcase container for clothing.
- Invisible boundaries. Do not wrap products in boxes with borders.
- Images must maintain an aspect ratio of 3:4 or 4:5 (portrait fashion photography).
- Below the image: Product name in `{typography.body-md}` and price, aligned cleanly without excessive styling.

## Do's and Don'ts

### Do
- Use `{colors.canvas}` (`#FAF9F6`) as the global background.
- Apply massive whitespace between sections (`{spacing.section}` or `py-24` in Tailwind).
- Ensure all icons (`lucide-react`) are delicate (`strokeWidth={1.5}`) to match the premium editorial feel.
- Respect the typography hierarchy: Playfair for display, Inter for UI.

### Don't
- Don't use pure white (`#FFFFFF`) or pure black (`#000000`).
- Don't add drop shadows to cards, images, or buttons. The design must remain flat and editorial.
- Don't use heavy borders. If a divider is strictly necessary, use `{colors.divider-soft}` at 1px.
- Don't use colored backgrounds for product cards.