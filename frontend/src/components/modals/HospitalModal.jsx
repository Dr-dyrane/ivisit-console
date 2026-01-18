"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { X, Hospital, MapPin, Phone, Bed, Ambulance, Star, Clock, Activity } from 'lucide-react';
import { Badge } from '../ui/badge';

export const HospitalModal = ({ isOpen, onClose, hospital, mode, onSave }) => {
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
      if (onSave) {
        await onSave(formData);
      }
      toast.success(isCreate ? 'Hospital created successfully' : 'Hospital updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error('Failed to save hospital');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => onClose(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/20 rounded-2xl">
                  <Hospital className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
                    {formData.name || 'New Facility'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider ${formData.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                      {formData.status || 'AVAILABLE'}
                    </Badge>
                    <Badge className="rounded-full bg-white/10 border-0 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wider text-blue-400">
                      {formData.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => onClose(false)}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* General Information */}
                <GlassCard icon={<Activity />} title="Facility Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase px-1">Hospital Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold text-lg"
                        placeholder="General Hospital..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-xs font-bold text-muted-foreground uppercase px-1">Tier</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emergency_level" className="text-xs font-bold text-muted-foreground uppercase px-1">Trauma Level</Label>
                      <Input
                        id="emergency_level"
                        name="emergency_level"
                        value={formData.emergency_level}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-medium"
                        placeholder="Level 1 Trauma..."
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Capacity & Stats */}
                <GlassCard icon={<Activity />} title="Live Capacity">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Beds</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          name="available_beds"
                          value={formData.available_beds}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Ambulances</Label>
                      <div className="relative">
                        <Ambulance className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          name="ambulances_count"
                          value={formData.ambulances_count}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Wait Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          name="wait_time"
                          value={formData.wait_time}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Rating</Label>
                      <div className="relative">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 fill-orange-500" />
                        <Input
                          type="number"
                          step="0.1"
                          name="rating"
                          value={formData.rating}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Location & Contact */}
                <GlassCard icon={<MapPin />} title="Location & Contact">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="address" className="text-xs font-bold text-muted-foreground uppercase px-1">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] pl-10 pt-3 font-medium resize-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase px-1">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase px-1">Operational Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="busy">Busy</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCard>

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 rounded-[24px] bg-white/5 border border-white/10 flex gap-3 justify-end">
                  {!isView ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-2xl font-bold text-muted-foreground hover:bg-white/10"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-2xl bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Add Facility' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-2xl bg-white/10 text-foreground hover:bg-white/20 font-bold px-8"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border border-white/10 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-primary' })}
      </div>
      <h3 className="font-bold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
