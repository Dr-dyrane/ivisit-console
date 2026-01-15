import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Ambulance, MapPin, Activity, Star, Calendar, Hospital } from 'lucide-react';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';

export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(ambulance || {
    call_sign: '',
    type: 'basic',
    status: 'available',
    vehicle_number: '',
    hospital: '',
    eta: '',
    rating: 4.5,
    last_maintenance: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCreate) {
        const { error } = await supabase
          .from('ambulances')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Ambulance created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('ambulances')
          .update(formData)
          .eq('id', ambulance.id);
        
        if (error) throw error;
        toast.success('Ambulance updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving ambulance:', error);
      toast.error('Failed to save ambulance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl glass-strong border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Premium Vehicle Card Header */}
        <div className="relative h-44 bg-gradient-to-r from-success/20 via-background to-background overflow-hidden">
             {/* Decorative Speed Lines */}
             <div className="absolute inset-0 opacity-10" 
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, #22c55e 10px, #22c55e 11px)' }}>
             </div>
             
             <div className="absolute bottom-6 left-8 z-10 flex items-end gap-6">
                 <div className="w-24 h-24 squircle-2xl bg-background shadow-xl flex items-center justify-center border-4 border-background">
                     <Ambulance className="w-12 h-12 text-success" />
                 </div>
                 <div className="mb-2">
                     <div className="flex items-center gap-2 mb-1">
                        <Badge className="squircle-sm bg-success/10 text-success border-0 font-bold px-2 py-0.5 text-[10px] uppercase tracking-widest">
                            FLEET UNIT
                        </Badge>
                     </div>
                     <h2 className="text-3xl font-black tracking-tighter leading-none mb-2">
                         {formData.call_sign || 'New Unit'}
                     </h2>
                     <div className="flex items-center gap-2">
                         <Badge className={`squircle-sm ${formData.status === 'available' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} border-0 font-bold px-3 py-1`}>
                             {formData.status?.toUpperCase() || 'AVAILABLE'}
                         </Badge>
                         <span className="text-sm font-mono text-muted-foreground">{formData.vehicle_number || 'NO PLATES'}</span>
                     </div>
                 </div>
             </div>

             <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full hover:bg-black/10 text-foreground z-20"
                onClick={() => onClose(false)}
            >
                <X className="w-6 h-6" />
            </Button>
        </div>

        <div className="px-8 pb-8 pt-6 relative z-10 overflow-y-auto max-h-[calc(90vh-12rem)] custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Vehicle Specs */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Unit Specification</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="call_sign" className="text-xs font-bold text-muted-foreground uppercase">Call Sign</Label>
                            <Input
                                id="call_sign"
                                name="call_sign"
                                value={formData.call_sign}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold text-lg"
                                placeholder="MEDIC-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vehicle_number" className="text-xs font-bold text-muted-foreground uppercase">License Plate</Label>
                            <Input
                                id="vehicle_number"
                                name="vehicle_number"
                                value={formData.vehicle_number}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono text-lg"
                                placeholder="ABC-123"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="type" className="text-xs font-bold text-muted-foreground uppercase">Configuration</Label>
                            <Select 
                                value={formData.type} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="basic">Basic Life Support (BLS)</SelectItem>
                                <SelectItem value="advanced">Advanced Life Support (ALS)</SelectItem>
                                <SelectItem value="critical">Critical Care Transport</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase">Current Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="en_route">En Route</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Assignment & Performance */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Assignment</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="hospital" className="text-xs font-bold text-muted-foreground uppercase">Base Station</Label>
                             <div className="relative">
                                <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="hospital"
                                    name="hospital"
                                    value={formData.hospital}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-medium"
                                    placeholder="Central Hospital"
                                />
                             </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="rating" className="text-xs font-bold text-muted-foreground uppercase">Crew Rating</Label>
                             <div className="relative">
                                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warning fill-warning" />
                                <Input
                                    type="number"
                                    step="0.1"
                                    id="rating"
                                    name="rating"
                                    value={formData.rating}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-bold"
                                />
                             </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="last_maintenance" className="text-xs font-bold text-muted-foreground uppercase">Last Service</Label>
                             <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    id="last_maintenance"
                                    name="last_maintenance"
                                    value={formData.last_maintenance}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-medium"
                                />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex gap-3 justify-end border-t border-border/50">
                    {!isView ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onClose(false)}
                                className="squircle font-bold text-muted-foreground hover:bg-muted"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow font-bold px-8"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : (isCreate ? 'Add Unit' : 'Save Changes')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => onClose(false)}
                            className="squircle-lg bg-muted text-foreground hover:bg-muted/80 font-bold px-8"
                        >
                            Close
                        </Button>
                    )}
                </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
