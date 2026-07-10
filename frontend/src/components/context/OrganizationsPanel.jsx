import React from 'react';
import {
    Building2,
    Users2,
    Activity,
    Plus,
    BarChart3,
    ShieldCheck,
    TrendingUp,
    Wallet
} from 'lucide-react';

export const OrganizationsPanel = ({ organizations = [], summary = null }) => {
    const handleOpenCreateOrg = () => {
        const event = new CustomEvent('openOrganizationModal');
        window.dispatchEvent(event);
    };

    const activeOrgs = summary?.active ?? organizations.filter(o => o.is_active).length;
    const totalOrgs = summary?.total ?? organizations.length;
    const totalWallet = Number(summary?.totalWallet ?? organizations.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0));

    return (
        <div className="space-y-4">
            {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
            {/* Network Overview */}
            <div className="space-y-2">
                <h3 className="font-semibold text-[10px] tracking-[0.14em] text-muted-foreground ml-1">Network Hub</h3>

                <div className="bg-emerald-500/15 p-4 rounded-card flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/15 rounded-icon flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight">Active Nodes</p>
                            <p className="text-[10px] text-muted-foreground font-semibold tracking-[0.14em]">Global Reach</p>
                        </div>
                    </div>
                    <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">{activeOrgs}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted p-4 rounded-inner group">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.14em]">Reserve</span>
                        </div>
                        <p className="font-bold text-sm">${totalWallet.toLocaleString()}</p>
                    </div>

                    <div className="bg-muted p-4 rounded-inner group">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.14em]">Trust</span>
                        </div>
                        <p className="font-bold text-sm">{totalOrgs} Verified</p>
                    </div>
                </div>
            </div>

            {/* Operations */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={handleOpenCreateOrg}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-button bg-muted hover:bg-muted/70 transition-all group"
                >
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:rotate-90 transition-transform" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Onboard</span>
                </button>
                <button
                    type="button"
                    disabled
                    aria-label="Growth unavailable"
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-button bg-muted group opacity-60 cursor-not-allowed"
                >
                    <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Growth</span>
                </button>
                <button
                    type="button"
                    disabled
                    aria-label="Pulse unavailable"
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-button bg-muted dark:bg-white/5 group opacity-60 cursor-not-allowed"
                >
                    <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Pulse</span>
                </button>
            </div>

            {/* Bottom Alert */}
            <div className="p-4 rounded-inner surface-card flex items-center gap-3">
                <div className="w-8 h-8 rounded-icon bg-muted flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground leading-relaxed">
                    Network expansion is active. Monitor node synchronization in settings.
                </p>
            </div>
        </div>
    );
};
