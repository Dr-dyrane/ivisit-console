import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Hospital, MapPin, Phone, Bed, Ambulance, Star, Clock, Activity } from 'lucide-react';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';

export const HospitalModal = ({ isOpen, onClose, hospital, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(hospital || {
    name: '',
    address: '',
    phone: '',
    rating: 4.5,
    type: 'premium',
    emergency_level: 'Level 1 Trauma Center',
    available_beds: 10,
    ambulances_count: 5,
    wait_time: '10 mins',
    price_range: '$150',
    status: 'available',
    verified: false,
    latitude: 0,
    longitude: 0,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCreate) {
        const { data, error } = await supabase
          .from('hospitals')
          .insert([formData])
          .select();
        
        if (error) throw error;
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.CREATED,
          data?.[0]?.id || 'unknown',
          { message: `${formData.name} has been added to the network` }
        );
        toast.success('Hospital created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('hospitals')
          .update(formData)
          .eq('id', hospital.id);
        
        if (error) throw error;
        await createNotification(
          NotificationTypes.HOSPITAL,
          NotificationActions.UPDATED,
          hospital.id,
          { message: `${formData.name} information has been updated` }
        );
        toast.success('Hospital updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error('Failed to save hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl bg-background/50 backdrop-blur-xs border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Immersive Header */}
        <div className="relative h-48 bg-gradient-to-br from-info/20 via-background to-background overflow-hidden">
             {/* Decorative Pattern */}
             <div className="absolute inset-0 opacity-10" 
                  style={{ backgroundImage: 'linear-gradient(45deg, #3b82f6 25%, transparent 25%, transparent 75%, #3b82f6 75%, #3b82f6), linear-gradient(45deg, #3b82f6 25%, transparent 25%, transparent 75%, #3b82f6 75%, #3b82f6)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}>
             </div>
             
             <div className="absolute bottom-6 left-8 z-10 flex items-end gap-6">
                 <div className="w-24 h-24 squircle-2xl bg-background shadow-xl flex items-center justify-center border-4 border-background">
                     <Hospital className="w-12 h-12 text-info" />
                 </div>
                 <div className="mb-2">
                     <h2 className="text-3xl font-black tracking-tighter leading-none mb-2">
                         {formData.name || 'New Facility'}
                     </h2>
                     <div className="flex items-center gap-2">
                         <Badge className={`squircle-sm ${formData.status === 'available' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} border-0 font-bold px-3 py-1`}>
                             {formData.status?.toUpperCase() || 'AVAILABLE'}
                         </Badge>
                         <Badge className="squircle-sm bg-background/50 backdrop-blur-md border-0 font-medium px-3 py-1">
                             {formData.type?.toUpperCase()}
                         </Badge>
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
                
                {/* General Information */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Facility Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase">Hospital Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold text-lg"
                                placeholder="General Hospital..."
                            />
                        </div>
                        
                         <div className="space-y-2">
                            <Label htmlFor="type" className="text-xs font-bold text-muted-foreground uppercase">Tier</Label>
                            <Select 
                                value={formData.type} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="basic">Basic</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                         <div className="space-y-2">
                            <Label htmlFor="emergency_level" className="text-xs font-bold text-muted-foreground uppercase">Trauma Level</Label>
                            <Input
                                id="emergency_level"
                                name="emergency_level"
                                value={formData.emergency_level}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-medium"
                                placeholder="Level 1 Trauma..."
                            />
                        </div>
                    </div>
                </div>

                {/* Capacity & Stats */}
                <div className="p-5 squircle-xl bg-muted/20 border border-white/5 space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-info" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Live Capacity</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Beds</Label>
                            <div className="relative">
                                <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    name="available_beds"
                                    value={formData.available_beds}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-background border-0 h-10 pl-9 font-bold"
                                />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Ambulances</Label>
                            <div className="relative">
                                <Ambulance className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    name="ambulances_count"
                                    value={formData.ambulances_count}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-background border-0 h-10 pl-9 font-bold"
                                />
                            </div>
                         </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Wait Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    name="wait_time"
                                    value={formData.wait_time}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-background border-0 h-10 pl-9 font-bold"
                                />
                            </div>
                         </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rating</Label>
                            <div className="relative">
                                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warning fill-warning" />
                                <Input
                                    type="number"
                                    step="0.1"
                                    name="rating"
                                    value={formData.rating}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-background border-0 h-10 pl-9 font-bold"
                                />
                            </div>
                         </div>
                    </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Location & Contact</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="address" className="text-xs font-bold text-muted-foreground uppercase">Address</Label>
                             <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Textarea
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] pl-10 pt-3 font-medium resize-none"
                                />
                             </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase">Phone</Label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-mono"
                                />
                             </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase">Operational Status</Label>
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
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
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
                                {loading ? 'Saving...' : (isCreate ? 'Add Facility' : 'Save Changes')}
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
