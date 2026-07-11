import React from 'react';
import {
    Building2,
    Activity,
    AlertCircle,
    Plus,
    BarChart3,
    Wallet,
    TrendingUp
} from 'lucide-react';

// Organizations right-side context pane. CANON: mirrors the GOLD reference EmergencyPanel
// (Requests) -- rounded-card big surface / rounded-inner compacts + rows / rounded-icon wells
// (SQUIRCLE, not circular pill) / rounded-pill badges / colored-tint metric bgs / neutral
// shadows. Single whole-object prop (orgContext) read off the page's PUBLISHED shape
// (context.stats/.recent), so the panel stays in sync with the server projection instead of
// re-deriving from a stale organizations/summary cherry-pick. Numbers are re-sourced onto the
// payout axis: Funded / Payout gap (is_active is degenerate ~100%-true, dropped as a metric).

const toCount = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const getOrgName = (org) => (org?.name || org?.display_id || 'Organization');
const getInitial = (org) => (getOrgName(org)?.[0] || 'O').toUpperCase();

export const OrganizationsPanel = ({ orgContext }) => {
    const context = orgContext || {};
    const stats = context.stats || {};
    const recent = Array.isArray(context.recent) ? context.recent : [];
    const hasContext = Boolean(orgContext);
    const loading = Boolean(context.loading) || !hasContext;
    const total = toCount(stats.total ?? context.count, recent.length);
    const funded = toCount(stats.funded, 0);
    const payoutGap = toCount(stats.payoutGap, 0);

    const handleOpenCreateOrg = () => {
        window.dispatchEvent(new CustomEvent('openOrganizationModal'));
    };

    const shadow = 'shadow-[0_4px_12px_rgb(0_0_0/0.07)]';
    const eyebrow = 'px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';

    return (
        <div className="space-y-4">
            {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
            <div className="space-y-2">
                <h3 className={eyebrow}>Network Hub</h3>

                <div className={`group rounded-card bg-emerald-500/10 p-4 ${shadow} transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-icon surface-card text-emerald-700 transition-transform duration-200 group-hover:scale-105 dark:text-emerald-200">
                                <Wallet className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tight">Funded</p>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Positive wallet balance</p>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-pill bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-200">
                            {loading ? '...' : funded}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-inner bg-amber-500/10 p-3 ${shadow}`}>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon surface-card">
                                <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-lg font-semibold tracking-normal text-foreground">{loading ? '...' : payoutGap}</span>
                                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payout gap</span>
                            </span>
                        </div>
                    </div>

                    <div className={`rounded-inner bg-sky-500/10 p-3 ${shadow}`}>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon surface-card">
                                <Building2 className="h-4 w-4 text-sky-700 dark:text-sky-200" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-lg font-semibold tracking-normal text-foreground">{loading ? '...' : `${funded}/${total}`}</span>
                                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Funded / registry</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className={eyebrow}>Operations</h3>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={handleOpenCreateOrg}
                        className={`group flex flex-col items-center justify-center gap-2 rounded-button surface-card p-3 text-muted-foreground ${shadow} transition-[background,box-shadow,transform] duration-200 hover:bg-foreground/10 hover:text-foreground`}
                    >
                        <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                        <span className="text-[11px] font-semibold">Onboard</span>
                    </button>
                    <button
                        type="button"
                        disabled
                        aria-label="Growth unavailable"
                        className={`group flex flex-col items-center justify-center gap-2 rounded-button surface-card p-3 text-muted-foreground ${shadow} opacity-60 cursor-not-allowed`}
                    >
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-[11px] font-semibold">Growth</span>
                    </button>
                    <button
                        type="button"
                        disabled
                        aria-label="Pulse unavailable"
                        className={`group flex flex-col items-center justify-center gap-2 rounded-button surface-card p-3 text-muted-foreground ${shadow} opacity-60 cursor-not-allowed`}
                    >
                        <BarChart3 className="h-5 w-5" />
                        <span className="text-[11px] font-semibold">Pulse</span>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className={eyebrow}>Recent organizations</h3>
                <div className="space-y-2">
                    {recent.map((org, index) => {
                        const isActive = !!org?.is_active;
                        return (
                            <div
                                key={org?.id || index}
                                className={`group rounded-inner surface-card p-3 ${shadow} transition-[background,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-foreground/[0.08] dark:hover:bg-white/[0.10]`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon surface-card text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                                            <span className="text-[11px] font-semibold">{getInitial(org)}</span>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block max-w-[150px] truncate text-sm font-semibold text-foreground">{getOrgName(org)}</span>
                                            <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">{org?.contact_email || 'No contact email'}</span>
                                        </span>
                                    </div>
                                    <span className="shrink-0 rounded-pill surface-card px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {!loading && recent.length === 0 && (
                        <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
                            No organizations in the current view.
                        </div>
                    )}
                    {loading && recent.length === 0 && (
                        <div className="rounded-inner surface-card px-4 py-5 text-center text-xs font-medium text-muted-foreground">
                            Loading organizations.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 rounded-inner surface-card p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-muted">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </span>
                <p className="text-[10px] font-semibold leading-relaxed tracking-[0.14em] text-muted-foreground">
                    Organization commands stay read-only until organization authority is verified.
                </p>
            </div>
        </div>
    );
};
