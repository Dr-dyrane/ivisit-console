import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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

export const OrganizationsPanel = ({ organizations = [] }) => {
    const handleOpenCreateOrg = () => {
        const event = new CustomEvent('openOrganizationModal');
        window.dispatchEvent(event);
    };

    const activeOrgs = organizations.filter(o => o.is_active).length;
    const totalWallet = organizations.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0);

    return (
        <div className="space-y-4">
            {/* Network Overview */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-2"
            >
                <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Network Hub</h3>

                <div className="bg-success/5 p-4 rounded-3xl flex items-center justify-between group transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity className="h-5 w-5 text-success" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight">Active Nodes</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Global Reach</p>
                        </div>
                    </div>
                    <Badge className="bg-success/20 text-success border-0 rounded-full">{activeOrgs}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-primary/5 p-4 rounded-3xl group">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reserve</span>
                        </div>
                        <p className="font-bold text-sm tracking-tighter">${totalWallet.toLocaleString()}</p>
                    </div>

                    <div className="bg-info/5 p-4 rounded-3xl group">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-4 w-4 text-info group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Trust</span>
                        </div>
                        <p className="font-bold text-sm tracking-tighter">{organizations.length} Verified</p>
                    </div>
                </div>
            </motion.div>

            {/* Operations */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={handleOpenCreateOrg}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-primary/10 hover:bg-primary/20 transition-all border-0 group"
                >
                    <Plus className="h-5 w-5 text-primary group-hover:rotate-90 transition-transform" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-primary">Onboard</span>
                </button>
                <button
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-info/10 hover:bg-info/20 transition-all border-0 group"
                >
                    <TrendingUp className="h-5 w-5 text-info group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-info">Growth</span>
                </button>
                <button
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-3xl bg-secondary/30 dark:bg-white/5 hover:bg-secondary/40 transition-all border-0 group"
                >
                    <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Pulse</span>
                </button>
            </div>

            {/* Bottom Alert */}
            <div className="p-4 rounded-3xl bg-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground leading-relaxed">
                    Network expansion is active. Monitor node synchronization in settings.
                </p>
            </div>
        </div>
    );
};
