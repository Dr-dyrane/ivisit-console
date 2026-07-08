import React from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
    Users,
    Mail,
    CheckCircle,
    Clock,
    Crown,
    Eye,
    Trash2,
    Calendar,
    Edit,
    MoreHorizontal
} from 'lucide-react';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(200px,2fr)_minmax(90px,0.7fr)_minmax(96px,0.7fr)_minmax(120px,0.9fr)_minmax(120px,0.9fr)_64px]';

export const SubscriptionTableView = ({
    subscribers,
    onView,
    onDelete,
    onEdit,
    getStatusBadge,
    getTypeBadge,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    if (!subscribers || subscribers.length === 0) return null;

    const isAllSelected = selectedIds.length === subscribers.length && subscribers.length > 0;

    return (
        <div className="rounded-card bg-background/30 overflow-hidden p-3">
            {/* Header row */}
            <div className={`grid ${GRID_TEMPLATE} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
                <div className="flex items-center">
                    <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => onSelectAll(checked)}
                        aria-label="Select all"
                    />
                </div>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Subscriber</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Type</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Status</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Joined</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Welcome Email</span>
                <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
            </div>

            {/* Data rows */}
            {subscribers.map((subscriber, index) => {
                const selected = selectedIds.includes(subscriber.id);
                return (
                    <div
                        key={subscriber.id}
                        className={`grid ${GRID_TEMPLATE} items-center gap-2 rounded-inner px-3 py-3 transition-colors ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    >
                        {/* Selection */}
                        <div className="flex items-center">
                            <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => onSelect(subscriber.id, checked)}
                                aria-label={`Select subscriber ${subscriber.email}`}
                            />
                        </div>
                        {/* Subscriber */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-icon bg-muted flex items-center justify-center shrink-0">
                                {subscriber.type === 'paid' ? (
                                    <Crown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-normal text-foreground truncate">
                                        {subscriber.email}
                                    </span>
                                    {subscriber.new_user && (
                                        <Clock className="h-3 w-3 text-amber-700 dark:text-amber-200 fill-amber-500/20 shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Type */}
                        <div className="min-w-0">
                            <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getTypeBadge(subscriber.type)}`}>
                                {subscriber.type}
                            </span>
                        </div>
                        {/* Status */}
                        <div className="min-w-0">
                            <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(subscriber.status)}`}>
                                {subscriber.status}
                            </span>
                        </div>
                        {/* Joined */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                                {subscriber.subscription_date ? new Date(subscriber.subscription_date).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        {/* Welcome Email */}
                        <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {subscriber.welcome_email_sent ? (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-200 shrink-0" />
                            ) : (
                                <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200 shrink-0" />
                            )}
                            <span className="text-sm truncate">
                                {subscriber.welcome_email_sent ? 'Sent' : 'Pending'}
                            </span>
                        </div>
                        {/* Actions */}
                        <div className="justify-self-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-muted/30">
                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/80 shadow-sm">
                                    <DropdownMenuItem onClick={() => onView(subscriber)} className="cursor-pointer font-medium text-xs py-2">
                                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                        View Details
                                    </DropdownMenuItem>
                                    {onEdit && (
                                        <DropdownMenuItem onClick={() => onEdit(subscriber)} className="cursor-pointer font-medium text-xs py-2">
                                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem onClick={() => onDelete(subscriber)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
