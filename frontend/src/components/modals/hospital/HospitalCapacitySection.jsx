import { Activity, Ambulance, Bed, Clock, RefreshCw, User } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { formatHospitalDateTime, HOSPITAL_FIELD_CLASS } from './hospitalModalModel';
import { HospitalSection, ReadOnlyStat } from './HospitalModalPrimitives';

export const HospitalCapacitySection = ({
  activeReservations,
  availableBeds,
  bedUtilizationPercent,
  formData,
  handleChange,
  isView,
  loadBedData,
  loadingReservations,
  reservationError,
  reservedBedsDisplay,
}) => (
  <HospitalSection icon={<Activity />} title="Live Capacity">
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
      <div className="space-y-1">
        <Label htmlFor="total_beds" className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Total Beds</Label>
        <div className="relative">
          <Bed className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
          {isView ? (
            <ReadOnlyStat value={formData.total_beds || 0} />
          ) : (
            <Input
              type="number"
              min="0"
              step="1"
              id="total_beds"
              name="total_beds"
              value={formData.total_beds || 0}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="available_beds" className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Available</Label>
        <div className="relative">
          <Bed className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
          {isView ? (
            <ReadOnlyStat value={formData.available_beds} />
          ) : (
            <Input
              type="number"
              min="0"
              step="1"
              id="available_beds"
              name="available_beds"
              value={formData.available_beds}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="icu_beds_available" className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">ICU Beds</Label>
        <div className="relative">
          <Bed className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
          {isView ? (
            <ReadOnlyStat value={formData.icu_beds_available || 0} />
          ) : (
            <Input
              type="number"
              min="0"
              step="1"
              id="icu_beds_available"
              name="icu_beds_available"
              value={formData.icu_beds_available || 0}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Reserved</Label>
        <div className="relative">
          <Bed className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
          {isView ? (
            <ReadOnlyStat value={reservedBedsDisplay} />
          ) : (
            <Input
              type="number"
              value={reservedBedsDisplay}
              disabled
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ambulances_count" className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">Ambulances</Label>
        <div className="relative">
          <Ambulance className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {isView ? (
            <ReadOnlyStat value={formData.ambulances_count} />
          ) : (
            <Input
              type="number"
              min="0"
              step="1"
              id="ambulances_count"
              name="ambulances_count"
              value={formData.ambulances_count}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="emergency_wait_time_minutes" className="px-1 text-[10px] font-semibold uppercase text-muted-foreground">ER Wait (min)</Label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-500" />
          {isView ? (
            <ReadOnlyStat value={formData.emergency_wait_time_minutes || 0} />
          ) : (
            <Input
              type="number"
              id="emergency_wait_time_minutes"
              name="emergency_wait_time_minutes"
              value={formData.emergency_wait_time_minutes || 0}
              disabled
              title="Operational insight -- updates from live activity, not editable here"
              className={`${HOSPITAL_FIELD_CLASS} h-10 pl-9 font-semibold`}
            />
          )}
        </div>
      </div>
    </div>

    <div className="mt-3 text-[11px] text-muted-foreground">
      Last availability update: {formatHospitalDateTime(formData.last_availability_update)}
    </div>

    {(formData.total_beds || 0) > 0 && (
      <div className="mt-4 rounded-inner bg-white/5 p-3" aria-live="polite">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Bed Utilization</span>
          <span className="text-xs font-bold">{bedUtilizationPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-pill bg-white/10">
          <div
            className="h-2 rounded-pill bg-gradient-to-r from-green-500 via-orange-500 to-red-500"
            style={{ width: `${bedUtilizationPercent}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{reservedBedsDisplay} occupied</span>
          <span>{availableBeds} available</span>
        </div>
      </div>
    )}

    {isView && (
      <div className="mt-4" aria-live="polite">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Active Reservations</span>
          </div>
          <Badge className="bg-sky-500/15 text-xs text-sky-700 dark:text-sky-200">
            {reservationError && activeReservations.length === 0
              ? 'Unavailable'
              : `${activeReservations.length} active`}
          </Badge>
        </div>

        {reservationError && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-inner bg-destructive/10 p-3 text-destructive" role="alert">
            <span className="text-xs font-medium">
              {activeReservations.length > 0
                ? 'Reservations did not refresh. Showing the last loaded records.'
                : reservationError}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadBedData}
              disabled={loadingReservations}
              className="h-8 shrink-0 rounded-button px-3 text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingReservations ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        )}

        {loadingReservations ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-inner bg-white/5" />
            ))}
          </div>
        ) : activeReservations.length === 0 && !reservationError ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No active bed reservations
          </div>
        ) : activeReservations.length > 0 ? (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {activeReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-inner bg-white/5 p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {reservation.patient_name || 'Patient'}
                      </span>
                      <Badge className={`text-xs ${
                        reservation.status === 'in_progress' ? 'bg-orange-500/20 text-orange-500' :
                        reservation.status === 'accepted' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-green-500/20 text-green-500'
                      }`}>
                        {reservation.status_display}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {/* ADOPT-37: emergency_requests carries bed_type; the old
                          bed_category key never exists on these raw rows. */}
                      {reservation.bed_type && <div>Bed: {reservation.bed_type}</div>}
                      {reservation.bed_number && <div>Room: {reservation.bed_number}</div>}
                      <div>Reserved: {new Date(reservation.reserved_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0">
                    <span className="rounded-pill bg-white/5 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                      Manage in Requests
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )}
  </HospitalSection>
);
