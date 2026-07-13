import React from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { SEOHead } from '../../common/SEOHead';
import { MobileDashboardSkeleton } from '../../mobile/MobileSkeleton';
import {
  EmergencyCardSkeleton,
  MetricCardSkeleton,
  QuickActionCardSkeleton,
} from './LegacyBentoCards';

export const LegacyBentoLoadingView = ({
  isAdmin,
  isMobile,
  isOrgAdmin,
  isPatient,
  isProvider,
  isSponsor,
  isViewer,
}) => {
  if (isMobile) return <MobileDashboardSkeleton />;

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Today" description="Loading console home." />
      <div className="pt-2" />
      <LayoutGroup>
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense rounded-card"
        >
          {!isPatient() && !isViewer() && <EmergencyCardSkeleton />}
          {(isAdmin() || isOrgAdmin()) && <MetricCardSkeleton />}
          {(isAdmin() || isOrgAdmin() || isProvider()) && <MetricCardSkeleton />}
          {(isAdmin() || isOrgAdmin() || isProvider()) && <MetricCardSkeleton />}
          {isAdmin() && <MetricCardSkeleton />}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && <MetricCardSkeleton />}

          {isPatient() && (
            <>
              <EmergencyCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
            </>
          )}

          {isViewer() && (
            <>
              <EmergencyCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
            </>
          )}

          {isSponsor() && (
            <>
              <EmergencyCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
            </>
          )}

          {(isAdmin() || isOrgAdmin()) && (
            <>
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
            </>
          )}

          {isProvider() && !isAdmin() && !isOrgAdmin() && (
            <>
              <QuickActionCardSkeleton />
              <QuickActionCardSkeleton />
            </>
          )}
        </motion.div>
      </LayoutGroup>
    </div>
  );
};
