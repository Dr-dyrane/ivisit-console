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
    Ambulance,
    Bed,
    Clock,
    Eye,
    Trash2,
    Edit,
    MoreHorizontal,
    Globe,
    Building2,
    Stethoscope,
    CreditCard,
    Info
} from 'lucide-react';

const formatSourceLabel = (value, fallback) => {
    const label = String(value || fallback || '').trim();
    if (!label) return 'Source pending';
    return label
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const getPricingAmount = (item) => {
    const value = item.amount ?? item.base_price ?? item.price_per_night ?? 0;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
};

const getUpdatedAt = (item) => item.updatedAt || item.updated_at || item.created_at;

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(160px,1.6fr)_minmax(96px,0.8fr)_minmax(90px,0.7fr)_minmax(150px,1.2fr)_minmax(110px,0.9fr)_64px]';
const GRID_TEMPLATE_NO_SELECT = 'grid-cols-[minmax(160px,1.6fr)_minmax(96px,0.8fr)_minmax(90px,0.7fr)_minmax(150px,1.2fr)_minmax(110px,0.9fr)_64px]';

export const PricingTableView = ({
    pricing,
    onFocus,
    onView,
    onDelete,
    onEdit,
    selectedIds = [],
    onSelect,
    onSelectAll,
    canEdit,
    selectionEnabled = true
}) => {
    if (!pricing || pricing.length === 0) return null;

    const getTypeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'ambulance': return <Ambulance className="h-4 w-4" />;
            case 'bed': return <Bed className="h-4 w-4" />;
            case 'consultation': return <Stethoscope className="h-4 w-4" />;
            case 'procedure': return <CreditCard className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const gridClass = selectionEnabled ? GRID_TEMPLATE : GRID_TEMPLATE_NO_SELECT;

    return (
        <div className="rounded-card bg-background/30 overflow-hidden p-3">
            {/* Header row */}
            <div className={`grid ${gridClass} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
                {selectionEnabled && (
                    <div className="flex items-center">
                        <Checkbox
                            checked={selectedIds.length === pricing.length && pricing.length > 0}
                            onCheckedChange={(checked) => onSelectAll?.(checked)}
                            aria-label="Select all"
                        />
                    </div>
                )}
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Service / Item</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Price</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Unit</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Scope</span>
                <span className="font-semibold tracking-[0.14em] text-muted-foreground">Last Updated</span>
                <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
            </div>

            {/* Data rows */}
            {pricing.map((item) => {
                const isGlobal = !item.organization_id && !item.hospital_id;
                const isEditable = canEdit(item);
                const selected = selectionEnabled && selectedIds.includes(item.id);
                const name = item.name || item.service_name || item.room_name || 'Unnamed price';
                const type = item.type || item.service_type || item.room_type || 'General';
                const sourceLabel = formatSourceLabel(item.sourceLabel || item.source_label, isGlobal ? 'platform fallback' : 'facility price');
                const facilityLabel = item.facilityName || item.facility_name;
                const updatedAt = getUpdatedAt(item);

                return (
                    <div
                        key={item.id}
                        onClick={() => onFocus?.(item)}
                        className={`grid ${gridClass} items-center gap-2 rounded-inner px-3 py-3 transition-colors ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    >
                        {selectionEnabled && (
                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedIds.includes(item.id)}
                                    onCheckedChange={(checked) => onSelect?.(item.id, checked)}
                                    aria-label={`Select item ${name}`}
                                />
                            </div>
                        )}
                        {/* Service / Item */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-inner bg-muted flex items-center justify-center shrink-0">
                                {getTypeIcon(type)}
                            </div>
                            <div className="min-w-0">
                                <div className="font-normal text-foreground truncate">
                                    {name}
                                </div>
                                <div className="text-[10px] text-muted-foreground tracking-[0.14em] font-bold truncate">
                                    {type}
                                </div>
                            </div>
                        </div>
                        {/* Price */}
                        <div className="font-bold text-foreground truncate">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(getPricingAmount(item))}
                        </div>
                        {/* Unit */}
                        <div className="text-sm text-muted-foreground truncate">
                            {item.unit || item.room_type || 'Per Unit'}
                        </div>
                        {/* Scope */}
                        <div className="min-w-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[9px] font-black tracking-[0.14em] ${isGlobal ? 'bg-sky-500/15 text-sky-700 dark:text-sky-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'}`}>
                                {isGlobal ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {sourceLabel}
                            </span>
                            {facilityLabel && (
                                <div className="mt-1 text-[10px] tracking-[0.14em] text-muted-foreground truncate">
                                    {facilityLabel}
                                </div>
                            )}
                        </div>
                        {/* Last Updated */}
                        <div className="text-sm text-muted-foreground min-w-0">
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{updatedAt ? new Date(updatedAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
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
                                <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70">
                                    <DropdownMenuItem onClick={() => onView(item)} className="cursor-pointer font-medium text-xs py-2">
                                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                        View Details
                                    </DropdownMenuItem>
                                    {isEditable && (
                                        <DropdownMenuItem onClick={() => onEdit(item)} className="cursor-pointer font-medium text-xs py-2">
                                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                            Edit
                                        </DropdownMenuItem>
                                    )}
                                    {isEditable && (
                                        <DropdownMenuItem onClick={() => onDelete(item)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
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
