import React from 'react';
import {
  BadgeCheck,
  Clock,
  Edit,
  Eye,
  Hospital,
  Mail,
  Phone,
  Stethoscope,
} from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
} from '../canon';
import { MobileKPIStrip } from '../MobileKPIStrip';
import { MobileDetailSheet } from '../MobileDetailSheet';
import { MobileSelectionBar } from '../MobileSelectionBar';
import { PullToRefresh } from '../PullToRefresh';
import { MobilePageShell } from '../MobilePageShell';
import {
  MobileListEnd,
  MobileListEmpty,
  MobileListLoadMore,
  MobileListLoadingMore,
} from '../MobileListStates';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  getDoctorStatusPill,
  getFacility,
  getMobileDoctorDetail,
  getStatus,
  orbClassFor,
} from './mobileDoctorsModel';

const MobileDoctorsAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const MobileDoctorsView = ({
  loading,
  filters,
  setFilters,
  onView,
  onEdit,
  onRefresh,
  onViewAnalytics,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore,
  errorMessage = null,
  onRetry,
  onSelect,
  onSelectAll,
  controller,
}) => {
  const {
    observerTarget,
    activeDoctor,
    setActiveDoctor,
    canManage,
    refetching,
    displayDoctors,
    isBuffering,
    showTopSectionLoading,
    doctorKPIs,
    activeKpi,
    scopeCount,
    hasFilter,
    canSelect,
    selectedIdSet,
    selectionMode,
    doctorGroups,
    armed,
    requestLoad,
  } = controller;

  const renderDoctorRow = (doctor) => {
    const status = getStatus(doctor);
    const specialty = doctor.specialization || 'General';
    const facility = getFacility(doctor) || 'No facility';

    return (
      <MobileListRow
        item={doctor}
        dataAttr="data-mobile-doctor-row"
        onOpen={setActiveDoctor}
        ariaLabel={`${doctor.name || 'Unknown staff'}, ${status.replace(/_/g, ' ')}`}
        orbClass={orbClassFor(status)}
        icon={Stethoscope}
        title={doctor.name || 'Unknown staff'}
        meta={`${specialty} \u00b7 ${facility}`}
        time={formatRelativeTime(doctor.updated_at || doctor.created_at)}
        pill={getDoctorStatusPill(doctor)}
        selectable={canSelect}
        selected={selectedIdSet.has(doctor.id)}
        selectionMode={selectionMode}
        onToggleSelect={(it) => onSelect?.(it.id, !selectedIdSet.has(it.id))}
        onLongPress={(it) => onSelect?.(it.id, true)}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileDoctorsAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Staff"
            noun="member"
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && displayDoctors.length === 0}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={doctorKPIs}
            activeKpi={activeKpi}
            onKpiClick={(id) => setFilters?.((previous) => ({ ...previous, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search staff..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters?.((previous) => ({ ...previous, search: value }))}
              entityLabel="staff"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={canManage ? onViewAnalytics : null}
              statsOpen={analyticsOpen}
              statsLabel="Open staff statistics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              {canSelect && (
                <MobileSelectionBar
                  count={selectedIdSet.size}
                  onSelectAll={() => onSelectAll?.(true)}
                  onClear={() => onSelectAll?.(false)}
                />
              )}

              {errorMessage && displayDoctors.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-doctors-degraded-state"
                >
                  <p className="text-sm font-semibold">Staff did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">Showing the last loaded staff rows.</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {doctorGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((doctor, index) => (
                        <React.Fragment key={doctor.id}>
                          {renderDoctorRow(doctor)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                {refetching && !showTopSectionLoading && hasMore && displayDoctors.length > 0 && (
                  <MobileListLoadingMore />
                )}
                {!loading && !refetching && hasMore && (
                  <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
                )}
                {!loading && !hasMore && displayDoctors.length > 0 && (
                  <MobileListEnd label="End of staff list" />
                )}
              </div>

              {displayDoctors.length === 0 && !loading && !showTopSectionLoading && (
                <MobileListEmpty
                  icon={Stethoscope}
                  label={errorMessage ? 'Staff did not load' : 'No staff found'}
                  reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the directory as empty.'
                    : filters?.search
                      ? `No staff match "${filters.search}".`
                      : hasFilter
                        ? 'Try clearing filters to see the full directory.'
                        : 'Staff will appear here once added.'}
                  onRecover={!errorMessage && (filters?.search || hasFilter)
                    ? () => setFilters?.((previous) => ({ ...previous, search: '', kpiFilter: 'all' }))
                    : undefined}
                  recoverLabel={!errorMessage && filters?.search
                    ? 'Clear Search'
                    : !errorMessage && hasFilter
                      ? 'Reset Filters'
                      : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        {activeDoctor && (
          <MobileDoctorDetailSheet
            doctor={activeDoctor}
            canManage={canManage}
            onClose={() => setActiveDoctor(null)}
            onView={onView}
            onEdit={onEdit}
          />
        )}
      </MobilePageShell>
    </PullToRefresh>
  );
};

const MobileDoctorDetailSheet = ({ doctor, canManage, onClose, onView, onEdit }) => {
  const { name, specialty, facility, phone, status } = getMobileDoctorDetail(doctor);

  return (
    <MobileDetailSheet
      isOpen={!!doctor}
      onClose={onClose}
      icon={Stethoscope}
      iconTone={status === 'busy'
        ? 'hsl(38 92% 50%)'
        : status === 'off_duty' || status === 'unavailable'
          ? 'hsl(var(--muted-foreground))'
          : 'hsl(199 89% 48%)'}
      eyebrow="Staff member"
      title={name}
      statusPill={getDoctorStatusPill(doctor)}
      islands={[
        { icon: Stethoscope, label: 'Specialty', value: specialty },
        { icon: Hospital, label: 'Facility', value: facility },
        { icon: Phone, label: 'Contact', value: phone },
        doctor.email && { icon: Mail, label: 'Email', value: doctor.email, href: `mailto:${doctor.email}` },
        doctor.license_number && { icon: BadgeCheck, label: 'License', value: doctor.license_number },
        { icon: Clock, label: 'Experience', value: doctor.experience != null ? `${doctor.experience} years` : 'Not set' },
      ]}
      primary={{ label: 'Details', icon: Eye, onClick: () => { onClose(); onView?.(doctor); } }}
      secondary={canManage
        ? { icon: Edit, onClick: () => { onClose(); onEdit?.(doctor); }, 'aria-label': `Edit ${name}` }
        : undefined}
    />
  );
};
