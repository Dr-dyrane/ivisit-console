import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    CircleDashed,
    FileText,
    Loader2,
    LockKeyhole,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { mobileEasing } from './mobileMotion';
// Mobile canon kit: the loading truth (forced warm-up + Updating pill), the
// hairline whisper, and the control press primitive live in shared components
// (extraction source: CANON_COMPONENT_SPECS.md). This page keeps its DOMAIN -
// the Today dashboard presentation (hero, glance tiles, action-sheet rows).
// grammar:hero=inline signal-first hero -- bespoke (signal pill + headline + subhead
// + role pill), a gap-2 div anchoring aria-live on the Updating pill; see below.
// Kept PAGE-LOCAL on purpose (fidelity-first): the hero markup (the kit
// MobileHero's status row is a gap-3 span with role="status"/aria-live; this
// donor ships a gap-2 div and anchors the live region on the Updating pill
// instead), the dashboard-shaped load scaffold (the kit only has the grouped-
// list scaffold), and the card-grade presses that fire feedback on onClick
// (glance tiles, action-row toggles) rather than TapCard's pointerdown.
import { useSkeletonWarmup, UpdatingPill } from './canon/Loading';
import { Hairline } from './canon/GroupedList';
import { TapButton } from './canon/Tap';

/**
 * MobileToday — the mobile-canon presentation of the Today home (a DASHBOARD, not a
 * list page: no KPI strip, no search, no recency groups, no detail sheets).
 *
 * PURE PRESENTATION. TodayHome (the route component) stays mounted as the parent: it
 * computes the whole model ONCE (buildToday / buildGlanceItems / buildActionRows /
 * roleCopy), publishes the `todayRouteContextUpdated` context event, and passes the
 * model down. This component duplicates ZERO data logic and never reads
 * PageData/Auth itself — so it imports nothing from TodayHome (also avoids a circular
 * import once TodayHome renders it).
 *
 * PROP CONTRACT (Wave-2 wiring — every value computed by TodayHome):
 *   today        buildToday() result:
 *                { headline, subhead, sheetTitle, sheetHint, status, primaryAction,
 *                  path, icon (lucide component),
 *                  tone: 'danger'|'warning'|'primary'|'success'|'muted' }
 *                The action sheet's copy (sheetTitle / sheetHint / primaryAction /
 *                path / status / tone) travels INSIDE `today`, exactly as in the
 *                desktop model — there is no separate `sheet` prop.
 *   glanceItems  buildGlanceItems() result: [{ label, value, path, tone }] (2-3 items;
 *                counts arrive pre-formatted, e.g. "3 to review")
 *   rows         buildActionRows() result: [{ id, label, meta, detail, actionLabel,
 *                  path, done?, loading?, disabled?, disabledReason?, tone }]
 *   live         boolean — TodayHome's `live` fold (mock/error/loading); drives the
 *                'Retry needed' pill next to the role pill
 *   role         TodayHome's roleCopy (ROLE_COPY[roleKind]):
 *                { label, primaryAction, path, icon }
 *   loading      boolean — live-data-not-ready (TodayHome's hasTodayLoading); skeleton gate
 *   isFetching   boolean — background refetch signal; drives the Updating pill
 *   routingPath  string|null — TodayHome's routingPath (opening-feedback state)
 *   onAction     (path) => void — TodayHome's handleAction (sets routingPath, then
 *                navigates after its route-feedback delay)
 *   onRefresh    async () => void — pull-to-refresh handler
 */

// Canonical mobile tones for the model's tone names. Same names the desktop
// statusClass map consumes; hues are the mobile canon (MobileEmergency avatar
// palette): danger = destructive film (never brand red), warning amber,
// primary sky, success emerald, muted neutral.
const toneClass = {
    danger: 'bg-destructive/14 text-destructive',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    muted: 'bg-muted/34 text-muted-foreground',
};

// Mirrors TodayHome's AtlasLayer (same gradients / stops) so the mobile ground reads
// as the same room as desktop Today; pointer-events-none like the other mobile atlases.
const MobileTodayAtlasLayer = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.34] dark:opacity-[0.28]"
            style={{
                backgroundImage:
                    'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.07) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.055) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--primary) / 0.08) 64% 67%, transparent 67%)',
                backgroundSize: '260px 180px, 340px 240px, 420px 280px',
                backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.13), transparent 30%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.20), hsl(var(--background)) 92%)',
            }}
        />
    </div>
);

// Layout-shaped load scaffold: mirrors the final page 1:1 (hero bars, glance tile
// grid, sheet panel with CTA bar + row rhythm + hairline inset) so the real content
// REPLACES it in place with zero layout jump — no entrance motion, the skeleton holds
// the layout and content materializes where it already sat. Apple/iOS loading model.
const MobileTodaySkeleton = ({ rows = 4 }) => (
    <div className="space-y-8" aria-hidden="true">
        {/* Hero: status pill row, two headline lines, subcopy, role pill */}
        <div className="px-4">
            <span className="inline-block h-8 w-32 rounded-pill bg-muted/25 shimmer" />
            <span className="mt-4 block h-7 w-4/5 rounded-pill bg-muted/25 shimmer" />
            <span className="mt-2 block h-7 w-3/5 rounded-pill bg-muted/25 shimmer" />
            <span className="mt-2 block h-4 w-11/12 rounded-pill bg-muted/15 shimmer" />
            <span className="mt-4 inline-block h-7 w-24 rounded-pill bg-muted/20 shimmer" />
        </div>

        {/* Glance: 2-up tile grid (label over value, trailing orb) */}
        <div className="px-4">
            <div className="grid grid-cols-2 gap-3">
                {[0, 1].map((tile) => (
                    <div key={tile} className="surface-card flex min-h-[72px] items-start justify-between gap-2 rounded-inner px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <span className="block h-3 w-14 rounded-pill bg-muted/25 shimmer" />
                            <span className="mt-2 block h-4 w-4/5 rounded-pill bg-muted/25 shimmer" />
                        </div>
                        <span className="h-7 w-7 shrink-0 rounded-pill bg-muted/20 shimmer" />
                    </div>
                ))}
            </div>
        </div>

        {/* Action sheet: header, CTA bar, rows separated by the hairline */}
        <div className="px-4">
            <div className="surface-card rounded-card p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <span className="inline-block h-6 w-24 rounded-pill bg-muted/25 shimmer" />
                        <span className="mt-2 block h-6 w-2/5 rounded-pill bg-muted/25 shimmer" />
                        <span className="mt-2 block h-4 w-3/5 rounded-pill bg-muted/15 shimmer" />
                    </div>
                    <span className="h-9 w-9 shrink-0 rounded-pill bg-muted/20 shimmer" />
                </div>
                <span className="mt-4 block h-12 w-full rounded-button bg-muted/25 shimmer" />
                <div className="mt-3">
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            <div className="flex items-center gap-3 px-2 py-3">
                                <span className="h-9 w-9 shrink-0 rounded-pill bg-muted/25 shimmer" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <span className="block h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer" />
                                    <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                                </div>
                                <span className="h-4 w-4 shrink-0 rounded-pill bg-muted/20 shimmer" />
                            </div>
                            {rowIndex < rows - 1 && (
                                <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[56px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Glance tile — tappable NAVIGATION card (never a filter). Card-grade press (0.988),
// haptic on tap, Loader2 glyph swap + data-state="opening" while its route is opening
// (the desktop GlanceCard idiom in mobile grammar).
const GlanceTile = ({ item, onPress, routingPath }) => {
    const isOpening = Boolean(item.path) && routingPath === item.path;
    const tone = toneClass[item.tone] || toneClass.muted;

    return (
        <motion.button
            type="button"
            whileTap={{ scale: 0.988 }}
            onClick={(event) => onPress(event, item.path)}
            disabled={!item.path}
            data-mobile-today-glance={String(item.label || '').toLowerCase()}
            data-state={isOpening ? 'opening' : 'idle'}
            aria-label={`${item.label}: ${item.value}${isOpening ? ', opening' : ''}`}
            className="surface-card flex min-h-[72px] items-start justify-between gap-2 rounded-inner px-4 py-3 text-left transition-colors active:bg-foreground/[0.08] disabled:pointer-events-none disabled:opacity-70 dark:active:bg-white/[0.10]"
        >
            {/* Desktop GlanceCard anatomy in mobile scale: sentence-case label over the
                value (never all-caps subheadings), tone-tinted arrow orb trailing. */}
            <span className="min-w-0">
                <span className="block text-[11px] font-medium text-muted-foreground">{item.label}</span>
                <span className="mt-1 block text-[15px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
                    {item.value}
                </span>
            </span>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill ${tone}`}>
                {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </span>
        </motion.button>
    );
};

// Action row — expand-in-place disclosure (desktop DetailRow in mobile grammar; NOT a
// detail sheet — dashboards do not open record sheets). Row press is card-grade
// (0.988) and stays page-local (INFO feedback on onClick, not TapCard's pointerdown);
// the revealed action pill is the canon TapButton (control 0.96, CLICK feedback baked)
// with the same Loader2 + 'Opening...' feedback as every other route action.
// onNavigate takes the raw path; the pill only renders when the path exists.
const MobileTodayActionRow = ({ row, expanded, onToggle, onNavigate, routingPath }) => {
    const StatusIcon = row.loading ? Loader2 : row.disabled ? LockKeyhole : row.done ? CheckCircle2 : CircleDashed;
    const isOpening = Boolean(row.path) && routingPath === row.path;
    const rowState = row.disabled ? 'unavailable' : isOpening ? 'opening' : expanded ? 'expanded' : 'idle';
    const tone = toneClass[row.tone] || toneClass.muted;

    return (
        <div
            data-mobile-today-row={row.id}
            data-state={rowState}
            aria-disabled={row.disabled ? 'true' : undefined}
            className={row.disabled ? 'opacity-70' : undefined}
        >
            <motion.button
                type="button"
                whileTap={{ scale: 0.988 }}
                onClick={(event) => onToggle(event, row.id)}
                aria-expanded={expanded}
                aria-label={`${row.label}: ${row.meta}${row.disabledReason ? `. ${row.disabledReason}` : ''}`}
                className="flex w-full items-center gap-3 rounded-inner px-2 py-3 text-left transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]"
            >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-pill ${tone}`}>
                    <StatusIcon className={`h-4 w-4 ${row.loading ? 'animate-spin' : ''}`} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium leading-5 text-foreground">{row.label}</span>
                    <span className="text-meta mt-0.5 block truncate text-muted-foreground">{row.meta}</span>
                </span>
                <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
            </motion.button>
            {expanded && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: mobileEasing }}
                    className="px-2 pb-3 pl-14"
                >
                    <p className="text-xs leading-5 text-foreground/80">{row.detail}</p>
                    {row.disabledReason && (
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{row.disabledReason}</p>
                    )}
                    {row.path && row.actionLabel && !row.disabled && (
                        <TapButton
                            onClick={() => onNavigate?.(row.path)}
                            data-state={isOpening ? 'opening' : 'idle'}
                            aria-label={`${row.actionLabel}${isOpening ? ', opening' : ''}`}
                            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-foreground/[0.08] px-4 text-xs font-semibold text-foreground transition-colors active:bg-foreground/[0.12] dark:bg-white/[0.10] dark:active:bg-white/[0.14]"
                        >
                            {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                            {isOpening ? 'Opening...' : row.actionLabel}
                        </TapButton>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export const MobileToday = ({
    today,
    glanceItems = [],
    rows = [],
    live = false,
    role,
    loading = false,
    isFetching = false,
    routingPath = null,
    onAction,
    onRefresh,
}) => {
    // Forced skeleton on every mount (canon useSkeletonWarmup): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const warmingUp = useSkeletonWarmup();
    const [expandedRow, setExpandedRow] = useState(null);
    const { triggerFromEvent } = useFeedback();

    // Skeleton while warming up OR while the parent's live data is still pending.
    // When it clears, the whole dashboard swaps in a single commit — no top-to-bottom
    // assemble, no entrance motion; the skeleton already held the exact layout.
    const showSkeleton = warmingUp || Boolean(loading) || !today;

    // Desktop parity: an expanded id that no longer exists in the recomputed rows
    // (role/live flip) silently collapses instead of pointing at a ghost row.
    const activeExpandedRow = useMemo(() => (
        rows.some((row) => row.id === expandedRow) ? expandedRow : null
    ), [expandedRow, rows]);

    const handleNavigate = useCallback((event, path) => {
        if (!path) return;
        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, haptic: true, sound: true });
        onAction?.(path);
    }, [onAction, triggerFromEvent]);

    const handleToggleRow = useCallback((event, rowId) => {
        triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true });
        setExpandedRow((current) => (current === rowId ? null : rowId));
    }, [triggerFromEvent]);

    const hero = today || {};
    const HeroIcon = hero.icon || Activity;
    const primaryOpening = Boolean(hero.path) && routingPath === hero.path;
    const skeletonRows = rows.length > 0 ? rows.length : 4;

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileTodayAtlasLayer />
                <div className="relative z-10">
                    {showSkeleton ? (
                        <MobileTodaySkeleton rows={skeletonRows} />
                    ) : (
                        <div className="space-y-8">
                            {/* HERO — signal first: status pill as the eyebrow, the model's
                                headline as the page voice, role pill grounding who this is
                                for. No entrance motion; content is simply there once mounted. */}
                            <section className="px-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-semibold ${toneClass[hero.tone] || toneClass.muted}`}>
                                        <HeroIcon className="h-4 w-4" />
                                        {hero.status}
                                    </div>
                                    {/* Background-refetch feedback: the parent keeps placeholder
                                        data on screen while refetching, so `loading` stays false —
                                        `isFetching` is the only signal. Hidden under the skeleton,
                                        which already communicates load. Anchored to the status row
                                        so its appearance never shifts layout. */}
                                    {isFetching && <UpdatingPill />}
                                </div>
                                <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]">
                                    {hero.headline}
                                </h1>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{hero.subhead}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {role?.label && (
                                        <span className="surface-card rounded-pill px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                            {role.label}
                                        </span>
                                    )}
                                    {!live && (
                                        <span className="surface-card rounded-pill px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                            Retry needed
                                        </span>
                                    )}
                                </div>
                            </section>

                            {/* GLANCE — the 2-3 role-scoped counts as tappable navigation
                                cards. Tiles NAVIGATE (with opening feedback); they never
                                filter this page. No section label — the tiles read as the
                                glance themselves (desktop parity; whitespace does the guiding). */}
                            <section className="px-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {glanceItems.map((item) => (
                                        <GlanceTile
                                            key={item.label}
                                            item={item}
                                            onPress={handleNavigate}
                                            routingPath={routingPath}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* ACTION SHEET — one RAISED panel: status + title + hint, the
                                single primary CTA, then the action rows separated by the
                                canon hairline (an alpha whisper, borderless). */}
                            <section className="px-4">
                                <div className="surface-card rounded-card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className={`inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold ${toneClass[hero.tone] || toneClass.muted}`}>
                                                {hero.status}
                                            </span>
                                            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{hero.sheetTitle}</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">{hero.sheetHint}</p>
                                        </div>
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06]">
                                            <FileText className="h-4 w-4" />
                                        </span>
                                    </div>

                                    {/* Primary CTA mirrors desktop's deliberate choice: quiet
                                        bg-foreground, NOT bg-primary — Today's one loud-ish
                                        action stays ink-toned. Filled-CTA glow per the mobile
                                        button canon; glyph swaps to Loader2 while opening.
                                        Canon TapButton: control press 0.96 + CLICK feedback
                                        baked on the same onClick phase this donor used. */}
                                    <TapButton
                                        onClick={() => onAction?.(hero.path)}
                                        disabled={!hero.path}
                                        data-state={primaryOpening ? 'opening' : 'idle'}
                                        aria-label={`${hero.primaryAction}${primaryOpening ? ', opening' : ''}`}
                                        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-background shadow-[0_8px_18px_hsl(var(--foreground)/0.18)] transition-colors hover:bg-foreground/90 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90"
                                    >
                                        {primaryOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                                        {primaryOpening ? 'Opening...' : hero.primaryAction}
                                    </TapButton>

                                    <div className="mt-3">
                                        {rows.map((row, index) => (
                                            <React.Fragment key={row.id}>
                                                <MobileTodayActionRow
                                                    row={row}
                                                    expanded={activeExpandedRow === row.id}
                                                    onToggle={handleToggleRow}
                                                    onNavigate={onAction}
                                                    routingPath={routingPath}
                                                />
                                                {index < rows.length - 1 && (
                                                    <Hairline inset={56} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};

export default MobileToday;
