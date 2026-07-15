import React, { useMemo } from 'react';
import { AlertTriangle, Clock, Crown, Mail, UserPlus, Users } from 'lucide-react';
import {
  getSubscriberStatusTone,
  hasActiveSubscriberFilters,
} from '../pages/subscriptions/subscriptionPageModel';
import { TabletCollectionPage } from './TabletCollectionPage';
import { formatTabletDateTime, titleCase } from './tabletFormatters';

const subscriptionKpiOptions = [
  {
    id: 'all',
    label: 'Subscribers',
    icon: Users,
    countKey: 'total',
    activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200',
  },
  {
    id: 'pending',
    label: 'Pending',
    icon: Clock,
    countKey: 'pending',
    activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200',
  },
  {
    id: 'new',
    label: 'New',
    icon: UserPlus,
    countKey: 'newUsers',
    activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200',
  },
];

const TabletSubscriptionNotices = ({ statsUnavailable, actionNotice }) => {
  if (!statsUnavailable && !actionNotice) return null;
  return (
    <div className="space-y-2">
      {statsUnavailable && (
        <p
          className="flex items-start gap-2 rounded-inner bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Statistics are unavailable. Counts use the records currently shown.</span>
        </p>
      )}
      {actionNotice && (
        <p className="rounded-inner bg-muted/25 px-3 py-2 text-xs text-muted-foreground" role="status">
          {actionNotice}
        </p>
      )}
    </div>
  );
};

export const TabletSubscriptions = ({
  subscribers = [],
  stats = {},
  subscriberCount,
  statsUnavailable = false,
  denied = false,
  filters = {},
  setFilters,
  loading = false,
  isFetching = false,
  errorMessage = null,
  onRetry,
  onRefresh,
  onOpenFilters,
  onViewAnalytics,
  actionNotice = '',
  focusedSubscriber,
  onFocusSubscriber,
  onView,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  allSelected,
  someSelected,
  hasMore = false,
  onLoadMore,
  detail,
}) => {
  const activeKpi = filters.kpiFilter || 'all';
  const kpis = useMemo(() => subscriptionKpiOptions.map((option) => ({
    ...option,
    value: Number(stats?.[option.countKey] || 0),
  })), [stats]);

  const records = useMemo(() => subscribers.map((subscriber) => {
    const status = String(subscriber.status || 'pending').toLowerCase();
    const paid = subscriber.type === 'paid';
    return {
      id: subscriber.id,
      source: subscriber,
      title: subscriber.email || 'Unknown subscriber',
      subtitle: `${titleCase(subscriber.type, 'free')} plan`,
      meta: subscriber.welcome_email_sent ? 'Welcome sent' : 'Welcome pending',
      trailing: formatTabletDateTime(subscriber.subscription_date || subscriber.created_at),
      statusLabel: titleCase(status),
      statusClass: getSubscriberStatusTone(status),
      icon: paid ? Crown : Mail,
      iconClass: getSubscriberStatusTone(status),
    };
  }), [subscribers]);

  const footer = hasMore ? (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading || isFetching}
      className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {isFetching ? 'Loading subscribers...' : 'Load more'}
    </button>
  ) : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={activeKpi}
      onKpiChange={(id) => setFilters?.((current) => ({ ...current, kpiFilter: id }))}
      loading={loading}
      isFetching={isFetching}
      error={denied ? null : errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.((current) => ({ ...current, search: value }))}
      searchPlaceholder="Search subscriber email..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasActiveSubscriberFilters(filters)}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedSubscriber?.id}
      onFocus={onFocusSubscriber}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectAll={onSelectAll}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={denied ? 'Subscriber access unavailable' : 'No subscribers found'}
      emptyBody={denied
        ? 'This account does not have access to subscriber records.'
        : 'Subscribers in this scope will appear here.'}
      countLabel={`${subscriberCount ?? subscribers.length} subscribers`}
      footer={footer}
      toolbarSlot={(
        <TabletSubscriptionNotices
          statsUnavailable={statsUnavailable}
          actionNotice={actionNotice}
        />
      )}
    />
  );
};

export default TabletSubscriptions;
