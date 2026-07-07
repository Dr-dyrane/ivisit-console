import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Shield,
    Clock,
    CheckCircle,
    AlertTriangle,
    Eye,
    Trash2,
    Calendar,
    DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../lib/utils'; // Assuming this utility exists, if not I'll implement simple formatter

export const InsuranceListView = ({
    policies,
    onView,
    onDelete,
    onVerify,
    canDelete = false,
    canVerify = false,
    getStatusBadge,
    isMobile
}) => {
    if (!policies || policies.length === 0) return null;
    const showVerifyAction = canVerify && typeof onVerify === 'function';
    const showDeleteAction = canDelete && typeof onDelete === 'function';

    return (
        <div className="space-y-4">
            <AnimatePresence mode="popLayout">
                {policies.map((policy, index) => (
                    <motion.div
                        layout
                        key={policy.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-0 border-0 shadow-premium hover-lift transition-all group overflow-hidden">
                            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 relative">
                                {/* Status Strip Gradient */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${policy.status === 'active' ? 'bg-emerald-500/60' : policy.status === 'expired' ? 'bg-destructive' : 'bg-amber-500/60'}`} />

                                {/* Main Content */}
                                <div className="flex-1 space-y-3 md:space-y-0 md:pl-4">

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                                        {/* Policy Info */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 geo-round bg-muted flex items-center justify-center shrink-0">
                                                <Shield className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg tracking-tight text-foreground line-clamp-1">
                                                        {policy.policy_number}
                                                    </h3>
                                                    {policy.verified && (
                                                        <Badge variant="ghost" className="p-0 h-auto">
                                                            <CheckCircle className="h-3 w-3 text-emerald-700 dark:text-emerald-200 fill-emerald-500/20" />
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="font-normal text-foreground/80">{policy.provider_name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                    <span>{policy.policy_type || 'General'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta Data Grid (Tablet/Desktop) */}
                                        <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 ${isMobile ? 'w-full bg-muted/30 p-3 rounded-lg' : ''}`}>

                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Expires</span>
                                                    <span className="text-sm font-normal">
                                                        {policy.end_date ? new Date(policy.end_date).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Coverage</span>
                                                    <span className="text-sm font-normal">
                                                        {policy.coverage_amount ? `$${policy.coverage_amount.toLocaleString()}` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col md:items-end">
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Status</span>
                                                    <Badge className={`geo-sharp border-0 px-2 py-0.5 ${getStatusBadge(policy.status)}`}>
                                                        {policy.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={`flex items-center gap-2 ${isMobile ? 'justify-end border-t border-border/40 pt-3 mt-2' : 'md:border-l md:border-border/40 md:pl-4'}`}>
                                    {showVerifyAction && !policy.verified && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onVerify(policy)}
                                            className="squircle h-8 px-3 text-xs font-semibold hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-200"
                                        >
                                            Verify
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(policy)}
                                        className="squircle h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>

                                    {showDeleteAction && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete(policy)}
                                            className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                            </div>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
