"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Shield, User, Phone, Mail, Calendar, CheckCircle, FileText, AlertTriangle, Ban, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { getAvatarFallback } from '../../lib/avatarUtils';

export const runVerificationAction = async ({
  onVerify,
  providerId,
  value,
  onSuccess,
}) => {
  const result = await onVerify(providerId, value);
  if (result === false) return false;

  onSuccess?.();
  return true;
};

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
        await runVerificationAction({
          onVerify,
          providerId: provider.id,
          value: formData,
          onSuccess: () => {
            toast.success('Verification status updated successfully');
            onClose();
          },
        });
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
      case 'success': return 'bg-emerald-500/15 text-emerald-300';
      case 'destructive': return 'bg-red-500/20 text-red-500';
      case 'warning': return 'bg-amber-400/15 text-amber-200';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const pendingTone = formData.bvn_verified
    ? 'bg-emerald-500/15 text-emerald-300'
    : 'bg-amber-400/15 text-amber-200';

  const handleVerifyAction = async (approved) => {
    setLoading(true);
    try {
      await runVerificationAction({
        onVerify,
        providerId: provider.id,
        value: approved,
        onSuccess: () => {
          toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
          onClose();
        },
      });
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={mode === 'view' ? 'Provider Details' : 'Verification Review'}
      subtitle={formData.username || 'Unknown Provider'}
      icon={<Shield className="h-6 w-6 text-amber-700 dark:text-amber-200" />}
      badge={
        <div className="flex items-center gap-2">
          {provider?.display_id && (
            <span className="inline-flex items-center rounded-pill bg-muted/30 text-foreground/70 font-mono text-[10px] px-2 py-0.5">
              {provider.display_id}
            </span>
          )}
          <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${pendingTone}`}>
            {formData.bvn_verified ? 'VERIFIED' : 'PENDING'}
          </span>
        </div>
      }
      size="lg"
      managed
    >
            <div className="p-2 md:p-8 pt-2 overflow-y-auto flex-1 min-h-0 space-y-4 md:space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Profile Overview */}
                <GlassCard icon={<User className="text-amber-700 dark:text-amber-200" />} title="Profile Information">
                  <div className="flex items-center gap-6 mb-6">
                    <Avatar className="h-20 w-20 rounded-icon shadow-lg">
                      <AvatarImage src={provider?.avatar_url || provider?.image_uri || undefined} />
                      <AvatarFallback className="text-xl font-bold bg-amber-400/10 text-amber-700 dark:text-amber-200">
                        {getAvatarFallback(provider)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold tracking-tight">{formData.username}</h3>
                      <p className="text-muted-foreground font-normal">{formData.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${pendingTone}`}>
                          {formData.bvn_verified ? 'BVN VERIFIED' : 'BVN PENDING'}
                        </span>
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
                        className="rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.16)] h-12 font-normal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        disabled={isView}
                        placeholder="+1 (555) 123-4567"
                        className="rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.16)] h-12 font-normal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(val) => handleChange('role', val)}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-inner bg-muted/30 h-12 font-normal">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="rounded-inner shadow-xl bg-background/95 backdrop-blur-xl">
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
                        className="w-full rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.16)] p-4 font-normal resize-none"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Verification Details */}
                <GlassCard icon={<Shield className="text-amber-700 dark:text-amber-200" />} title="Verification Details">
                  <div className="space-y-4">
                    <div className="p-4 rounded-card bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-pill flex items-center justify-center ${pendingTone}`}>
                          {formData.bvn_verified ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">BVN Verification</h4>
                          <p className="text-xs text-muted-foreground">Bank Verification Number status</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${pendingTone}`}>
                        {formData.bvn_verified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Verification Notes</Label>
                      <textarea
                        value={formData.verification_notes || ''}
                        onChange={(e) => handleChange('verification_notes', e.target.value)}
                        disabled={isView}
                        placeholder="Add notes about this verification..."
                        rows={4}
                        className="w-full rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_rgba(251,191,36,0.16)] p-4 font-normal resize-none"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Review note */}
                <div className="p-4 rounded-card bg-muted/30 shadow-[inset_0_0_36px_rgba(255,255,255,0.02)]">
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-amber-200 shrink-0" />
                    <div className="text-sm text-foreground/80">
                      <p className="font-semibold mb-1">Review note</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        Identity decisions update provider access. Only admins can approve or reject.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 rounded-card bg-muted/30 flex gap-3 justify-end">
                  {mode === 'view' ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => onClose(false)}
                        className="rounded-button bg-muted text-foreground hover:bg-muted/80 font-semibold px-8"
                      >
                        Close
                      </Button>
                      {/* Provider lane is APPROVE-ONLY (2026-07-10): providers have no rejected
                          state (single bvn_verified boolean), so Reject was a no-op. Approve
                          verifies; declining = leave the application pending. */}
                      {!formData.bvn_verified && onVerify && (
                        <Button
                          type="button"
                          onClick={() => handleVerifyAction(true)}
                          disabled={loading}
                          className="rounded-button bg-emerald-500/90 hover:bg-emerald-400 font-semibold px-8 text-white"
                        >
                          {loading ? 'Processing...' : 'Approve'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-button font-semibold text-muted-foreground hover:bg-muted"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-button bg-amber-400/90 hover:bg-amber-300 font-semibold px-8 text-black"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
    </ModalShell>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-card bg-muted/30">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-icon">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
