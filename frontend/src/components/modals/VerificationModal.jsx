"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  BadgeCheck,
  Ban,
  Bed,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { getAvatarFallback } from '../../lib/avatarUtils';
import {
  formatAppliedDate,
  getFacilityClaims,
  getFacilityInitials,
  getFacilityProvenance,
  getFacilityStatusPresentation,
} from '../pages/verification/verificationQueueModel';

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

/**
 * Approvals record modal -- lane-aware (ADOPT-20).
 *
 * BOTH queues open this surface, so it renders each lane's own truth:
 *  - providers: profile identity + binary bvn_verified (approve-only).
 *  - facilities (isFacility): hospital name, RAW tri-state verification_status,
 *    address/phone/applied, claims + provenance projections. Approve AND Reject
 *    route through the SAME onVerify the page binds per lane (verifyOrganization
 *    for facilities -- never verifyProvider).
 *
 * The old "verification notes" textarea is gone: no notes column exists on
 * profiles OR hospitals (types/database.ts), so it silently discarded input.
 */
export const VerificationModal = ({
  isOpen,
  provider,
  isFacility = false,
  mode,
  onClose,
  onVerify,
  onReviewEvidence,
  onReviewClaim,
  onReviewOrganization,
}) => {
  const isView = mode === 'view';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: '',
    bvn_verified: false,
    created_at: ''
  });
  const [loading, setLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (provider && !isFacility && (mode === 'edit' || mode === 'view')) {
      setFormData({
        username: provider.username || '',
        email: provider.email || '',
        phone: provider.phone || '',
        role: provider.role || '',
        bvn_verified: provider.bvn_verified || false,
        created_at: provider.created_at || ''
      });
    }
  }, [provider, isFacility, mode]);

  useEffect(() => {
    if (isOpen) setReviewNote('');
  }, [isOpen, provider?.id]);

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

  const pendingTone = formData.bvn_verified
    ? 'bg-emerald-500/15 text-emerald-300'
    : 'bg-amber-400/15 text-amber-200';

  // Provider lane action. APPROVE-ONLY (2026-07-10): providers have no rejected
  // state (single bvn_verified boolean), so this is only ever invoked with true.
  // Success feedback (toast) is owned by the page's verify command; the modal
  // just closes on a successful result.
  const handleVerifyAction = async (approved) => {
    setLoading(true);
    try {
      await runVerificationAction({
        onVerify,
        providerId: provider.id,
        value: approved,
        onSuccess: () => onClose(),
      });
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  // Facility lane action: real Approve AND Reject against the tri-state
  // hospitals.verification_status receiver the page binds as onVerify.
  const handleFacilityDecision = async (approved) => {
    if (approved && !canApproveFacility) {
      toast.error('Approve evidence, ownership, and organization first.');
      return;
    }
    setLoading(true);
    try {
      await runVerificationAction({
        onVerify,
        providerId: provider.id,
        value: approved,
        onSuccess: () => onClose(),
      });
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  const runOnboardingReview = async (command, ...args) => {
    setLoading(true);
    try {
      const result = await command?.(...args);
      if (result !== false) onClose();
    } catch (error) {
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  // Facility projections (verificationQueueModel is the single projection
  // boundary -- honest nulls: absent columns render nothing, never a guess).
  const facilityName = provider?.name || 'Unnamed facility';
  const facilityStatus = isFacility ? getFacilityStatusPresentation(provider?.verification_status) : null;
  const facilityClaims = isFacility ? getFacilityClaims(provider) : null;
  const facilityProvenance = isFacility ? getFacilityProvenance(provider) : null;
  const facilityHasClaims = Boolean(
    facilityClaims && (
      facilityClaims.beds !== null
      || facilityClaims.eligibility !== null
      || facilityClaims.specialties.length > 0
      || facilityClaims.serviceTypes.length > 0
    ),
  );
  // Decisions apply to un-reviewed applications: pending, or an honest-null
  // status (no verification_status recorded yet). Verified/rejected/unknown
  // stored states get no write affordance here.
  const facilityActionable = !facilityStatus || facilityStatus.key === 'pending';
  const onboardingOrganization = isFacility ? provider?.onboarding_organization : null;
  const facilityClaim = isFacility ? provider?.facility_claim : null;
  const verificationDocuments = isFacility && Array.isArray(provider?.verification_documents)
    ? provider.verification_documents
    : [];
  const acceptedEvidence = verificationDocuments.some((document) => document.review_status === 'accepted');
  const claimApproved = !facilityClaim || facilityClaim.status === 'approved';
  const organizationVerified = onboardingOrganization?.verification_status === 'verified';
  const canApproveClaim = acceptedEvidence && facilityClaim?.status !== 'approved';
  const canApproveOrganization = acceptedEvidence && claimApproved && !organizationVerified;
  const canApproveFacility = organizationVerified && claimApproved;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={isFacility ? 'Facility Details' : (mode === 'view' ? 'Provider Details' : 'Verification Review')}
      subtitle={isFacility ? facilityName : (formData.username || 'Unknown Provider')}
      icon={isFacility
        ? <Building2 className="h-6 w-6 text-sky-700 dark:text-sky-200" />
        : <Shield className="h-6 w-6 text-amber-700 dark:text-amber-200" />}
      badge={
        <div className="flex items-center gap-2">
          {provider?.display_id && (
            <span className="inline-flex items-center rounded-pill bg-muted/30 text-foreground/70 font-mono text-[10px] px-2 py-0.5">
              {provider.display_id}
            </span>
          )}
          {isFacility ? (
            facilityStatus && (
              <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${facilityStatus.toneClass}`}>
                {facilityStatus.label}
              </span>
            )
          ) : (
            <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${pendingTone}`}>
              {formData.bvn_verified ? 'VERIFIED' : 'PENDING'}
            </span>
          )}
        </div>
      }
      size="lg"
      managed
    >
            <div className="p-2 md:p-8 pt-2 overflow-y-auto flex-1 min-h-0 space-y-4 md:space-y-6 no-scrollbar">
              {isFacility ? (
                <div className="space-y-6">

                  {/* Facility overview */}
                  <GlassCard icon={<Building2 className="text-sky-700 dark:text-sky-200" />} title="Facility Information">
                    <div className="flex items-center gap-6 mb-6">
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-icon bg-sky-500/10 text-2xl font-bold text-sky-700 shadow-lg dark:text-sky-200">
                        {getFacilityInitials(facilityName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-xl font-bold tracking-tight" title={facilityName}>{facilityName}</h3>
                        {provider?.type && (
                          <p className="capitalize text-muted-foreground font-normal">{provider.type}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {facilityStatus && (
                            <span className={`inline-flex items-center rounded-pill font-semibold px-3 py-0.5 text-xs ${facilityStatus.toneClass}`}>
                              {facilityStatus.label}
                            </span>
                          )}
                          {facilityProvenance && (
                            <span className="inline-flex items-center rounded-pill bg-muted/30 px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                              {facilityProvenance}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Applied {formatAppliedDate(provider?.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FacilityFact icon={MapPin} label="Address" value={provider?.address} />
                      <FacilityFact icon={Phone} label="Phone" value={provider?.phone} />
                      <FacilityFact icon={Building2} label="Facility type" value={provider?.type} />
                      <FacilityFact icon={Clock} label="Applied" value={formatAppliedDate(provider?.created_at)} />
                    </div>
                  </GlassCard>

                  {/* What approval unlocks -- claims from the application row */}
                  <GlassCard icon={<ListChecks className="text-sky-700 dark:text-sky-200" />} title="Application Claims">
                    {facilityHasClaims ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FacilityFact icon={Bed} label="Beds" value={facilityClaims.beds} />
                          <FacilityFact icon={BadgeCheck} label="Eligibility" value={facilityClaims.eligibility} />
                        </div>
                        {facilityClaims.specialties.length > 0 && (
                          <FacilityClaimChips label="Specialties" entries={facilityClaims.specialties} />
                        )}
                        {facilityClaims.serviceTypes.length > 0 && (
                          <FacilityClaimChips label="Services" entries={facilityClaims.serviceTypes} />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No claims recorded on this application.
                      </p>
                    )}
                  </GlassCard>

                  {onboardingOrganization && (
                    <GlassCard icon={<Shield className="text-sky-700 dark:text-sky-200" />} title="Organization Review">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FacilityFact icon={Building2} label="Organization" value={onboardingOrganization.name} />
                        <FacilityFact icon={BadgeCheck} label="Status" value={onboardingOrganization.verification_status} />
                        <FacilityFact icon={FileText} label="Registration" value={onboardingOrganization.registration_number} />
                        <FacilityFact icon={Phone} label="Contact" value={onboardingOrganization.contact_phone || onboardingOrganization.contact_email} />
                      </div>
                      {onReviewOrganization && onboardingOrganization.verification_status !== 'verified' && (
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(
                              onReviewOrganization,
                              onboardingOrganization.id,
                              'request_changes',
                              reviewNote,
                            )}
                            disabled={loading || !reviewNote.trim()}
                            className="rounded-button bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:text-amber-100"
                          >
                            Request changes
                          </Button>
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(
                              onReviewOrganization,
                              onboardingOrganization.id,
                              'reject',
                              reviewNote,
                            )}
                            disabled={loading || !reviewNote.trim()}
                            className="rounded-button bg-destructive/15 text-destructive hover:bg-destructive/25"
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(
                              onReviewOrganization,
                              onboardingOrganization.id,
                              'approve',
                              '',
                            )}
                            disabled={loading || !canApproveOrganization}
                            className="rounded-button bg-emerald-500/90 text-white hover:bg-emerald-400"
                          >
                            Approve organization
                          </Button>
                        </div>
                      )}
                    </GlassCard>
                  )}

                  <GlassCard icon={<FileText className="text-sky-700 dark:text-sky-200" />} title="Verification Evidence">
                    {verificationDocuments.length ? (
                      <div className="space-y-3">
                        {verificationDocuments.map((document) => {
                          const reviewable = ['pending', 'changes_requested'].includes(document.review_status);
                          return (
                            <div key={document.id} className="rounded-inner bg-background/45 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{document.original_name}</p>
                                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                                    {document.document_type} · {document.review_status.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                {reviewable && onReviewEvidence && (
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => runOnboardingReview(onReviewEvidence, document.id, 'accept', '')}
                                      disabled={loading}
                                      className="h-9 rounded-button bg-emerald-500/90 px-3 text-xs text-white hover:bg-emerald-400"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => runOnboardingReview(
                                        onReviewEvidence,
                                        document.id,
                                        'request_changes',
                                        reviewNote,
                                      )}
                                      disabled={loading || !reviewNote.trim()}
                                      className="h-9 rounded-button bg-amber-500/15 px-3 text-xs text-amber-900 hover:bg-amber-500/25 dark:text-amber-100"
                                    >
                                      Changes
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => runOnboardingReview(
                                        onReviewEvidence,
                                        document.id,
                                        'reject',
                                        reviewNote,
                                      )}
                                      disabled={loading || !reviewNote.trim()}
                                      className="h-9 rounded-button bg-destructive/15 px-3 text-xs text-destructive hover:bg-destructive/25"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {document.rejection_reason && (
                                <p className="mt-2 text-xs text-destructive">{document.rejection_reason}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No verification evidence is linked.</p>
                    )}
                  </GlassCard>

                  {facilityClaim && (
                    <GlassCard icon={<Building2 className="text-sky-700 dark:text-sky-200" />} title="Ownership Claim">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FacilityFact icon={BadgeCheck} label="Claim status" value={facilityClaim.status} />
                        <FacilityFact icon={FileText} label="Applicant context" value={facilityClaim.claim_note} />
                      </div>
                      {onReviewClaim && facilityClaim.status !== 'approved' && (
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(
                              onReviewClaim,
                              facilityClaim.id,
                              'request_changes',
                              reviewNote,
                            )}
                            disabled={loading || !reviewNote.trim()}
                            className="rounded-button bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 dark:text-amber-100"
                          >
                            Request changes
                          </Button>
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(
                              onReviewClaim,
                              facilityClaim.id,
                              'reject',
                              reviewNote,
                            )}
                            disabled={loading || !reviewNote.trim()}
                            className="rounded-button bg-destructive/15 text-destructive hover:bg-destructive/25"
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            onClick={() => runOnboardingReview(onReviewClaim, facilityClaim.id, 'approve', '')}
                            disabled={loading || !canApproveClaim}
                            className="rounded-button bg-emerald-500/90 text-white hover:bg-emerald-400"
                          >
                            Approve ownership
                          </Button>
                        </div>
                      )}
                    </GlassCard>
                  )}

                  {(onReviewEvidence || onReviewClaim || onReviewOrganization) && (
                    <label htmlFor="onboarding-review-note" className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
                        Review note for rejection or requested changes
                      </span>
                      <textarea
                        id="onboarding-review-note"
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value.slice(0, 1000))}
                        rows={3}
                        placeholder="Explain what needs attention"
                        className="w-full resize-none rounded-inner bg-muted/30 px-4 py-3 text-sm"
                      />
                    </label>
                  )}

                  {/* Review note */}
                  <div className="p-4 rounded-card bg-muted/30 shadow-[inset_0_0_36px_rgba(255,255,255,0.02)]">
                    <div className="flex gap-3">
                      <FileText className="h-5 w-5 text-sky-200 shrink-0" />
                      <div className="text-sm text-foreground/80">
                        <p className="font-semibold mb-1">Review note</p>
                        <p className="text-xs leading-relaxed opacity-90">
                          Review the claim, organization, and facility in order. Each approval is handled separately.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 sm:p-6 rounded-card bg-muted/30 flex flex-wrap gap-3 justify-end">
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-button bg-muted text-foreground hover:bg-muted/80 font-semibold px-8"
                    >
                      Close
                    </Button>
                    {onVerify && facilityActionable && (
                      <>
                        <Button
                          type="button"
                          onClick={() => handleFacilityDecision(false)}
                          disabled={loading}
                          className="rounded-button bg-destructive/90 hover:bg-destructive font-semibold px-6 text-white"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                          Reject
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleFacilityDecision(true)}
                          disabled={loading || !canApproveFacility}
                          className="rounded-button bg-emerald-500/90 hover:bg-emerald-400 font-semibold px-8 text-white"
                        >
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
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
                  </div>
                </GlassCard>

                {/* Verification Details */}
                <GlassCard icon={<Shield className="text-amber-700 dark:text-amber-200" />} title="Verification Details">
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
              )}
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

// Read-only facility fact row. HONEST NULLS: an absent value renders a muted
// 'Not provided' -- never a fabricated placeholder that looks like data.
const FacilityFact = ({ icon: Icon, label, value }) => (
  <div className="p-4 rounded-inner bg-muted/30 flex items-start gap-3">
    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
    <div className="min-w-0">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
      {value ? (
        <div className="mt-1 text-sm font-medium text-foreground [overflow-wrap:anywhere]">{value}</div>
      ) : (
        <div className="mt-1 text-sm font-normal text-muted-foreground/70">Not provided</div>
      )}
    </div>
  </div>
);

// Quiet chip list for facility claim arrays (rail parity: FacilityClaimChips).
const FacilityClaimChips = ({ label, entries }) => (
  <div className="p-4 rounded-inner bg-muted/30">
    <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <span
          key={entry}
          className="rounded-pill bg-background/45 px-2.5 py-1 text-[11px] font-medium text-foreground/80"
        >
          {entry}
        </span>
      ))}
    </div>
  </div>
);
