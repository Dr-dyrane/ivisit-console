import React from 'react';
import { Clock, Eye, Info, Percent, Shield } from 'lucide-react';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { DetailLine, Shimmer } from '../../console/primitives';
import { Button } from '../../ui/button';
import {
  formatInsuranceCoverage,
  formatInsuranceDate,
} from './insurancePageModel';
import { getInsurancePolicyPill } from './insurancePresentation';

export const InsuranceDetailRail = ({ policy, denied, loading, hasFilter, onView, embedded = false }) => {
  if (loading && !policy) {
    return (
      <DetailRailShell embedded={embedded}>
        <Shimmer className="h-32 rounded-modal" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Shimmer key={index} className="h-[52px] rounded-inner" />
          ))}
        </div>
      </DetailRailShell>
    );
  }

  if (denied) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Shield className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">Insurance access unavailable</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            This account does not have access to policy records.
          </p>
        </div>
      </DetailRailShell>
    );
  }

  if (!policy) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Shield className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No policy selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Policies matching the current filters will appear here.'
              : 'Select a policy to view its details.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const pill = getInsurancePolicyPill(policy.status);
  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Policy details</h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {policy.policy_number || 'No policy number'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(policy)}
            className="h-9 w-9 rounded-pill bg-muted/30"
            aria-label="Open full policy details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <div className={`mt-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${pill.className}`}>
          {pill.label}
        </div>
        <h3 className="mt-4 truncate text-lg font-semibold">
          {policy.policy_holder_name || 'Unnamed holder'}
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {policy.provider_name || 'Unknown provider'}
        </p>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine
          icon={Shield}
          label="Verification"
          value={policy.verified ? 'Verified' : 'Not verified'}
        />
        <DetailLine
          icon={Percent}
          label="Coverage rate"
          value={formatInsuranceCoverage(policy) || 'Not set'}
        />
        <DetailLine icon={Clock} label="Expires" value={formatInsuranceDate(policy.end_date)} />
        <DetailLine
          icon={Info}
          label="Plan type"
          value={policy.policy_type || policy.coverage_type || policy.plan_type || 'Not set'}
        />
      </div>

      <Button
        onClick={() => onView(policy)}
        className="mt-5 h-12 w-full rounded-button bg-foreground text-background hover:bg-foreground/90"
      >
        <Eye className="mr-2 h-4 w-4" />
        View details
      </Button>
      <div role="note" className="mt-3 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
        You can view policy details here. Policy changes are currently unavailable.
      </div>
    </DetailRailShell>
  );
};
