"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { X, User, Phone, Mail, MapPin, Calendar, Shield, CreditCard, BadgeCheck, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { getHospitals } from '../../services/hospitalsService';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';

export const UserModal = ({ isOpen, onClose, user, mode, onSave }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [hospitals, setHospitals] = useState([]);

  const inferRole = (u) => {
    if (!u) return 'patient';
    if (u.role) return u.role;
    if (u.profile_role) return u.profile_role;
    if (u.provider_type) return 'provider';
    return 'patient';
  };

  const getInitialFormState = (sourceUser) => ({
    ...(sourceUser || {}),
    username: sourceUser?.username || sourceUser?.profile_username || '',
    full_name: sourceUser?.full_name || '',
    email: sourceUser?.email || '',
    phone: sourceUser?.phone || '',
    role: inferRole(sourceUser),
    provider_type: sourceUser?.provider_type || '',
    gender: sourceUser?.gender || '',
    date_of_birth: sourceUser?.date_of_birth || '',
    address: sourceUser?.address || '',
    bvn_verified: !!sourceUser?.bvn_verified,
    organization_id: sourceUser?.organization_id || (isOrgAdmin() ? orgId : ''),
    image_uri: sourceUser?.image_uri || sourceUser?.avatar_url || '',
  });

  const [formData, setFormData] = useState(getInitialFormState(user));

  // Sync user prop to state when it changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        ...getInitialFormState(user),
        // Ensure normalized values win over raw source strings.
        role: inferRole(user),
        provider_type: user.provider_type || '',
        organization_id: user.organization_id || (isOrgAdmin() ? orgId : ''),
        image_uri: user.image_uri || user.avatar_url || '',
      }));
    } else if (isCreate) {
      // Reset for create mode
      setFormData(getInitialFormState(null))
    }
  }, [user, isCreate, isOrgAdmin, orgId]);

  useEffect(() => {
    if (isAdmin()) {
      const fetchHospitals = async () => {
        try {
          const data = await getHospitals({ limit: 100 });
          setHospitals(data);
        } catch (error) {
          console.error("Failed to load hospitals", error);
        }
      };
      fetchHospitals();
    }
  }, [isAdmin]);

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
    const normalizedRole = typeof formData.role === 'string' ? formData.role.trim() : formData.role;
    const normalizedProviderType = typeof formData.provider_type === 'string' ? formData.provider_type.trim() : formData.provider_type;
    const normalizedFullName = typeof formData.full_name === 'string' ? formData.full_name.trim() : formData.full_name;
    const normalizedEmail = typeof formData.email === 'string' ? formData.email.trim() : formData.email;

    if (!normalizedFullName) {
      toast.error('Full name is required');
      return;
    }

    if (!normalizedEmail) {
      toast.error('Email is required');
      return;
    }

    if (!normalizedRole) {
      toast.error('Please select a system role');
      return;
    }

    if (normalizedRole === 'provider' && !normalizedProviderType) {
      toast.error('Please select a provider type');
      return;
    }

    if ((normalizedRole === 'provider' || normalizedRole === 'org_admin') && !formData.organization_id) {
      toast.error('Please select an organization');
      return;
    }

    if (!onSave) {
      console.error('UserModal: onSave prop is required but was not provided');
      toast.error('Configuration error: cannot save. Please reload the page.');
      return;
    }
    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: normalizedRole,
        provider_type: normalizedRole === 'provider' ? normalizedProviderType : '',
        full_name: normalizedFullName,
        email: normalizedEmail,
      };

      await onSave(payload);
      toast.success(isCreate ? 'User created successfully' : 'User updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving user:', error);
      handleApiError(error, 'update');
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
            <div className="flex items-center justify-between p-2 md:p-8 pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 md:h-16 md:w-16 rounded-2xl border-4 border-background shadow-xl">
                  <AvatarImage
                    src={getAvatarUrl(formData)}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl md:text-2xl font-bold bg-muted text-muted-foreground rounded-2xl">
                    {getAvatarFallback(formData)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.username || formData.profile_username || 'New User'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="rounded-full bg-primary/10 text-primary border-0 font-semibold px-3 py-0.5 text-xs">
                      {formData.role?.toUpperCase() || 'PATIENT'}
                    </Badge>
                    {formData.bvn_verified && (
                      <Badge className="rounded-full bg-green-500/10 text-green-500 border-0 font-semibold px-3 py-0.5 text-xs flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> VERIFIED
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => onClose(false)}
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-2 md:p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Personal Information Section */}
                <GlassCard icon={<User className="text-primary" />} title="Personal Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-xs font-semibold text-muted-foreground uppercase">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 font-medium"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground uppercase">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 font-medium"
                        placeholder="johndoe123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email || ''}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 pl-10 font-normal"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone || ''}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 pl-10 font-mono"
                          placeholder="+234..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="date_of_birth" className="text-xs font-semibold text-muted-foreground uppercase">Date of Birth</Label>
                      <div className="relative min-w-0">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          value={formData.date_of_birth || ''}
                          onChange={handleChange}
                          disabled={isView}
                          className="w-full min-w-0 max-w-full rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 pl-10 pr-2 text-sm md:text-base font-normal"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Role & Access Section */}
                <GlassCard icon={<Shield className="text-primary" />} title="Role & Access">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-xs font-semibold text-muted-foreground uppercase">System Role</Label>
                      <Select
                        value={formData.role || undefined}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="provider">Provider</SelectItem>
                          {isAdmin() && (
                            <>
                              <SelectItem value="sponsor">Sponsor</SelectItem>
                              <SelectItem value="org_admin">Organization Admin</SelectItem>
                              <SelectItem value="admin">Platform Admin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.role === 'org_admin' || formData.role === 'provider') && (
                      <div className="space-y-2">
                        <Label htmlFor="organization_id" className="text-xs font-semibold text-muted-foreground uppercase">Organization</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                          {isView ? (
                            <div className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 font-medium flex items-center text-sm">
                              {formData.organization_name || '-'}
                            </div>
                          ) : isAdmin() ? (
                            <Select
                              value={formData.organization_id}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
                              disabled={isView}
                            >
                              <SelectTrigger className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 font-medium">
                                <SelectValue placeholder="Select Organization" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                {hospitals?.filter(h => h.organization_id).map(hospital => (
                                  <SelectItem key={hospital.organization_id} value={hospital.organization_id}>
                                    {hospital.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 font-medium flex items-center text-sm">
                              {formData.organization_name || '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.role === 'provider' && (
                      <div className="space-y-2">
                        <Label htmlFor="provider_type" className="text-xs font-semibold text-muted-foreground uppercase">Provider Type</Label>
                        <Select
                          value={formData.provider_type || undefined}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, provider_type: value }))}
                          disabled={isView}
                        >
                          <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-medium">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                            <SelectItem value="ambulance">Ambulance</SelectItem>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="paramedic">Paramedic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="col-span-1 md:col-span-2 p-4 rounded-2xl bg-primary/5 flex items-center justify-between border border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <BadgeCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Identity Verification</p>
                          <p className="text-xs text-muted-foreground">BVN and document status</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.bvn_verified}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bvn_verified: checked }))}
                        disabled={isView}
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Address Section */}
                <GlassCard icon={<MapPin className="text-primary" />} title="Location">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase">Full Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      disabled={isView}
                      className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                      placeholder="Street address, City, State"
                    />
                  </div>
                </GlassCard>

                {/* Footer Actions */}
                <div className="p-4 rounded-[24px] bg-muted/30 flex gap-3 justify-end">
                  {!isView ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-2xl font-semibold text-muted-foreground hover:bg-muted"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-2xl bg-primary hover:bg-primary/90 font-semibold px-8"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Create Profile' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-semibold px-8"
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
  <div className="p-4 rounded-[28px] bg-muted/30 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);
