import React from 'react';
import {
  Building2,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Info,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer } from '../../console/primitives';
import { Button } from '../../ui/button';
import {
  formatJoinedDate,
  getProviderTypeIcon,
  getUserInitials,
  getUsersProjection,
} from './usersPageModel';

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

export const UsersDetailRail = ({ user, loading, hasFilter, canManage, onView, onEdit, embedded = false }) => {
  if (loading) {
    return (
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
  }

  if (!user) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Users className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No user selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Users that match your filters will appear here.' : 'Select a user to see their details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const projection = getUsersProjection(user);
  const isProvider = projection.role === 'provider';
  const TypeIcon = getProviderTypeIcon(projection.providerType);

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">User details</h2>
            {projection.displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={projection.displayId}>{projection.displayId}</p>
                <CopyChip value={projection.displayId} label="Copy user ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${projection.roleMeta.tone}`}>
              <Shield className="h-3.5 w-3.5" />
              {projection.roleMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(user)}
            aria-label="Open full user details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-muted/40 text-lg font-semibold text-foreground">
            {getUserInitials(projection.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold" title={projection.name}>{projection.name}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground" title={projection.email}>{projection.email || 'No email on file'}</p>
          </div>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Mail} label="Email" value={projection.email} />
        {projection.phone && <DetailLine icon={Phone} label="Phone" value={projection.phone} />}
        <DetailLine icon={Shield} label="Role" value={projection.roleMeta.label} />
        {isProvider && projection.providerType && (
          <DetailLine icon={TypeIcon} label="Provider type" value={projection.providerType} />
        )}
        <DetailLine
          icon={projection.verified ? ShieldCheck : Shield}
          label="Verified"
          value={projection.verified ? 'Verified' : 'Unverified'}
        />
        <DetailLine icon={Building2} label="Organization" value={projection.organization} />
        <DetailLine icon={Clock} label="Joined" value={formatJoinedDate(projection.joined)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(user)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {canManage && (
          <div className="grid grid-cols-2 gap-3">
            <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(user)} />
            <RailActionButton icon={Info} label="Open record" onClick={() => onView(user)} />
          </div>
        )}

        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          <Shield className="h-4 w-4 shrink-0" />
          Invitations are available. Destructive profile commands remain unavailable.
        </div>
      </div>
    </DetailRailShell>
  );
};
