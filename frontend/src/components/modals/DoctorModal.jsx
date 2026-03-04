import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { Switch } from '../ui/switch';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { X, Stethoscope, Mail, Phone, Building, Award, Star, Activity, User, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { uploadImage } from '../../services/storageService';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { inviteUser } from '../../services/adminService';
import { createDoctor, updateDoctor, getDoctors } from '../../services/doctorsService';
import { getProfilesByRole } from '../../services/profilesService';

export const DoctorModal = ({ isOpen, onClose, doctor, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
    hospital_id: '',
    status: 'available',
    rating: 4.5,
    experience: 5,
    license_number: '',
    profile_id: '',
    ...doctor // Spread doctor data into initial state for proper Select prefilling
  });

  // Sync formData when doctor prop changes
  useEffect(() => {
    if (doctor) {
      setFormData(prev => ({
        ...prev,
        ...doctor,
        // Ensure proper fallbacks for select fields
        hospital_id: doctor.hospital_id || '',
        status: doctor.status || 'available',
        experience: doctor.experience || 5,
        rating: doctor.rating || 4.5
      }));
    } else if (isCreate && isOrgAdmin() && orgId) {
      setFormData(prev => ({ ...prev, hospital_id: orgId }));
    }
  }, [doctor, isCreate, isOrgAdmin, orgId]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [fetchingProfiles, setFetchingProfiles] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(file, 'doctors');
      setFormData(prev => ({
        ...prev,
        image: publicUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      handleApiError(error, 'create');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
    if (isCreate) {
      fetchAvailableProfiles();
    }
  }, [isCreate]);

  // Keep mobile bottom bar from overlapping the modal layer.
  useEffect(() => {
    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (!bottomBar) return undefined;

    const previousDisplay = bottomBar.style.display;
    if (isOpen) {
      bottomBar.style.display = 'none';
    }

    return () => {
      bottomBar.style.display = previousDisplay;
    };
  }, [isOpen]);

  const fetchAvailableProfiles = async () => {
    try {
      setFetchingProfiles(true);
      // Get only provider profiles
      const profiles = await getProfilesByRole('provider');

      // Also get existing doctors to avoid duplicates
      const { data: existingDoctors } = await getDoctors();
      const existingProfileIds = new Set(existingDoctors.map(d => d.profile_id).filter(Boolean));

      // Filter: Only show those not already linked AND who are compatible (Doctor type or unset)
      const available = profiles.filter(p => {
        const isAlreadyLinked = existingProfileIds.has(p.id);
        const isCompatibleProvider = p.provider_type === 'doctor' || !p.provider_type;
        return !isAlreadyLinked && isCompatibleProvider;
      });

      setAvailableProfiles(available);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setFetchingProfiles(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const { data } = await supabase.from('hospitals').select('id, name');
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    }
  };

  const handleProfileSelect = (profileId) => {
    const profile = availableProfiles.find(p => p.id === profileId);
    if (profile) {
      setFormData(prev => ({
        ...prev,
        profile_id: profile.id,
        name: profile.full_name || profile.username,
        email: profile.email,
        phone: profile.phone || '',
        image: profile.image_uri || profile.avatar_url || prev.image,
        hospital_id: profile.organization_id || prev.hospital_id
      }));
      setSendInvite(false); // No need to invite if they already exist
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.hospitals;

      if (isCreate) {
        if (!submitData.email) {
          toast.error("Email is required to invite the doctor");
          setLoading(false);
          return;
        }

        // 1. Create Doctor Record via Service (Handles sanitization)
        const createdDoctor = await createDoctor(submitData);

        // 2. Send Invitation
        if (sendInvite) {
          try {
            await inviteUser(submitData.email, 'provider', {
              provider_type: 'doctor',
              organization_id: submitData.hospital_id || null, // Ensure valid UUID or null
              full_name: submitData.name
            });
            toast.success('Doctor added & Invitation Sent');
          } catch (inviteError) {
            console.error("Invite failed:", inviteError);
            toast.warning("Doctor added to directory, but Invitation email failed.");
          }
        } else {
          toast.success('Doctor added to directory (No invite sent)');
        }

        await createNotification(
          NotificationTypes.DOCTOR,
          NotificationActions.CREATED,
          createdDoctor.id,
          { message: `Dr. ${submitData.name} has been added to the system` }
        );
      } else if (isEdit) {
        await updateDoctor(doctor.id, submitData);

        await createNotification(
          NotificationTypes.DOCTOR,
          NotificationActions.UPDATED,
          doctor.id,
          { message: `Dr. ${submitData.name} information has been updated` }
        );
        toast.success('Doctor updated successfully');
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving doctor:', error);
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(12px, var(--safe-top, 0px))',
            paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))'
          }}
        >
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
            className="relative z-10 w-full max-w-5xl max-h-[92dvh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col"
            style={{
              maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)'
            }}
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-2 md:p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-2.5 bg-primary/20 rounded-2xl">
                  <Stethoscope className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-lg md:text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.name || 'Professional Profile'}
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">{formData.specialization || 'Medical Specialist'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-3 md:px-4 py-1 text-xs border-0 ${formData.status === 'available' ? 'bg-green-500/10 text-green-500' :
                  formData.status === 'busy' ? 'bg-orange-500/10 text-orange-500' :
                    formData.status === 'on_call' ? 'bg-purple-500/10 text-purple-500' : 'bg-muted/10 text-muted-foreground'
                  }`}>
                  {formData.status?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2 md:p-8 pt-2 space-y-6 no-scrollbar relative">

                {/* Profile Summary Bubbles */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-4 rounded-[24px] bg-white/5  text-center">
                    <div className="flex justify-center mb-1">
                      <Award className="w-5 h-5 text-primary opacity-60" />
                    </div>
                    <p className="text-xl font-semibold">{formData.experience}+</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">Years Exp</p>
                  </div>
                  <div className="p-4 rounded-[24px] bg-white/5  text-center">
                    <div className="flex justify-center mb-1">
                      <Star className="w-5 h-5 text-yellow-500 opacity-60 fill-yellow-500/20" />
                    </div>
                    <p className="text-xl font-semibold">{formData.rating}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-50">Rating</p>
                  </div>
                </div>

                {/* Profile Link Selection (Create Only) */}
                {isCreate && !isManualEntry && (
                  <GlassCard icon={<Shield className="text-primary" />} title="Link Existing Account">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Select Provider Account</Label>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setIsManualEntry(true);
                            setFormData(prev => ({ ...prev, profile_id: '' }));
                          }}
                          className="text-xs h-auto p-0 opacity-70 hover:opacity-100"
                        >
                          Manual Entry / Invite
                        </Button>
                      </div>
                      <Select
                        value={formData.profile_id}
                        onValueChange={handleProfileSelect}
                        disabled={fetchingProfiles}
                      >
                        <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                          <SelectValue placeholder={fetchingProfiles ? "Loading accounts..." : "Choose an available provider..."} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                          {availableProfiles.length > 0 ? (
                            availableProfiles.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name || p.username} ({p.email})
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No unlinked provider accounts found.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground px-1">
                        Linking to an existing account will sync credentials and bypass email invitations.
                      </p>
                    </div>
                  </GlassCard>
                )}

                {isCreate && isManualEntry && (
                  <div className="flex justify-end -mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsManualEntry(false)}
                      className="text-xs h-auto p-0 opacity-70 hover:opacity-100"
                    >
                      ← Back to Profile Selection
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Profile Section */}
                  <GlassCard icon={<User className="text-blue-500" />} title="Profile Picture">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <Avatar className="h-32 w-32 border-4 border-white/10 shadow-xl">
                          <AvatarImage src={formData.image} />
                          <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                            {formData.name?.charAt(0) || 'D'}
                          </AvatarFallback>
                        </Avatar>
                        {!isView && (
                          <Label
                            htmlFor="image-upload"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                          >
                            <Upload className="h-8 w-8 text-white" />
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                          </Label>
                        )}
                      </div>
                      {!isView && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-2">Click to upload photo</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 mt-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Full Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          disabled={isView}
                          required
                          placeholder="Dr. John Smith"
                          className="rounded-xl bg-white/5 border-white/10 h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Specialty</Label>
                        <Input
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          disabled={isView}
                          required
                          placeholder="Cardiology"
                          className="rounded-xl bg-white/5 border-white/10 h-11"
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Professional & Contact */}
                  <div className="space-y-6">
                    <GlassCard icon={<Building className="text-purple-500" />} title="Professional">
                      <div className="space-y-3">
                        {/* Hospital Selection - Scoped for Org Admin */}
                        {(isAdmin() || (isOrgAdmin() && isView)) && (
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Primary Hospital</Label>
                            <Select
                              value={formData.hospital_id}
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
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">License Number</Label>
                          <Input
                            name="license_number"
                            value={formData.license_number}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="MD-123456"
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Years of Experience</Label>
                          <Input
                            name="experience"
                            type="number"
                            value={formData.experience}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="10"
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            disabled={isView}
                          >
                            <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="busy">Busy</SelectItem>
                              <SelectItem value="off_duty">Off Duty</SelectItem>
                              <SelectItem value="on_call">On Call</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard icon={<Phone className="text-green-500" />} title="Contact Info">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Email Address</Label>
                          <Input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isView}
                            required
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Phone Number</Label>
                          <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={isView}
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-mono"
                          />
                        </div>
                        {isCreate && (
                          <div className="flex items-center gap-3 pt-3 px-1 border-t border-white/10 mt-2">
                            <Switch
                              checked={sendInvite}
                              onCheckedChange={setSendInvite}
                              id="send-invite"
                            />
                            <div className="flex flex-col">
                              <Label htmlFor="send-invite" className="text-sm font-medium cursor-pointer">
                                Send Invitation
                              </Label>
                              <span className="text-[10px] text-muted-foreground opacity-70">
                                Email login credentials immediately
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </div>



                {/* Footer Actions - Sticky Bottom */}
              </div> {/* End Scroll View */}
              <div className="flex items-center justify-end gap-3 p-3 md:p-6 border-t border-white/5 bg-background/40 backdrop-blur-xl shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="rounded-full px-6 md:px-8 h-11 md:h-12 font-semibold"
                >
                  {isView ? 'Dismiss' : 'Cancel'}
                </Button>
                {!isView && (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-full px-8 md:px-12 h-11 md:h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                  >
                    {loading ? 'Saving...' : (isCreate ? 'Add Professional' : 'Save Changes')}
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )
      }
    </AnimatePresence >
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
