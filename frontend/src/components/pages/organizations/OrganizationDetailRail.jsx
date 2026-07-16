import React from 'react';
import {
  Activity,
  Building2,
  ChevronRight,
  Clock,
  Eye,
  Globe,
  Info,
  MapPin,
  Wallet,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer } from '../../console/primitives';
import {
  formatOrganizationDate,
  formatOrganizationType,
  formatOrganizationWallet,
  getOrganizationStatusMeta,
} from './organizationPageModel';

export const OrganizationDetailRail = ({
  organization,
  loading,
  hasFilter,
  onView,
  activeActionFeedback,
  embedded = false,
}) => {
  if (loading && !organization) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Shimmer key={index} className="h-[52px] w-full rounded-inner" />
          ))}
        </div>
      </DetailRailShell>
    );
  }

  if (!organization) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Building2 className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No organization selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Organizations that match your filters will appear here.'
              : 'Select an organization to see its details here.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const statusMeta = getOrganizationStatusMeta(!!organization.is_active);
  const typeValue = formatOrganizationType(organization.organization_type);
  const walletValue = formatOrganizationWallet(organization.wallet_balance);
  const locationValue = organization.city || organization.address || 'Not set';
  const displayId = organization.display_id
    || (organization.id ? `Org ${String(organization.id).slice(0, 8)}` : null);
  const viewOpening = activeActionFeedback === `view-${organization.id}`;

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Organization details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p
                  className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground"
                  title={displayId}
                >
                  {displayId}
                </p>
                <CopyChip value={displayId} label="Copy organization ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Activity className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(organization)}
            aria-label="Open full organization details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3
            className="truncate text-lg font-semibold"
            title={organization.name || 'Unnamed organization'}
          >
            {organization.name || 'Unnamed organization'}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {organization.contact_email || 'No contact email'}
          </p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={Building2} label="Name" value={organization.name} />
        <DetailLine icon={Globe} label="Type" value={typeValue} />
        <DetailLine icon={Activity} label="Status" value={statusMeta.label} />
        <DetailLine icon={Wallet} label="Wallet" value={walletValue} />
        <DetailLine icon={MapPin} label="Location" value={locationValue} />
        <DetailLine icon={Clock} label="Created" value={formatOrganizationDate(organization.created_at)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(organization)}
          data-state={viewOpening ? 'opening' : 'idle'}
          aria-busy={viewOpening}
        >
          <Eye className="mr-2 h-5 w-5" />
          {viewOpening ? 'Opening' : 'View details'}
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          You can review organization details here. Changes are not available from this page.
        </div>
      </div>
    </DetailRailShell>
  );
};
