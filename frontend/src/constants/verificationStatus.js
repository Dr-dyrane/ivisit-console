// Single source of truth for the APPROVALS status vocabulary -- tone, label,
// icon -- across BOTH queues (providers + facilities) and every surface (page
// rows, detail rail, context panel, mobile). It normalizes two different storage
// shapes into ONE vocabulary so the color coding cannot drift (it drifted before:
// the page's getStatusBadge vs the org inline ternary vs the rail switch vs
// MobileVerification's raw hsl() -- Verification archaeology F2 + seam #4).
//
// DATA TRUTH (user decision 2026-07-10): providers are BINARY -- bvn_verified
// true/false, with NO rejected state (Reject removed for the provider lane
// because verifyProvider(id,false) was a no-op on already-false pending rows).
// Facilities are a real tri-state ENUM (hospitals.verification_status
// pending|verified|rejected). Literal palette only (the theme's
// --primary/--success/--warning/--info all render RED); --destructive is danger.
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

// Resolve the normalized status KEY ('pending' | 'approved' | 'rejected') from a
// raw record + which queue it belongs to.
export const getApprovalStatusKey = (item, queueType) => {
  if (queueType === 'organizations') {
    const s = String(item?.verification_status || 'pending').toLowerCase();
    if (s === 'verified' || s === 'approved' || s === 'partner') return 'approved';
    if (s === 'rejected' || s === 'suspended') return 'rejected';
    return 'pending';
  }
  // providers: binary, no rejected state.
  return item?.bvn_verified ? 'approved' : 'pending';
};

const APPROVAL_TONE = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  rejected: 'bg-destructive/12 text-destructive',
};

const APPROVAL_LABEL = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const APPROVAL_ICON = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

export const getApprovalToneClass = (key) => APPROVAL_TONE[key] || APPROVAL_TONE.pending;
export const getApprovalLabel = (key) => APPROVAL_LABEL[key] || APPROVAL_LABEL.pending;
export const getApprovalIcon = (key) => APPROVAL_ICON[key] || APPROVAL_ICON.pending;
