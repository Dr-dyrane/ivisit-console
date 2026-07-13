import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { MobileWallet } from '../mobile/MobileWallet';
import { AnalyticsModal } from '../modals/AnalyticsModal';
import { FilterSheet } from '../common/FilterSheet';
import { SEOHead } from '../common/SEOHead';
import { PaymentReceiptDialog } from './wallet/PaymentReceiptDialog';
import { PaymentsDesktopWorkspace } from './wallet/PaymentsDesktopWorkspace';
import { createWalletFilters } from './wallet/walletPageModel';
import { useWalletPageController } from './wallet/useWalletPageController';

// Compatibility contract: the desktop workspace owns useRowSelection(activeItems)
// and BulkActionBar while this route remains the public WalletManagementPage export.
export const WalletManagementPage = () => {
  const { profile, isAdmin, isOrgAdmin } = useAuth();
  const { isMobile } = useNavigation();
  const admin = isAdmin();
  const orgAdmin = isOrgAdmin();
  const controller = useWalletPageController({
    profile,
    isAdmin: admin,
    isOrgAdmin: orgAdmin,
    isMobile,
  });

  const headerActions = useMemo(() => (
    <span className="hidden md:inline-flex items-center rounded-pill bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {admin ? 'Platform admin' : 'Hospital admin'}
    </span>
  ), [admin]);

  usePageHeader('Payments', headerActions);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const sharedDialogs = (
    <>
      <PaymentReceiptDialog
        payment={controller.selectedPayment}
        onClose={() => controller.setSelectedPayment(null)}
        formatCurrency={controller.formatCurrency}
        formatPaymentMethod={controller.formatPaymentMethod}
        formatPaymentDescription={controller.formatPaymentDescription}
      />

      <AnalyticsModal
        open={controller.analyticsModalOpen}
        onClose={() => controller.setAnalyticsModalOpen(false)}
        type="payments"
        analytics={controller.loadedAnalytics}
      />

      <FilterSheet
        isOpen={controller.filterSheetOpen}
        onOpenChange={controller.setFilterSheetOpen}
        filterSchema={controller.filterSchema}
        onApply={controller.applyFilters}
        initialValues={controller.activeFilters}
        resetValues={createWalletFilters()[controller.activeTab]}
        resetLabel="Clear"
        title={controller.activeTab === 'ledger' ? 'Transaction filters' : 'Payment filters'}
        viewToggle={null}
        isMobile={isMobile}
      />
    </>
  );

  if (isMobile) {
    return (
      <>
        <SEOHead title="Payments" description="Review balance and payment activity." />
        <MobileWallet
          loading={controller.loading}
          isFetching={controller.isFetching && !controller.mobileLoadingMore}
          errorMessage={controller.loadError}
          hasLoaded={controller.hasLoaded}
          wallet={controller.wallet}
          readState={controller.readState}
          financeMetrics={controller.financeMetrics}
          financeMetricsStale={controller.financeMetricsStale}
          ledger={controller.ledger}
          payments={controller.payments}
          activeTab={controller.activeTab}
          setActiveTab={controller.setActiveTab}
          search={controller.search}
          onSearchCommit={controller.setSearch}
          filters={controller.activeFilters}
          onOpenFilters={() => controller.setFilterSheetOpen(true)}
          filterSheetOpen={controller.filterSheetOpen}
          onClearFilters={controller.clearFilters}
          onOpenStats={() => controller.setAnalyticsModalOpen(true)}
          statsOpen={controller.analyticsModalOpen}
          onRefresh={controller.fetchData}
          hasMore={Boolean(controller.hasMore[controller.activeTab])}
          isLoadingMore={controller.mobileLoadingMore}
          onLoadMore={controller.handleMobileLoadMore}
          onOpenPayment={controller.setSelectedPayment}
          formatCurrency={controller.formatCurrency}
        />
        {sharedDialogs}
      </>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-3rem)]">
      <SEOHead title="Payments" description="Review balance, cards, and payment activity." />
      <PaymentsDesktopWorkspace
        loading={controller.loading}
        wallet={controller.wallet}
        ledger={controller.ledger}
        payments={controller.payments}
        paymentMethods={controller.paymentMethods}
        readState={controller.readState}
        financeMetrics={controller.financeMetrics}
        financeMetricsStale={controller.financeMetricsStale}
        loadError={controller.loadError}
        hasLoaded={controller.hasLoaded}
        isFetching={controller.isFetching}
        roleKind={admin ? 'admin' : 'org_admin'}
        activeTab={controller.activeTab}
        setActiveTab={controller.setActiveTab}
        fetchData={controller.fetchData}
        onPaymentOpen={controller.setSelectedPayment}
        formatCurrency={controller.formatCurrency}
        formatPaymentMethod={controller.formatPaymentMethod}
        formatPaymentDescription={controller.formatPaymentDescription}
        search={controller.search}
        onSearchCommit={controller.setSearch}
        filters={controller.activeFilters}
        filterSheetOpen={controller.filterSheetOpen}
        onOpenFilters={() => controller.setFilterSheetOpen(true)}
      />
      {sharedDialogs}
    </div>
  );
};

export { PaymentReceiptDialog } from './wallet/PaymentReceiptDialog';
export { PaymentsDesktopWorkspace } from './wallet/PaymentsDesktopWorkspace';
