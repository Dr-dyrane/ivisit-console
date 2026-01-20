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

import { uploadImage } from '../../services/storageService';
import { Loader2, Upload } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(file, 'hospitals');
      setFormData(prev => ({
        ...prev,
        image: publicUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

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
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.name || 'New Facility'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-[10px] uppercase tracking-wider ${formData.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                      {formData.status || 'AVAILABLE'}
                    </Badge>
                    <Badge className="rounded-full bg-white/10 border-0 font-semibold px-3 py-0.5 text-[10px] uppercase tracking-wider text-blue-400">
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
                      <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase px-1">Hospital Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-semibold text-lg"
                        placeholder="General Hospital..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-xs font-semibold text-muted-foreground uppercase px-1">Tier</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
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
                      <Label htmlFor="emergency_level" className="text-xs font-semibold text-muted-foreground uppercase px-1">Trauma Level</Label>
                      <Input
                        id="emergency_level"
                        name="emergency_level"
                        value={formData.emergency_level}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                        placeholder="Level 1 Trauma..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_range" className="text-xs font-semibold text-muted-foreground uppercase px-1">Price Range</Label>
                    <Input
                      id="price_range"
                      name="price_range"
                      value={formData.price_range}
                      onChange={handleChange}
                      disabled={isView}
                      className="rounded-2xl bg-white/5 border-white/10 font-normal"
                      placeholder="e.g. $150"
                    />
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialties" className="text-xs font-semibold text-muted-foreground uppercase px-1">Specialties (comma separated)</Label>
                      <Input
                        id="specialties"
                        name="specialties"
                        value={Array.isArray(formData.specialties) ? formData.specialties.join(', ') : formData.specialties || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()) }))}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 font-normal"
                        placeholder="General Care, Surgery..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="features" className="text-xs font-semibold text-muted-foreground uppercase px-1">Features (comma separated)</Label>
                      <Input
                        id="features"
                        name="features"
                        value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value.split(',').map(s => s.trim()) }))}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 font-normal"
                        placeholder="Lab, Helipad..."
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Capacity & Stats */}
                <GlassCard icon={<Activity />} title="Live Capacity">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Beds</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          name="available_beds"
                          value={formData.available_beds}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Ambulances</Label>
                      <div className="relative">
                        <Ambulance className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          name="ambulances_count"
                          value={formData.ambulances_count}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Wait Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          name="wait_time"
                          value={formData.wait_time}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Rating</Label>
                      <div className="relative">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 fill-orange-500" />
                        <Input
                          type="number"
                          step="0.1"
                          name="rating"
                          value={formData.rating}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Location & Contact */}
                <GlassCard icon={<MapPin />} title="Location & Contact">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase px-1">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] pl-10 pt-3 font-normal resize-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase px-1">Phone</Label>
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
                      <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase px-1">Operational Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
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

                {/* Additional Settings */}
                <GlassCard icon={<Activity />} title="System & Verification">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <input
                        type="checkbox"
                        id="verified"
                        name="verified"
                        checked={formData.verified}
                        onChange={handleChange}
                        disabled={isView}
                        className="w-5 h-5 rounded-md accent-primary"
                      />
                      <Label htmlFor="verified" className="text-sm font-medium cursor-pointer">
                        Verified Partner
                        <p className="text-[10px] text-muted-foreground font-normal">Mark as a trusted medical facility</p>
                      </Label>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="image" className="text-xs font-semibold text-muted-foreground uppercase px-1">Hospital Image</Label>
                        {formData.image && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowImage(!showImage)}
                            className="h-5 text-[10px] text-primary hover:text-primary/90 hover:bg-primary/10 px-2"
                          >
                            {showImage ? 'Hide Preview' : 'View Image'}
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      <AnimatePresence>
                        {showImage && formData.image && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="rounded-xl overflow-hidden border border-white/10 relative bg-black/20"
                          >
                            <img
                              src={formData.image}
                              alt="Hospital Preview"
                              className="w-full h-48 object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Inputs - Hidden in View Mode unless explicit */}
                      {!isView ? (
                        <div className="flex gap-2">
                          <Input
                            id="image"
                            name="image"
                            value={formData.image || ''}
                            onChange={handleChange}
                            disabled={uploading}
                            className="rounded-2xl bg-white/5 border-white/10 font-normal flex-1"
                            placeholder="https://..."
                          />
                          <div className="relative">
                            <input
                              type="file"
                              id="image-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                            <Label
                              htmlFor="image-upload"
                              className={`h-10 px-4 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Label>
                          </div>
                        </div>
                      ) : (
                        // View Mode Fallback if image is missing or just to show url text optionally? 
                        // User said "in read form we only display image".
                        // If showImage is false, and we are in View mode, we show nothing? Or a placeholder?
                        // Let's show the input ONLY if showImage is false, so they can at least see the URL if they want? 
                        // Or stricly follow "only display image".
                        // I will hide the input in View mode completely as requested
                        !formData.image && <p className="text-sm text-muted-foreground italic px-1">No image available</p>
                      )}
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
                        className="rounded-2xl font-semibold text-muted-foreground hover:bg-white/10"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-2xl bg-primary hover:bg-primary/90 font-semibold px-8 shadow-lg shadow-primary/20"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Add Facility' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-2xl bg-white/10 text-foreground hover:bg-white/20 font-semibold px-8"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div >
      )}
    </AnimatePresence >
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border border-white/10 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-primary' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
