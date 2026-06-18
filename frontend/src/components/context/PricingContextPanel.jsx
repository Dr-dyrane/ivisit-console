import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
    DollarSign,
    TrendingUp,
    Globe,
    Building2,
    Plus,
    BarChart3,
    Download
} from 'lucide-react';

export const PricingContextPanel = ({ pricing = [] }) => {
    const handleOpenAddPricing = () => {
        const event = new CustomEvent('openPricingModal');
        window.dispatchEvent(event);
    };

    const handleOpenAnalytics = () => {
        const event = new CustomEvent('openAnalyticsModal');
        window.dispatchEvent(event);
    };

    const globalPricing = pricing.filter(p => !p.organization_id && !p.hospital_id).length;
    const overrides = pricing.filter(p => p.organization_id || p.hospital_id).length;

    const avgPrice = pricing.length > 0
        ? pricing.reduce((acc, curr) => acc + (curr.base_price || curr.price_per_night || 0), 0) / pricing.length
        : 0;

    return (
        <div className="space-y-4">
            {/* Scope Overview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Scope Distribution</h3>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Global</span>
                                <p className="text-xs text-muted-foreground">Standard rates</p>
                            </div>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-0">{globalPricing}</Badge>
                    </div>
                </Card>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Overrides</span>
                                <p className="text-xs text-muted-foreground">Organization specific</p>
                            </div>
                        </div>
                        <Badge className="bg-success/20 text-success border-0">{overrides}</Badge>
                    </div>
                </Card>
            </motion.div>

            {/* Financial Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
            >
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Market Snapshot</h3>

                <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-info" />
                            </div>
                            <div>
                                <span className="font-bold tracking-tight">Avg Rate</span>
                                <p className="text-xs text-muted-foreground">Blended base cost</p>
                            </div>
                        </div>
                        <span className="font-bold text-lg tracking-tighter">
                            ${avgPrice.toFixed(0)}
                        </span>
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
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Management</h3>

                <div className="grid grid-cols-2 gap-2">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOpenAddPricing}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="font-normal text-xs">Add Item</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleOpenAnalytics}
                        className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-normal text-xs">Reports</span>
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="col-span-2 bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        <span className="font-normal text-xs uppercase tracking-widest">Execute Bulk Sync</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};
