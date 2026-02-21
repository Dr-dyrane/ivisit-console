# 🛠️ Layout & PWA Stability Validation

## 🎯 Task Objective
Ensuring the PWA remains "unboxed" (fullscreen) while maintaining ultra-reliable layout stability and interaction accuracy.

## 📋 Validation Checklist

### 1. Root Architecture
- [ ] `html`, `body`, and `#root` must use `100dvh` or `-webkit-fill-available` to ensure edge-to-edge layout.
- [ ] `body` must be `position: fixed` to prevent "rubber-banding" (elastic bounce) on iOS.
- [ ] Any "pinning" strategy (`position: fixed` on `#root`) must be balanced against `z-index` so hover coordinate mapping (tooltips/islands) doesn't break.

### 2. Interaction & Visuals
- [ ] **Hover Accuracy**: Verify that hover glows and isalnds show up exactly under the cursor (coordinate alignment).
- [ ] **Glass Transparency**: Ensure `.glass-card-premium` does NOT have an opaque background override (must be translucent).
- [ ] **Core Tokens**: Verify `--glow-*` variables exist in `:root`.

### 3. PWA Fulscreen (Unboxing)
- [ ] **iPhone 16 Support**: Verify `index.html` viewport does not use `height=device-height` (force resolution fallback).
- [ ] **Startup Images**: Ensure only a single, high-resolution startup image is used per device to prevent resolution downscaling.

---

## 📅 Audit Log

### v1.0.15 - 2026-02-21
- **Status**: ✅ PASS
- **Scope**: Restoration of Glow Tokens and Translucency.
- **Git Context**: Audited against `cf8340b` (Stable Ground Truth).
- **Verification**: Hover glows restored, PWA remains unboxed.
