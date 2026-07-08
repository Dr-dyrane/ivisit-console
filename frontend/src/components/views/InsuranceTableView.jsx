import React from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import {
    Eye,
    Trash2,
    CheckCircle,
    MoreHorizontal,
    Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(220px,2fr)_minmax(150px,1.3fr)_minmax(120px,0.9fr)_minmax(140px,1fr)_64px]';
const GRID_TEMPLATE_NO_SELECT = 'grid-cols-[minmax(220px,2fr)_minmax(150px,1.3fr)_minmax(120px,0.9fr)_minmax(140px,1fr)_64px]';

export const InsuranceTableView = ({
    policies,
    onView,
    onFocus,
    onDelete,
    onVerify,
    getStatusBadge,
    canDelete = false,
    canVerify = false,
    selectedIds = [],
    selectionEnabled = false,
    onSelect,
    onSelectAll
}) => {
    if (!policies || policies.length === 0) return null;
    const canSelect = selectionEnabled && typeof onSelect === 'function' && typeof onSelectAll === 'function';
    const showVerifyAction = canVerify && typeof onVerify === 'function';
    const showDeleteAction = canDelete && typeof onDelete === 'function';
    const hasSecondaryActions = showVerifyAction || showDeleteAction;

    const gridClass = canSelect ? GRID_TEMPLATE : GRID_TEMPLATE_NO_SELECT;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="rounded-card bg-background/30 overflow-hidden p-3">
                {/* Header row */}
                <div className={`grid ${gridClass} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
                    {canSelect && (
                        <div className="flex items-center">
                            <Checkbox
                                checked={selectedIds.length === policies.length && policies.length > 0}
                                onCheckedChange={(checked) => onSelectAll(checked)}
                                aria-label="Select all"
                            />
                        </div>
                    )}
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Policy details</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Provider</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Coverage</span>
                    <span className="font-semibold tracking-[0.14em] text-muted-foreground">Status</span>
                    <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
                </div>

                {/* Data rows */}
                {policies.map((policy, index) => {
                    const selected = canSelect && selectedIds.includes(policy.id);
                    return (
                        <motion.div
                            key={policy.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onFocus?.(policy.id)}
                            className={`group grid ${gridClass} items-center gap-2 rounded-inner px-3 py-3 transition-colors cursor-pointer ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                        >
                            {canSelect && (
                                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selectedIds.includes(policy.id)}
                                        onCheckedChange={(checked) => onSelect(policy.id, checked)}
                                        aria-label={`Select policy ${policy.policy_number}`}
                                    />
                                </div>
                            )}
                            {/* Policy details */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-icon bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm tracking-tight text-foreground truncate">{policy.policy_holder_name}</span>
                                    <span className="text-xs text-muted-foreground font-mono truncate">{policy.policy_number}</span>
                                </div>
                            </div>
                            {/* Provider */}
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-normal truncate">{policy.provider_name}</span>
                                <span className="inline-flex w-fit items-center rounded-pill px-2.5 py-0.5 mt-1 text-[10px] font-medium bg-muted text-muted-foreground">
                                    {policy.policy_type}
                                </span>
                            </div>
                            {/* Coverage */}
                            <div className="min-w-0">
                                <span className="font-mono text-sm font-semibold text-foreground">
                                    ${policy.coverage_amount?.toLocaleString() || '0'}
                                </span>
                            </div>
                            {/* Status */}
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium ${getStatusBadge(policy.status)}`}>
                                    {policy.status}
                                </span>
                                {policy.verified && (
                                    <div className="text-emerald-700 dark:text-emerald-200" title="Verified">
                                        <CheckCircle className="h-4 w-4 fill-emerald-500/10" />
                                    </div>
                                )}
                            </div>
                            {/* Actions */}
                            <div className="justify-self-end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-muted/30">
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70 backdrop-blur-xl shadow-sm">
                                        <DropdownMenuItem onClick={() => onView(policy)} className="cursor-pointer font-medium text-xs py-2">
                                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            View Details
                                        </DropdownMenuItem>
                                        {showVerifyAction && !policy.verified && (
                                            <DropdownMenuItem onClick={() => onVerify(policy)} className="cursor-pointer font-medium text-xs py-2 text-emerald-700 dark:text-emerald-200 focus:text-emerald-700 dark:focus:text-emerald-200 focus:bg-emerald-500/15">
                                                <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                                Verify Policy
                                            </DropdownMenuItem>
                                        )}
                                        {hasSecondaryActions && <DropdownMenuSeparator />}
                                        {showDeleteAction && (
                                            <DropdownMenuItem onClick={() => onDelete(policy)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};
