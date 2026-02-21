# Semantic Icon System (Mobile)

## 1. Overview
The **Semantic Icon System** is a mobile-first UI pattern designed to communicate complex item states and metadata at a glance using high-density symbolic trays. It replaces bulky text badges with color-coded, filled icons to maintain a clean "Liquid Glass" look.

---

## 2. Design Principles

### 2.1 Symbolic Density (Canon #30)
Instead of labels like "Verified" or "Active", we use symbols. This reduces scan time and visual clutter.

### 2.2 Semantic Color Loyalty (Canon #7)
Color is never decorative. It denotes state:
- **Success (Green)**: Verified, Completed, Healthy.
- **Primary (Blue/Brand)**: Active, Primary Action, Focus.
- **Warning (Yellow/Orange)**: In-Progress, Pending.
- **Destructive (Red)**: Emergency, Inactive, Blocked.
- **Muted (Grayscale)**: Unverified, Neutral, Background info.

### 2.3 Pure Symbols (No Wrappers)
Icons are rendered directly on the "glass" surface without containment rings or backgrounds. This emphasizes depth over color (Canon #21).

---

## 3. Implementation (MobileMetricRow)

The `MobileMetricRow` component supports a `statusIndicators` array.

### 3.1 User Scema
| State | Icon | Color | Rationale |
|-----------|------|-------|-----------|
| Verified | `BadgeCheck` | `hsl(var(--success))` | Trusted authority. |
| Unverified| `BadgeX` | `muted-foreground/0.4` | Warning/Missing. |
| Active | `Zap` | `hsl(var(--primary))` | Energy, system-ready. |
| Inactive | `ZapOff` | `muted-foreground/0.4` | System-dormant. |

### 3.2 Visit Scema
| State | Icon | Color | Rationale |
|-----------|------|-------|-----------|
| Emergency | `Siren` | `hsl(var(--destructive))` | High-priority intent. |
| Routine | `Stethoscope`| `muted-foreground/0.4` | Standard procedure. |
| Scheduled | `Calendar` | `hsl(var(--info))` | Future-bound. |
| In-Progress| `Clock` | `hsl(var(--warning))` | Time-sensitive. |
| Completed | `CheckCircle2`| `hsl(var(--success))` | Finalized/Safe. |

---

## 4. Engineering Standards

### 4.1 Icon Sizing
Standard size is **16px**. Small badges (on avatars) are **10px**.

### 4.2 Fill & Stroke
Use **filled variants** where available to increase visual weight on mobile screens.

### 4.3 Interactive Logic
Indicators should be passed as a derived array in the renderer:
```jsx
statusIndicators={[
    {
        icon: user.bvn_verified ? BadgeCheck : BadgeX,
        color: user.bvn_verified ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.4)',
        label: user.bvn_verified ? 'Verified' : 'Unverified'
    }
]}
```

---
