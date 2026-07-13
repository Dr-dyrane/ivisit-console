import React from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { SEOHead } from '../../common/SEOHead';
import {
  AnalyticsQuickCard,
  EmergencyCounterCard,
  IncompleteOnboardingCard,
  MapViewCard,
  RequestsCard,
  ResponseTimeCard,
  VerificationQueueCard,
} from './LegacyBentoCards';
import { LegacyBentoOperationsCards } from './LegacyBentoOperationsCards';
import { LegacyBentoRoleCards } from './LegacyBentoRoleCards';

export const LegacyBentoGrid = ({
  analyticsData,
  appStats,
  chartData,
  doctorsStats,
  emergencyStats,
  hasMinRole,
  isAdmin,
  isOrgAdmin,
  isPatient,
  isProvider,
  isSkippedOnboarding,
  isSponsor,
  isViewer,
  subscriptionStats,
  verificationStats,
  visitsStats,
  walletStats,
}) => (
  <div className="min-h-screen py-6 md:py-8">
    <SEOHead title="Today" description="Console home." />
    <div className="pt-2" />
    <LayoutGroup>
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense rounded-card"
      >
        {isSkippedOnboarding() && <IncompleteOnboardingCard />}

        {!isPatient() && !isViewer() && (
          <EmergencyCounterCard
            liveEmergencies={appStats.liveEmergencies}
            chartData={chartData}
            isPatient={isPatient()}
          />
        )}

        {(isAdmin() || isOrgAdmin()) && <ResponseTimeCard responseTime={appStats.responseTime} />}

        {!isPatient() && !isViewer() && !isSponsor() && (
          <RequestsCard requests={appStats.todayRequests} isPatient={isPatient()} />
        )}

        {(isAdmin() || isOrgAdmin() || isProvider()) && <MapViewCard />}
        {(isAdmin() || isOrgAdmin()) && <VerificationQueueCard verificationStats={verificationStats} />}

        {(isAdmin() || isOrgAdmin() || isSponsor()) && (
          <AnalyticsQuickCard totalVisits={appStats.totalVisits} completionRate={appStats.completionRate} />
        )}

        <LegacyBentoRoleCards
          appStats={appStats}
          chartData={chartData}
          isPatient={isPatient}
          isSponsor={isSponsor}
          isViewer={isViewer}
          visitsStats={visitsStats}
        />

        <LegacyBentoOperationsCards
          analyticsData={analyticsData}
          appStats={appStats}
          doctorsStats={doctorsStats}
          emergencyStats={emergencyStats}
          hasMinRole={hasMinRole}
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
          isProvider={isProvider}
          isSponsor={isSponsor}
          subscriptionStats={subscriptionStats}
          visitsStats={visitsStats}
          walletStats={walletStats}
        />
      </motion.div>
    </LayoutGroup>
  </div>
);
