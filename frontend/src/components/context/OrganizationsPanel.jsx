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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Network Core</h3>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Active Nodes</span>
                                <p className="text-xs text-muted-foreground">Online organizations</p>
                            </div>
                        </div>
                        <Badge className="bg-success/20 text-success border-0">{activeOrgs}</Badge>
                    </div>
                </Card>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                                <Wallet className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Total Float</span>
                                <p className="text-xs text-muted-foreground">Total network balance</p>
                            </div>
                        </div>
                        <span className="font-bold text-sm tracking-tighter">
                            ${totalWallet.toLocaleString()}
                        </span>
                    </div>
                </Card>
            </motion.div>

            {/* Security Status */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Verification</h3>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-info" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Verified</span>
                                <p className="text-xs text-muted-foreground">KYC completed</p>
                            </div>
                        </div>
                        <Badge className="bg-info/20 text-info border-0">{organizations.length}</Badge>
                    </div>
                </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Operations</h3>

                <div className="grid grid-cols-2 gap-2">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOpenCreateOrg}
                        className="bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="font-normal text-xs uppercase tracking-tighter">Onboard</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                    >
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-normal text-xs uppercase tracking-tighter">Growth</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="col-span-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex items-center justify-center gap-2 transition-colors"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-normal text-xs uppercase tracking-[0.2em]">Network Report</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};
