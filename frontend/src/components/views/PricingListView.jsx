import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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

export const PricingListView = ({ pricing, onView, onEdit, onDelete, canEdit }) => {
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

                return (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="h-full squircle-xl glass-card-premium p-6 hover-lift group relative overflow-hidden flex flex-col border-0">
                            <div className="absolute inset-0 dot-grid opacity-10" />
                            <div className={`hover-glow ${isGlobal ? 'hover-glow-primary' : 'hover-glow-success'}`} />

                            <div className="flex justify-between items-start mb-6 relative z-10 transition-colors duration-300">
                                <Badge className={`geo-sharp border-0 px-2.5 py-1 shadow-sm ${isGlobal ? 'bg-primary/20 text-primary shadow-glow-primary/10' : 'bg-success/20 text-success shadow-glow-success/10'}`}>
                                    <div className="flex items-center gap-1.5 uppercase tracking-tighter font-black text-[9px]">
                                        {isGlobal ? <Globe className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                        {isGlobal ? 'GLOBAL' : 'OVERRIDE'}
                                    </div>
                                </Badge>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 shadow-inner shadow-primary/5 transition-transform duration-300">
                                    {getTypeIcon(item.service_type || item.room_type)}
                                </div>
                            </div>

                            <h3 className="font-bold text-lg mb-1 tracking-tight relative z-10 truncate">
                                {item.service_name || item.room_name}
                            </h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 transition-colors duration-300">
                                {item.service_type || item.room_type}
                            </p>

                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 relative z-10 flex-1">
                                {item.description || 'Standard platform pricing logic applied.'}
                            </p>

                            <div className="flex items-end justify-between relative z-10 mb-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Fee</p>
                                    <span className="text-3xl font-black tracking-tighter">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.base_price || item.price_per_night || 0)}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground ml-1">/ {item.unit || 'Unit'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onView(item)}
                                        className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(item)}
                                            className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {isEditable && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(item)}
                                            className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
};
