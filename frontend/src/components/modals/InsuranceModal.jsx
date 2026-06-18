"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { X, Upload, Shield, Calendar, Building, CreditCard, FileText, CheckCircle, ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { uploadInsuranceCardImage } from '../../services/insuranceService';

export const InsuranceModal = ({
  isOpen,
  policy,
  mode,
  onClose,
  onSave,
  coverageTypes = [
    'health_maintenance',
    'preferred_provider',
    'point_of_service'
  ],
  providers = [
    'Blue Cross Blue Shield',
    'UnitedHealthcare',
    'Aetna',
    'Cigna'
  ],
  statuses = [
    { value: 'active', label: 'Active', color: 'success' },
    { value: 'expired', label: 'Expired', color: 'destructive' },
    { value: 'pending', label: 'Pending', color: 'warning' }
  ]
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState({
    user_id: '',
    provider_name: '',
    policy_number: '',
    group_number: '',
    policy_holder_name: '',
    coverage_type: 'health_maintenance',
    start_date: '',
    end_date: '',
    front_image_url: '',
    back_image_url: '',
    status: 'active',
    verified: false,
    ...policy // ✅ Pattern B: Initial spread
  });
  const [loading, setLoading] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState(null);
  const [backImageFile, setBackImageFile] = useState(null);

  useEffect(() => {
    if (policy && (mode === 'edit' || mode === 'view')) {
      setFormData(prev => ({
        ...prev, // ✅ Keep existing
        ...policy, // ✅ Merge
        // Explicit Select fallbacks
        provider_name: policy.provider_name || prev.provider_name,
        coverage_type: policy.coverage_type || 'health_maintenance',
        status: policy.status || 'active',
        // Ensure other fields are mapped if null
        user_id: policy.user_id || prev.user_id,
        policy_number: policy.policy_number || prev.policy_number || '',
        group_number: policy.group_number || prev.group_number || '',
        front_image_url: policy.front_image_url || prev.front_image_url || '',
        back_image_url: policy.back_image_url || prev.back_image_url || '',
        verified: policy.verified ?? prev.verified ?? false
      }));
    } else if (mode === 'create') {
      setFormData({
        user_id: '',
        provider_name: '',
        policy_number: '',
        group_number: '',
        policy_holder_name: '',
        coverage_type: 'health_maintenance',
        start_date: '',
        end_date: '',
        front_image_url: '',
        back_image_url: '',
        status: 'active',
        verified: false
      });
    }
    setFrontImageFile(null);
    setBackImageFile(null);
  }, [policy, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalFormData = { ...formData };

      if (frontImageFile) {
        const url = await uploadInsuranceCardImage(frontImageFile);
        finalFormData.front_image_url = url;
      }
      if (backImageFile) {
        const url = await uploadInsuranceCardImage(backImageFile);
        finalFormData.back_image_url = url;
      }

      if (mode === 'create') {
        await onSave(finalFormData);
        toast.success('Insurance policy created successfully');
      } else {
        await onSave(policy.id, finalFormData);
        toast.success('Insurance policy updated successfully');
      }
      onClose();
    } catch (error) {
      console.error(error);
      handleApiError(error, mode);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (type, file) => {
    if (type === 'front') {
      setFrontImageFile(file);
      handleChange('front_image_url', file ? URL.createObjectURL(file) : '');
    } else {
      setBackImageFile(file);
      handleChange('back_image_url', file ? URL.createObjectURL(file) : '');
    }
  };

  const getStatusColor = (status) => {
    const statusConfig = statuses.find(s => s.value === status);
    const color = statusConfig?.color || 'secondary';
    switch (color) {
      case 'success': return 'bg-green-500/20 text-green-500';
      case 'destructive': return 'bg-red-500/20 text-red-500';
      case 'warning': return 'bg-orange-500/20 text-orange-500';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
            role="dialog"

            aria-modal="true"

            className="relative z-10 w-full max-w-3xl max-h-[calc(100dvh-5rem)] md:max-h-[90vh] overflow-hidden rounded-[24px] md:rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-2 md:p-8 pb-2 md:pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {mode === 'create' ? 'New Policy' : mode === 'edit' ? 'Edit Policy' : 'Policy Details'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs ${getStatusColor(formData.status)}`}>
                      {formData.status?.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formData.provider_name || 'Select Provider'}
                    </span>
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

            <div className="p-2 md:p-8 pt-1 md:pt-2 overflow-y-auto max-h-[calc(100dvh-9rem)] md:max-h-[calc(90vh-120px)] space-y-4 md:space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Information */}
                <GlassCard icon={<Building className="text-primary" />} title="Provider Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Provider Name</Label>
                      <Select
                        value={formData.provider_name}
                        onValueChange={(val) => handleChange('provider_name', val)}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          {providers.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Policy Holder</Label>
                      <Input
                        value={formData.policy_holder_name}
                        onChange={(e) => handleChange('policy_holder_name', e.target.value)}
                        disabled={isView}
                        placeholder="Full Name"
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Policy Numbers */}
                <GlassCard icon={<CreditCard className="text-primary" />} title="Policy Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Policy Number</Label>
                      <Input
                        value={formData.policy_number}
                        onChange={(e) => handleChange('policy_number', e.target.value)}
                        disabled={isView}
                        placeholder="e.g. POL-12345678"
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Group Number</Label>
                      <Input
                        value={formData.group_number}
                        onChange={(e) => handleChange('group_number', e.target.value)}
                        disabled={isView}
                        placeholder="Optional"
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Coverage & Dates */}
                <GlassCard icon={<Calendar className="text-primary" />} title="Coverage Period">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleChange('start_date', e.target.value)}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">End Date</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Coverage Type</Label>
                      <Select
                        value={formData.coverage_type}
                        onValueChange={(val) => handleChange('coverage_type', val)}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          {coverageTypes.map(t => (
                            <SelectItem key={t} value={t}>
                              {t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(val) => handleChange('status', val)}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          {statuses.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCard>

                {/* Card Images */}
                <GlassCard icon={<ImageIcon className="text-primary" />} title="Insurance Card Images">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadBox
                      label="Front of Card"
                      image={formData.front_image_url}
                      onUpload={(f) => handleImageUpload('front', f)}
                      onRemove={() => handleImageUpload('front', null)}
                      disabled={isView}
                    />
                    <ImageUploadBox
                      label="Back of Card"
                      image={formData.back_image_url}
                      onUpload={(f) => handleImageUpload('back', f)}
                      onRemove={() => handleImageUpload('back', null)}
                      disabled={isView}
                    />
                  </div>
                </GlassCard>

                {/* Verification Checkbox */}
                {(isEdit || isView) && (
                  <div className="p-4 rounded-[24px] bg-muted/30  flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.verified ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Verification Status</h4>
                        <p className="text-xs text-muted-foreground">Is this policy verified by admin?</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.verified}
                        onChange={(e) => handleChange('verified', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                        disabled={isView}
                      />
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="p-4 rounded-[24px] bg-primary/5 border border-primary/10">
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="text-sm text-primary/80">
                      <p className="font-semibold mb-1">Important Note</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        Ensure all information matches your physical insurance card exactly.
                        Incorrect details may lead to claim rejections.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30  flex gap-3 justify-end">
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
                        className="rounded-2xl bg-primary hover:bg-primary/90 font-semibold px-8 text-primary-foreground"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Add Policy' : 'Save Changes')}
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
  <div className="p-4 sm:p-6 rounded-[28px] bg-muted/30 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

const ImageUploadBox = ({ label, image, onUpload, onRemove, disabled }) => (
  <div>
    <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">{label}</Label>
    <div
      className={`border-2 border-dashed border-border/50 rounded-2xl p-4 text-center transition-colors relative ${!disabled ? 'hover:bg-muted/30 hover:border-primary/30 cursor-pointer' : ''}`}
      onClick={() => !disabled && !image && document.getElementById(`upload-${label.replace(/\s+/g, '-')}`).click()}
    >
      {image ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="relative aspect-video bg-muted/20 rounded-xl overflow-hidden">
            <img
              src={image || "/placeholder.svg"}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="rounded-xl h-8 text-xs z-10 relative"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Remove
            </Button>
          )}
        </div>
      ) : (
        <div className="py-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground font-normal">Click to upload image</p>
          {!disabled && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
                className="hidden"
                id={`upload-${label.replace(/\s+/g, '-')}`}
                onClick={(e) => e.stopPropagation()} // Prevent infinite loop
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-8 text-xs font-semibold bg-transparent pointer-events-none" // pointer-events-none passes click to parent
              >
                Choose File
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  </div>
);
