import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Ambulance, MapPin, Activity, Star, Calendar, Hospital, Shield, Zap } from 'lucide-react';
import { Badge } from '../ui/badge';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { createAmbulance, updateAmbulance, getDrivers, assignDriverToAmbulance } from '../../services/ambulancesService';

import { uploadImage } from '../../services/storageService';
import { Loader2, Upload, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getProfilesByRole } from '../../services/profilesService';

export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [formData, setFormData] = useState({
    call_sign: '',
    type: 'basic',
    status: 'available',
    vehicle_number: '',
    hospital_id: '',
    eta: 'N/A',
    rating: 4.5,
    last_maintenance: '',
    profile_id: '',
    ...ambulance
  });

  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [fetchingProfiles, setFetchingProfiles] = useState(false);
  const [linkingExisting, setLinkingExisting] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [hospitals, setHospitals] = useState([]);

  // Sync formData when ambulance prop changes
  useEffect(() => {
    if (ambulance) {
      setFormData(prev => ({
        ...prev,
        ...ambulance,
        // Ensure proper fallbacks for select fields
        type: ambulance.type || 'basic',
        status: ambulance.status || 'available',
        hospital_id: ambulance.hospital_id || '',
        rating: ambulance.rating || 4.5
      }));
    } else if (isCreate && isOrgAdmin() && orgId) {
      setFormData(prev => ({ ...prev, hospital_id: orgId }));
    }
  }, [ambulance, isCreate, isOrgAdmin, orgId]);


  useEffect(() => {
    fetchHospitals();
    if (isCreate) {
      fetchAvailableProfiles();
    }
  }, [isCreate]);

  const fetchHospitals = async () => {
    try {
      const { data } = await supabase.from('hospitals').select('id, name');
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

  const fetchAvailableProfiles = async () => {
    try {
      setFetchingProfiles(true);
      // Get only provider profiles
      const profiles = await getProfilesByRole('provider');

      // Get existing ambulances to avoid duplicates
      const { data: existingAmbulances } = await supabase.from('ambulances').select('profile_id');
      const existingProfileIds = new Set(existingAmbulances?.map(a => a.profile_id).filter(Boolean) || []);

      // Filter: Only show those not already linked AND who are compatible (Ambulance type or unset)
      const available = profiles.filter(p => {
        const isAlreadyLinked = existingProfileIds.has(p.id);
        const isCompatibleProvider = p.provider_type === 'ambulance' || !p.provider_type;
        return !isAlreadyLinked && isCompatibleProvider;
      });

      setAvailableProfiles(available);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setFetchingProfiles(false);
    }
  };

  const handleProfileSelect = (profileId) => {
    const profile = availableProfiles.find(p => p.id === profileId);
    if (profile) {
      setFormData(prev => ({
        ...prev,
        profile_id: profile.id,
        call_sign: profile.username || prev.call_sign,
        hospital_id: profile.organization_id || prev.hospital_id,
        image: profile.image_uri || profile.avatar_url || prev.image
      }));
    }
  };

  // Handle legacy hospital text field → hospital_id lookup
  useEffect(() => {
    if (ambulance && !ambulance.hospital_id && ambulance.hospital && hospitals.length > 0) {
      // Find hospital ID by matching name (case-insensitive)
      const matchingHospital = hospitals.find(
        h => h.name.toLowerCase() === ambulance.hospital.toLowerCase()
      );
      if (matchingHospital) {
        setFormData(prev => ({
          ...prev,
          hospital_id: matchingHospital.id
        }));
      }
    }
  }, [ambulance, hospitals]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(file, 'ambulances');
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
        const data = await createAmbulance(formData);

        await createNotification(
          NotificationTypes.AMBULANCE,
          NotificationActions.CREATED,
          data.id,
          { message: `${formData.call_sign} has been added to the fleet` }
        );
        toast.success('Ambulance created successfully');
      } else if (isEdit) {
        await updateAmbulance(ambulance.id, formData);

        await createNotification(
          NotificationTypes.AMBULANCE,
          NotificationActions.UPDATED,
          ambulance.id,
          { message: `${formData.call_sign} information has been updated` }
        );
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-500/20 rounded-2xl">
                  <Ambulance className="h-6 w-6 text-green-500" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.call_sign || 'Fleet Management'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Emergency response vehicle configuration</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-4 py-1 border-0 ${formData.status === 'available' ? 'bg-green-500/10 text-green-500' :
                  'bg-orange-500/10 text-orange-500'
                  }`}>
                  {formData.status?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">

              {/* Vehicle Summary Bubbles */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Zap className="w-5 h-5 text-primary opacity-60" />
                  </div>
                  <p className="text-xl font-semibold">{formData.type === 'critical' ? 'ALS' : 'BLS'}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Configuration</p>
                </div>
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Star className="w-5 h-5 text-yellow-500 opacity-60 fill-yellow-500/20" />
                  </div>
                  <p className="text-xl font-semibold">{formData.rating}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Crew Rank</p>
                </div>
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Shield className="w-5 h-5 text-blue-500 opacity-60" />
                  </div>
                  <p className="text-xl font-semibold truncate px-1">{formData.vehicle_number || '---'}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Registry</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {isCreate && (
                  <GlassCard
                    icon={linkingExisting ? <Users className="text-primary" /> : <UserPlus className="text-primary" />}
                    title="Account Linkage"
                    className="border-primary/20 bg-primary/5"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-semibold">Link Existing Provider</Label>
                          <p className="text-xs text-muted-foreground">Select an existing account to link this vehicle</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLinkingExisting(!linkingExisting);
                            if (linkingExisting) {
                              setFormData(prev => ({ ...prev, profile_id: '' }));
                            }
                          }}
                          className="rounded-xl border-dashed"
                        >
                          {linkingExisting ? 'Switch to Manual' : 'Link Existing'}
                        </Button>
                      </div>

                      {linkingExisting && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Select Provider Account</Label>
                          <Select
                            value={formData.profile_id}
                            onValueChange={handleProfileSelect}
                          >
                            <SelectTrigger className="rounded-xl bg-background/50 border-white/10 h-12 shadow-inner">
                              <SelectValue placeholder={fetchingProfiles ? "Loading profiles..." : "Choose a provider..."} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl max-h-64">
                              {availableProfiles.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground italic">
                                  {fetchingProfiles ? 'Finding available providers...' : 'No unlinked providers found'}
                                </div>
                              ) : (
                                availableProfiles.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="py-2">
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{p.full_name || p.username}</span>
                                      <span className="text-[10px] opacity-70 truncate max-w-[200px]">{p.email}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {availableProfiles.length > 0 && (
                            <p className="text-[10px] text-primary/70 ml-1 italic font-medium">Auto-populates call sign and organization</p>
                          )}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unit Specifications */}
                  <GlassCard icon={<Activity className="text-primary" />} title="Unit Specifications">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Call Sign</Label>
                        <Input
                          name="call_sign"
                          value={formData.call_sign || ''}
                          onChange={handleChange}
                          disabled={isView}
                          placeholder="MEDIC-1"
                          className="rounded-xl bg-white/5 border-white/10 h-11 font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Plate Number</Label>
                          <Input
                            name="vehicle_number"
                            value={formData.vehicle_number || ''}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="ABC-123"
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Status</Label>
                          <Select
                            value={formData.status || 'available'}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            disabled={isView}
                          >
                            <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="en_route">En Route</SelectItem>
                              <SelectItem value="busy">Busy</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Vehicle Type</Label>
                        <Select
                          value={formData.type || 'basic'}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                          disabled={isView}
                        >
                          <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                            <SelectItem value="basic">Basic Life Support (BLS)</SelectItem>
                            <SelectItem value="advanced">Advanced Life Support (ALS)</SelectItem>
                            <SelectItem value="critical">Critical Care Transport</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="image" className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Ambulance Image</Label>
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
                                alt="Ambulance Preview"
                                className="w-full h-48 object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Inputs */}
                        {!isView ? (
                          <div className="flex gap-2">
                            <Input
                              name="image"
                              value={formData.image || ''}
                              onChange={handleChange}
                              disabled={uploading}
                              placeholder="https://..."
                              className="rounded-xl bg-white/5 border-white/10 h-11 flex-1"
                            />
                            <div className="relative">
                              <input
                                type="file"
                                id="ambulance-image-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                              />
                              <Label
                                htmlFor="ambulance-image-upload"
                                className={`h-11 px-4 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </Label>
                            </div>
                          </div>
                        ) : (
                          !formData.image && <p className="text-sm text-muted-foreground italic px-1">No image available</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Operational Data */}
                  <div className="space-y-6">
                    <GlassCard icon={<Hospital className="text-purple-500" />} title="Deployment">
                      <div className="space-y-4">
                        {/* Hospital Selection - Scoped for Org Admin */}
                        {/* Hospital Selection - Scoped for Org Admin */}
                        {(isAdmin() || (isOrgAdmin() && isView)) && (
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Base Station / Hospital</Label>
                            {isView && !formData.hospital_id && formData.hospital ? (
                              <div className="flex items-center h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                                <span>{formData.hospital}</span>
                              </div>
                            ) : (
                              <Select
                                value={formData.hospital_id || ''}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                                disabled={isView}
                              >
                                <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                                  <SelectValue placeholder="Select hospital" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                                  {hospitals.map(h => (
                                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Last Maintenance Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                            <Input
                              type="date"
                              name="last_maintenance"
                              value={formData.last_maintenance || ''}
                              onChange={handleChange}
                              disabled={isView}
                              className="rounded-xl bg-white/5 border-white/10 h-11 pl-10"
                            />
                          </div>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard icon={<Star className="text-yellow-500" />} title="Performance">
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Crew Rating (1-5)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            name="rating"
                            value={formData.rating || ''}
                            onChange={handleChange}
                            disabled={isView}
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-semibold"
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClose(false)}
                    className="rounded-full px-8 h-12 font-semibold"
                  >
                    {isView ? 'Close' : 'Cancel'}
                  </Button>
                  {!isView && (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="rounded-full px-12 h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                    >
                      {loading ? 'Processing...' : (isCreate ? 'Add Unit' : 'Save Configuration')}
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

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`p-4 sm:p-6 rounded-[28px] bg-white/5 border-white/10 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
