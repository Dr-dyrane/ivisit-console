---
description: UI/UX Standards and Anti-Shadow Patterns
---

# UI/UX Standards (Alexander UI Console)

Follow these non-negotiable standards for all UI updates to skip redundant cycles and avoid re-introduction of unwanted patterns.

## 1. The "No Borders" Mandate
- **NEVER** use explicit borders (`border`, `border-white/5`, etc.) for element separation unless explicitly asked.
- **DEPTH OVER COLOR**: Separation must be achieved through:
    - **Shadows**: Subtle `shadow-sm` or `shadow-md` (Avoid `shadow-lg` for sticky elements).
    - **Layered Transparency**: Using `bg-muted/[opacity]` (e.g., `bg-muted/30`, `bg-muted/60`).
    - **Glassmorphism**: Using `apple-glass` or `backdrop-blur` utilities.

## 2. Typography & Density
- **Priority**: Follow existing typography (font weight, size, tracking) exactly. 
- **Hierarchy**: Use `font-semibold` or `font-bold` sparingly for high-level values or headers.
- **Uppercase**: Only use uppercase with tracking (e.g., `tracking-widest`) for small labels/sub-headers, never for main content.

## 3. Muted Surface Contrast
- **Token**: Always use the defined `bg-muted` token for section backgrounds.
- **Constraint**: Ensure there is a perceptible difference between the main background and the nested card backgrounds (typically 6-8% HSL lightness gap).

## 4. Mobile Refinement (Canon Alignment)
- **Rounding**: Standardize on `rounded-2xl` or `rounded-3xl` for all mobile cards and items.
- **Padding**: Prioritize high data density. Reduce horizontal/vertical padding to the minimum required for touchability.
- **No-Scrollbar**: Use `no-scrollbar` (horizontal or vertical) for panels to maintain a clean "Apple-level" aesthetic.

## 5. Persistence Rule
- If the USER manually reverts a style change (e.g., restores a logo subtitle, changes a font weight), **DO NOT OVERWRITE** it again. Treat the manual revert as the updated "Gold Standard" for that specific area.
