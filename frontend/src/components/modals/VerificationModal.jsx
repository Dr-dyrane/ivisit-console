"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { X, Shield, User, Phone, Mail, Calendar, CheckCircle, FileText, AlertTriangle, Ban, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';

export const VerificationModal = ({
  isOpen,
  provider,
  mode,
  onClose,
  onVerify,
  statuses = [
    { value: 'pending', label: 'Pending Review', color: 'warning' },
    { value: 'approved', label: 'Verified', color: 'success' },
    { value: 'rejected', label: 'Rejected', color: 'destructive' }
  ]
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: '',
    bvn_verified: false,
    verification_notes: '',
    created_at: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider && (mode === 'edit' || mode === 'view')) {
      setFormData({
        username: provider.username || '',
        email: provider.email || '',
        phone: provider.phone || '',
        role: provider.role || '',
        bvn_verified: provider.bvn_verified || false,
        verification_notes: provider.verification_notes || '',
        created_at: provider.created_at || ''
      });
    }
  }, [provider, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'edit') {
        await onVerify(provider.id, formData);
        toast.success('Verification status updated successfully');
        onClose();
      }
    } catch (error) {
      console.error('VerificationModal save failed:', error);
      toast.error(error?.message || 'Failed to save verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleVerifyAction = async (approved) => {
    setLoading(true);
    try {
      await onVerify(provider.id, approved);
      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      onClose();
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
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
                    {mode === 'view' ? 'Provider Details' : 'Verification Review'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {provider.display_id && (
                      <Badge className="rounded-full bg-primary/20 text-primary border-0 font-mono text-[10px] px-2 py-0.5">
                        {provider.display_id}
                      </Badge>
                    )}
                    <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs ${formData.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                      {formData.bvn_verified ? 'VERIFIED' : 'PENDING'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formData.username || 'Unknown Provider'}
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

                {/* Profile Overview */}
                <GlassCard icon={<User className="text-primary" />} title="Profile Information">
                  <div className="flex items-center gap-6 mb-6">
                    <Avatar className="h-20 w-20 rounded-2xl shadow-lg">
                      <AvatarImage src={getAvatarUrl(provider)} />
                      <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                        {getAvatarFallback(provider)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold tracking-tight">{formData.username}</h3>
                      <p className="text-muted-foreground font-normal">{formData.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs ${formData.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                          {formData.bvn_verified ? 'BVN VERIFIED' : 'BVN PENDING'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(formData.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</Label>
                      <Input
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={isView}
                        placeholder="email@example.com"
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        disabled={isView}
                        placeholder="+1 (555) 123-4567"
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(val) => handleChange('role', val)}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="provider">Provider</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Verification Notes</Label>
                      <textarea
                        value={formData.verification_notes || ''}
                        onChange={(e) => handleChange('verification_notes', e.target.value)}
                        disabled={isView}
                        placeholder="Add notes about this verification..."
                        rows={4}
                        className="w-full rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 p-4 font-normal resize-none"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Verification Details */}
                <GlassCard icon={<Shield className="text-primary" />} title="Verification Details">
                  <div className="space-y-4">
                    <div className="p-4 rounded-[24px] bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                          {formData.bvn_verified ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">BVN Verification</h4>
                          <p className="text-xs text-muted-foreground">Bank Verification Number status</p>
                        </div>
                      </div>
                      <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs ${formData.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {formData.bvn_verified ? 'VERIFIED' : 'PENDING'}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Verification Notes</Label>
                      <textarea
                        value={formData.verification_notes || ''}
                        onChange={(e) => handleChange('verification_notes', e.target.value)}
                        disabled={isView}
                        placeholder="Add notes about this verification..."
                        rows={4}
                        className="w-full rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 p-4 font-normal resize-none"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Security Notice */}
                <div className="p-4 rounded-[24px] bg-primary/5 border border-primary/10">
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="text-sm text-primary/80">
                      <p className="font-semibold mb-1">Security Notice</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        Verification actions are logged and audited. Only approve providers who have completed all required security checks.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30 flex gap-3 justify-end">
                  {mode === 'view' ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => onClose(false)}
                        className="rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-semibold px-8"
                      >
                        Close
                      </Button>
                      {!formData.bvn_verified && onVerify && (
                        <>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleVerifyAction(false)}
                            disabled={loading}
                            className="rounded-2xl font-semibold px-8"
                          >
                            {loading ? 'Processing...' : 'Reject'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleVerifyAction(true)}
                            disabled={loading}
                            className="rounded-2xl bg-success hover:bg-success/90 font-semibold px-8 text-success-foreground"
                          >
                            {loading ? 'Processing...' : 'Approve'}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
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
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
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
  <div className="p-4 sm:p-6 rounded-[28px] bg-muted/30">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);
