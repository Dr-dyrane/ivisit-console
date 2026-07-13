import React from 'react';
import { BadgeDollarSign, Building2, Clock, Globe } from 'lucide-react';
import {
  DetailRailShell,
  RailInsetHero,
} from '../../console/WorkspaceStage';
import { DetailLine, Shimmer } from '../../console/primitives';
import {
  formatPricingAmount,
  formatPricingDate,
  getPricingRuleName,
  getPricingScopeTone,
  isGlobalPricingRule,
} from './pricingPageModel';

export const PricingDetailRail = ({ price, loading, hasFilter }) => {
  if (loading && !price) {
    return (
      <DetailRailShell>
        <Shimmer className="h-32 rounded-modal" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Shimmer key={index} className="h-[52px] rounded-inner" />
          ))}
        </div>
      </DetailRailShell>
    );
  }

  if (!price) {
    return (
      <DetailRailShell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <BadgeDollarSign className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No rule selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter
              ? 'Rules matching the current filters will appear here.'
              : 'Select a pricing rule to view its details.'}
          </p>
        </div>
      </DetailRailShell>
    );
  }

  const globalRule = isGlobalPricingRule(price);

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Pricing details</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {getPricingRuleName(price)}
          </p>
        </div>
        <div className={`mt-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${getPricingScopeTone(price)}`}>
          {globalRule ? 'Platform fallback' : 'Facility price'}
        </div>
        <h3 className="mt-4 text-2xl font-semibold">{formatPricingAmount(price)}</h3>
      </RailInsetHero>
      <div className="space-y-2">
        <DetailLine
          icon={BadgeDollarSign}
          label="Family"
          value={price.family || price._pricingType || 'service'}
        />
        <DetailLine
          icon={globalRule ? Globe : Building2}
          label="Applies to"
          value={globalRule ? 'Platform fallback' : price.facilityName || 'Facility price'}
        />
        <DetailLine
          icon={Building2}
          label="Facility"
          value={price.facilityName || 'Not assigned'}
        />
        <DetailLine
          icon={Clock}
          label="Updated"
          value={formatPricingDate(price.updated_at || price.created_at)}
        />
      </div>
      <div
        role="note"
        className="mt-5 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground"
      >
        Select a facility before changing prices.
      </div>
    </DetailRailShell>
  );
};
