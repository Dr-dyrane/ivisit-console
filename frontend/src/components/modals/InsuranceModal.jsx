import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { X, Save, Upload, Shield, Calendar, Building, CreditCard, FileText, CheckCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
    verified: false
  });
  const [loading, setLoading] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState(null);
  const [backImageFile, setBackImageFile] = useState(null);

  useEffect(() => {
    if (policy && (mode === 'edit' || mode === 'view')) {
      setFormData({
        user_id: policy.user_id || '',
        provider_name: policy.provider_name || '',
        policy_number: policy.policy_number || '',
        group_number: policy.group_number || '',
        policy_holder_name: policy.policy_holder_name || '',
        coverage_type: policy.coverage_type || 'health_maintenance',
        start_date: policy.start_date || '',
        end_date: policy.end_date || '',
        front_image_url: policy.front_image_url || '',
        back_image_url: policy.back_image_url || '',
        status: policy.status || 'active',
        verified: policy.verified || false
      });
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

      // Simulate image upload for now
      if (frontImageFile) {
        finalFormData.front_image_url = `https://example.com/front-${Date.now()}.jpg`;
      }
      if (backImageFile) {
        finalFormData.back_image_url = `https://example.com/back-${Date.now()}.jpg`;
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
      toast.error(`Failed to ${mode} insurance policy`);
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

    // Map internal color names to tailwind classes if needed, or rely on badge variants
    switch (color) {
      case 'success': return 'text-success bg-success/10 border-success/20';
      case 'destructive': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      default: return 'text-muted-foreground bg-muted border-muted';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl bg-background/50 backdrop-blur-xs border-0 max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">

        {/* Geometric Header */}
        <div className="relative h-32 bg-gradient-to-r from-primary/10 via-background to-background overflow-hidden flex items-center justify-between px-8">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px)', backgroundSize: '40px 100%' }}>
          </div>

          <div className="z-10">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`squircle-sm border font-bold uppercase tracking-widest px-2 py-0.5 text-[10px] ${getStatusColor(formData.status)}`}>
                {formData.status}
              </Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tighter leading-none">
              {mode === 'create' ? 'New Policy' : mode === 'edit' ? 'Edit Policy' : 'Policy Details'}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {formData.provider_name || 'Select Provider'}
            </p>
          </div>

          <div className="z-10 hidden md:block">
            <div className="w-16 h-16 squircle-xl bg-background shadow-lg flex items-center justify-center border-4 border-background text-primary">
              <Shield className="w-8 h-8" />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-full hover:bg-foreground/5 text-foreground z-20"
            onClick={() => onClose(false)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="px-8 pb-8 pt-6 relative z-10 overflow-y-auto max-h-[calc(90vh-8rem)] custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIconLabel icon={Building} label="Provider Details" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Provider Name</Label>
                  <Select
                    value={formData.provider_name}
                    onValueChange={(val) => handleChange('provider_name', val)}
                    disabled={isView}
                  >
                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                      {providers.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Policy Holder</Label>
                  <Input
                    value={formData.policy_holder_name}
                    onChange={(e) => handleChange('policy_holder_name', e.target.value)}
                    disabled={isView}
                    placeholder="Full Name"
                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Policy Numbers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIconLabel icon={CreditCard} label="Policy Information" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Policy Number</Label>
                  <Input
                    value={formData.policy_number}
                    onChange={(e) => handleChange('policy_number', e.target.value)}
                    disabled={isView}
                    placeholder="e.g. POL-12345678"
                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Group Number</Label>
                  <Input
                    value={formData.group_number}
                    onChange={(e) => handleChange('group_number', e.target.value)}
                    disabled={isView}
                    placeholder="Optional"
                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Coverage & Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIconLabel icon={Calendar} label="Coverage Period" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    disabled={isView}
                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    disabled={isView}
                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Coverage Type</Label>
                  <Select
                    value={formData.coverage_type}
                    onValueChange={(val) => handleChange('coverage_type', val)}
                    disabled={isView}
                  >
                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                      {coverageTypes.map(t => (
                        <SelectItem key={t} value={t}>
                          {t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => handleChange('status', val)}
                    disabled={isView}
                  >
                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                      {statuses.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Card Images */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIconLabel icon={ImageIcon} label="Insurance Card Images" />
              </div>
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
            </div>

            {/* Verification Checkbox (Admin/Edit) */}
            {(isEdit || isView) && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.verified ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Verification Status</h4>
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
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="text-sm text-primary/80">
                  <p className="font-bold mb-1">Important Note</p>
                  <p className="text-xs leading-relaxed opacity-90">
                    Ensure all information matches your physical insurance card exactly.
                    Incorrect details may lead to claim rejections.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
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
                    className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow font-bold px-8 text-primary-foreground"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (isCreate ? 'Add Policy' : 'Save Changes')}
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

// Helper Components
const UserIconLabel = ({ icon: Icon, label }) => (
  <>
    <Icon className="w-4 h-4 text-primary" />
    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">{label}</h3>
  </>
);

const ImageUploadBox = ({ label, image, onUpload, onRemove, disabled }) => (
  <div>
    <Label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">{label}</Label>
    <div className={`border-2 border-dashed border-border/50 rounded-xl p-4 text-center transition-colors ${!disabled && 'hover:bg-muted/30 hover:border-primary/30'}`}>
      {image ? (
        <div className="space-y-3">
          <div className="relative aspect-video bg-black/5 rounded-lg overflow-hidden">
            <img
              src={image}
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
              className="squircle h-8 text-xs"
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
          <p className="text-xs text-muted-foreground font-medium">Click to upload image</p>
          {!disabled && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
                className="hidden"
                id={`upload-${label.replace(/\s+/g, '-')}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`upload-${label.replace(/\s+/g, '-')}`).click()}
                className="squircle h-8 text-xs font-bold"
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
