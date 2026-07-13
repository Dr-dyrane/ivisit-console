import React from 'react';
import { BadgeDollarSign, Building2, Globe } from 'lucide-react';
import { statusPill } from '../../../constants/vitalTracks';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  GroupPanel,
  Hairline,
  MobileListRow,
  SkeletonGroupList,
} from '../canon';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadMore,
  MobileListLoadingMore,
} from '../MobileListStates';
import {
  formatMobilePricingMoney,
  getMobilePricingMeta,
  getMobilePricingTitle,
  getMobilePricingUpdatedAt,
  isMobileGlobalPricingRule,
} from './mobilePricingModel';

export const MobilePricingList = ({
  groups,
  showLoading,
  selectionEnabled,
  selectedIdSet,
  selectionMode,
  onSelect,
  onOpen,
  observerTarget,
  isLoadingMore,
  displayItems,
  loading,
  hasMore,
  armed,
  requestLoad,
  errorMessage,
  searchTerm,
  hasFilter,
  onRefresh,
  onResetFilters,
}) => (
  <>
    <div className="mt-3 space-y-[18px]">
      {showLoading ? (
        <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
      ) : groups.map((group) => (
        <GroupPanel key={group.key} label={group.label} count={group.items.length}>
          {group.items.map((item, index) => {
            const globalRule = isMobileGlobalPricingRule(item);
            return (
              <React.Fragment key={item.id}>
                <MobileListRow
                  item={item}
                  dataAttr="data-mobile-pricing-row"
                  onOpen={onOpen}
                  ariaLabel={`${item.name || item.service_name || item.room_name || 'Pricing rule'}, ${formatMobilePricingMoney(item)}`}
                  orbClass={globalRule
                    ? 'bg-sky-500/12 text-sky-700 dark:text-sky-200'
                    : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'}
                  icon={globalRule ? Globe : Building2}
                  title={getMobilePricingTitle(item)}
                  meta={getMobilePricingMeta(item)}
                  time={formatRelativeTime(getMobilePricingUpdatedAt(item))}
                  pill={statusPill(item.status || (item.is_active ? 'active' : 'inactive'))}
                  selectable={selectionEnabled}
                  selected={selectedIdSet.has(item.id)}
                  selectionMode={selectionMode}
                  onToggleSelect={(selectedItem) => onSelect?.(
                    selectedItem.id,
                    !selectedIdSet.has(selectedItem.id),
                  )}
                  onLongPress={(selectedItem) => onSelect?.(selectedItem.id, true)}
                />
                {index < group.items.length - 1 && <Hairline />}
              </React.Fragment>
            );
          })}
        </GroupPanel>
      ))}
    </div>

    <div
      ref={observerTarget}
      className="min-h-[64px] flex flex-col items-center justify-center gap-2"
    >
      {isLoadingMore && displayItems.length > 0 && <MobileListLoadingMore />}
      {!loading && !isLoadingMore && hasMore && (
        <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
      )}
      {!loading && !hasMore && displayItems.length > 0 && (
        <MobileListEnd label="End of pricing list" />
      )}
    </div>

    {!showLoading && displayItems.length === 0 && (
      <MobileListEmpty
        icon={BadgeDollarSign}
        label={errorMessage ? 'Pricing did not load' : 'No pricing rules found'}
        reason={errorMessage ? 'error' : searchTerm ? 'search' : hasFilter ? 'filtered' : 'empty'}
        hint={errorMessage || (searchTerm
          ? `No pricing matches "${searchTerm}".`
          : hasFilter
            ? 'Reset filters to view all pricing rules.'
            : 'Pricing rules for this scope will appear here.')}
        onRecover={errorMessage ? onRefresh : hasFilter ? onResetFilters : undefined}
        recoverLabel={errorMessage
          ? 'Try Again'
          : searchTerm
            ? 'Clear Search'
            : hasFilter
              ? 'Reset Filters'
              : undefined}
        labelTone="plain"
      />
    )}
  </>
);
