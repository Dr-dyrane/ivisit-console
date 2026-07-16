import React from 'react';
import {
  BadgeCheck,
  Ban,
  Bed,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  Info,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
} from 'lucide-react';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { DetailLine, Shimmer } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { getAvatarFallback } from '../../../lib/avatarUtils';
import {
  getApprovalIcon,
  getApprovalLabel,
  getApprovalToneClass,
} from '../../../constants/verificationStatus';
import {
  formatAppliedDate,
  formatOnboardingStatus,
  getApprovalProjection,
  getFacilityClaims,
  getFacilityInitials,
  getFacilityProvenance,
} from './verificationQueueModel';
import { getProviderTypeIcon } from './approvalPresentation';

const RailActionButton = ({ icon: Icon, label, onClick }) => (
  <Button
    variant="ghost"
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98]"
    onClick={onClick}
  >
    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
    {label}
  </Button>
);

// What a facility CLAIMS to offer -- the substance approval unlocks. Same
// fill-film row recipe as DetailLine; entries render as quiet chips.
const FacilityClaimChips = ({ label, entries }) => (
  <div className="rounded-inner bg-foreground/[0.045] p-2.5 dark:bg-white/[0.055]">
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
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

const ApprovalRailSkeleton = ({ embedded = false }) => (
  <DetailRailShell embedded={embedded}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="space-y-3">
        <Shimmer className="h-6 w-36 rounded-inner" />
        <Shimmer className="h-6 w-24 rounded-pill" />
      </div>
      <Shimmer className="h-9 w-9 rounded-pill" />
    </div>
    <div className="mb-5 flex items-center gap-4">
      <Shimmer className="h-14 w-14 shrink-0 rounded-pill" />
      <div className="min-w-0 flex-1 space-y-2">
        <Shimmer className="h-5 w-2/3 rounded-inner" />
        <Shimmer className="h-4 w-1/2 rounded-inner" />
      </div>
    </div>
    <div className="space-y-2">
      {[0, 1, 2, 3].map((index) => (
        <Shimmer key={index} className="h-[52px] w-full rounded-inner" />
      ))}
    </div>
  </DetailRailShell>
);

const ApprovalRailEmpty = ({ hasFilter, embedded = false }) => (
  <DetailRailShell embedded={embedded}>
    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
      <FileCheck className="mb-4 h-10 w-10 text-muted-foreground/60" />
      <h2 className="text-xl font-semibold">No application selected</h2>
      <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
        {hasFilter
          ? 'Applications that match your filters will appear here.'
          : 'Select an application to review its details here.'}
      </p>
    </div>
  </DetailRailShell>
);

export const ApprovalDetailRail = ({
  item,
  queueType,
  canApprove,
  actionLoading,
  loading,
  hasFilter,
  onOpen,
  onApprove,
  onReject,
  embedded = false,
}) => {
  if (loading) return <ApprovalRailSkeleton embedded={embedded} />;
  if (!item) return <ApprovalRailEmpty hasFilter={hasFilter} embedded={embedded} />;

  const projection = getApprovalProjection(item, queueType);
  const isProviders = queueType === 'providers';
  const isPending = projection.statusKey === 'pending';
  const toneClass = getApprovalToneClass(projection.statusKey);
  const StatusIcon = getApprovalIcon(projection.statusKey);
  const statusLabel = getApprovalLabel(projection.statusKey);
  const MetaIcon = isProviders ? getProviderTypeIcon(projection.meta) : Building2;
  const canReject = queueType === 'organizations' && typeof onReject === 'function';
  const facilityClaims = isProviders ? null : getFacilityClaims(item);
  const provenance = isProviders ? null : getFacilityProvenance(item);

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Application details</h2>
            {projection.displayId && (
              <p
                className="mt-1 truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground"
                title={projection.displayId}
              >
                {projection.displayId}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${toneClass}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
              {provenance && (
                <span className="inline-flex items-center rounded-pill bg-foreground/[0.055] px-3 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/[0.06]">
                  {provenance}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onOpen(item)}
            aria-label="Open full application details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {isProviders ? (
            <Avatar className="h-14 w-14 shrink-0 rounded-pill shadow-sm">
              <AvatarImage src={projection.avatarUrl || undefined} />
              <AvatarFallback className="rounded-pill bg-amber-500/10 text-lg font-semibold text-amber-700 dark:text-amber-200">
                {getAvatarFallback(item)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/10 text-lg font-semibold text-sky-700 dark:text-sky-200">
              {getFacilityInitials(projection.primary)}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.primary}>{projection.primary}</h3>
            <p className="mt-1 truncate text-sm capitalize text-muted-foreground" title={projection.meta}>{projection.meta}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        {isProviders ? (
          <>
            <DetailLine icon={User} label="Applicant" value={item.username || item.email} />
            <DetailLine icon={UserCheck} label="Legal name" value={item.full_name} />
            <DetailLine icon={MetaIcon} label="Provider type" value={projection.meta} />
            {item.organization_name && (
              <DetailLine icon={Building2} label="Organization" value={item.organization_name} />
            )}
            <DetailLine icon={Shield} label="Role" value={item.role} />
            <DetailLine icon={Mail} label="Contact" value={item.email} />
            {item.phone && <DetailLine icon={Phone} label="Phone" value={item.phone} />}
            <DetailLine icon={ListChecks} label="Onboarding" value={formatOnboardingStatus(item.onboarding_status)} />
            <DetailLine icon={Clock} label="Applied" value={formatAppliedDate(item.created_at)} />
          </>
        ) : (
          <>
            <DetailLine icon={Building2} label="Facility" value={item.name} />
            <DetailLine icon={MetaIcon} label="Type" value={projection.meta} />
            <DetailLine icon={MapPin} label="Address" value={item.address} />
            {item.phone && <DetailLine icon={Phone} label="Phone" value={item.phone} />}
            <DetailLine icon={Bed} label="Beds" value={facilityClaims.beds} />
            <DetailLine icon={BadgeCheck} label="Eligibility" value={facilityClaims.eligibility} />
            <DetailLine icon={Clock} label="Applied" value={formatAppliedDate(item.created_at)} />
            {facilityClaims.specialties.length > 0 && (
              <FacilityClaimChips label="Specialties" entries={facilityClaims.specialties} />
            )}
            {facilityClaims.serviceTypes.length > 0 && (
              <FacilityClaimChips label="Services" entries={facilityClaims.serviceTypes} />
            )}
          </>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onOpen(item)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {canApprove && isPending && (
          <div className={canReject ? 'grid grid-cols-2 gap-3' : ''}>
            {canReject && (
              <Button
                disabled={actionLoading}
                className="h-11 rounded-button bg-destructive text-sm font-bold text-white transition-all hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-60"
                onClick={() => onReject(item)}
              >
                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Reject
              </Button>
            )}
            <Button
              disabled={actionLoading}
              className="h-11 w-full rounded-button bg-emerald-500/90 text-sm font-bold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
              onClick={() => onApprove(item)}
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          </div>
        )}

        <RailActionButton icon={Info} label="Open record" onClick={() => onOpen(item)} />

        {!canApprove && (
          <div
            role="note"
            className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
          >
            <Shield className="h-4 w-4 shrink-0" />
            Approvals are read-only until admin authority is verified.
          </div>
        )}
      </div>
    </DetailRailShell>
  );
};
