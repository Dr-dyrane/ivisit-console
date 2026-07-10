/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                // Opacity scale extended with the non-default steps the design system's
                // surface tints actually use (12/14/15/34/...). Tailwind's bare slash
                // color-opacity modifier (e.g. `bg-emerald-500/12`) only compiles values
                // present in theme.opacity; without these, those tinted surfaces — avatar
                // orbs, status discs, destructive buttons — silently rendered TRANSPARENT
                // (the tint was authored but never generated). 2026-07-10 surface-hygiene fix.
                opacity: {
                        8: '0.08', 12: '0.12', 14: '0.14', 15: '0.15', 18: '0.18', 22: '0.22',
                        34: '0.34', 35: '0.35', 45: '0.45', 55: '0.55', 65: '0.65', 85: '0.85', 88: '0.88',
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)',
                        // Design system tokens (CONSOLE_DESIGN_SYSTEM_FROM_APP.md)
                        card:  'var(--radius-card,  30px)',  // Management cards, entity cards
                        inner: 'var(--radius-inner, 22px)',  // Nested surfaces, inner cards
                        icon:  'var(--radius-icon,  14px)',  // Icon tiles, avatar wells
                        sheet: 'var(--radius-sheet, 44px)',  // Full sheets, drawers, side panels
                        button: 'var(--radius-button, 20px)', // Action buttons and compact controls
                        pill: 'var(--radius-pill, 999px)',   // Chips, badges, handles
                        modal: 'var(--radius-modal, 38px)',  // Modal / dialog sheets
                        squircle: 'var(--squircle, 1.75rem)',
                },
                // Canonical elevation scale (MANAGEMENT_PAGE_STANDARDS S0): NEUTRAL only.
                // Colored/bleeding glows are banned everywhere except the backdrop atlas.
                boxShadow: {
                        e1: '0 1px 3px rgb(0 0 0 / 0.05)',          // hairline lift (rows at rest)
                        e2: '0 4px 12px rgb(0 0 0 / 0.07)',         // standard raise (pills, hover)
                        'e2-strong': '0 6px 16px rgb(0 0 0 / 0.12)', // selected rows, primary CTAs
                        'e2-lift': '0 16px 38px rgb(0 0 0 / 0.08)',  // glance/KPI tiles ONLY
                        e3: '0 12px 32px rgb(0 0 0 / 0.10)',        // sheets, rails, overlays (cap)
                },
                colors: {
                        // Design system tokens
                        brand: 'hsl(var(--primary))',
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        success: {
                                DEFAULT: 'hsl(var(--success))',
                                foreground: 'hsl(var(--success-foreground))'
                        },
                        warning: {
                                DEFAULT: 'hsl(var(--warning))',
                                foreground: 'hsl(var(--warning-foreground))'
                        },
                        info: {
                                DEFAULT: 'hsl(var(--info))',
                                foreground: 'hsl(var(--info-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        }
                },
                keyframes: {
                        'accordion-down': {
                                from: {
                                        height: '0'
                                },
                                to: {
                                        height: 'var(--radix-accordion-content-height)'
                                }
                        },
                        'accordion-up': {
                                from: {
                                        height: 'var(--radix-accordion-content-height)'
                                },
                                to: {
                                        height: '0'
                                }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
