import React from 'react';
import { Button } from '../ui/button';
import {
    Edit,
    Trash2,
    Eye,
    Globe,
    Building2,
    Clock,
    Ambulance,
    Bed,
    Stethoscope,
    CreditCard,
    Info
} from 'lucide-react';
import { motion } from 'framer-motion';

const formatSourceLabel = (value, fallback) => {
    const label = String(value || fallback || '').trim();
    if (!label) return 'SOURCE PENDING';
    return label.toUpperCase();
};

const getPricingAmount = (item) => {
    const value = item.amount ?? item.base_price ?? item.price_per_night ?? 0;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
};

const getUpdatedAt = (item) => item.updatedAt || item.updated_at || item.created_at;

export const PricingListView = ({ pricing, onFocus, onView, onEdit, onDelete, canEdit }) => {
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pricing.map((item, index) => {
                const isGlobal = !item.organization_id && !item.hospital_id;
                const isEditable = canEdit(item);
                const name = item.name || item.service_name || item.room_name || 'Unnamed price';
                const type = item.type || item.service_type || item.room_type || 'General';
                const sourceLabel = formatSourceLabel(item.sourceLabel || item.source_label, isGlobal ? 'platform fallback' : 'facility price');
                const facilityLabel = item.facilityName || item.facility_name;
                const updatedAt = getUpdatedAt(item);

                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div
                            onClick={() => onFocus?.(item)}
                            className="h-full rounded-card bg-card/70 p-6 group relative overflow-hidden flex flex-col transition-colors hover:bg-muted/30"
                        >
                            <div className="flex justify-between items-start mb-6 relative z-10 transition-colors duration-300">
                                <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[9px] font-black tracking-[0.14em] ${isGlobal ? 'bg-sky-500/15 text-sky-700 dark:text-sky-200' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200'}`}>
                                    {isGlobal ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                    {sourceLabel}
                                </span>
                                <div className="w-10 h-10 rounded-inner bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform duration-300">
                                    {getTypeIcon(item.service_type || item.room_type)}
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-1 tracking-tight relative z-10 truncate">
                                {name}
                            </h3>
                            <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground mb-4 transition-colors duration-300">
                                {type}
                            </p>

                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 relative z-10 flex-1">
                                {item.description || facilityLabel || 'Source-labelled pricing row.'}
                            </p>

                            <div className="flex items-end justify-between relative z-10 mb-6">
                                <div>
                                    <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground mb-1">Fee</p>
                                    <span className="text-3xl font-black tracking-tight">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(getPricingAmount(item))}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground ml-1">/ {item.unit || 'Unit'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 relative z-10 px-2">
                                <div className="text-[10px] font-bold text-muted-foreground tracking-[0.14em] flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {updatedAt ? new Date(updatedAt).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onView(item)}
                                        className="rounded-inner h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(item)}
                                            className="rounded-inner h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(item)}
                                            className="rounded-inner h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};
