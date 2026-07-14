import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { scheduledCareRelease } from '../../../config/scheduledCareRelease';
import { useConsoleDoctorSchedulesQuery, useScheduleDetailQuery,
  useScheduleFacilitiesQuery, useScheduleRosterQuery } from '../../../hooks/staff-scheduling/useConsoleDoctorSchedulesQuery';
import { useConsoleDoctorScheduleMutations } from '../../../hooks/staff-scheduling/useConsoleDoctorScheduleMutations';
import { checkScheduleConflicts } from '../../../services/staffSchedulingService';
import { getFacilityScheduleWindow, isValidIanaTimezone,
  isScheduleTimezoneConfirmed, validateScheduleDraft } from '../../../services/staff-scheduling/projection';
import { createEditScheduleDraft, createScheduleDraft, getScheduleErrorMessage,
  groupSchedulesByDate } from './schedulePresentation';
import { useStaffScheduleModalSync } from './useStaffScheduleModalSync';

const EMPTY_WINDOW = Object.freeze({ from: '', to: '' });

export const useStaffSchedulingModalController = ({
  isOpen,
  hospitalId,
  initialDoctor,
  scheduleId,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitalId || initialDoctor?.hospital_id || '');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [notice, setNotice] = useState('Choose a facility to review its shifts.');
  const [formErrors, setFormErrors] = useState({});
  const [timezoneInput, setTimezoneInput] = useState('');
  const [timezoneInputError, setTimezoneInputError] = useState(null);
  const [draft, setDraft] = useState(() => createScheduleDraft({
    hospitalId: hospitalId || initialDoctor?.hospital_id, doctorId: initialDoctor?.id,
  }));

  const readsEnabled = isOpen && scheduledCareRelease.scheduleReads;
  const openedAt = useMemo(() => (isOpen ? new Date() : null), [isOpen]);
  const facilitiesQuery = useScheduleFacilitiesQuery(readsEnabled);
  const facilities = useMemo(() => facilitiesQuery.data || [], [facilitiesQuery.data]);
  const selectedFacility = facilities.find((facility) => facility.id === selectedHospitalId) || null;
  const scheduleWindow = useMemo(() => {
    if (!openedAt || !isValidIanaTimezone(selectedFacility?.timezone)) return EMPTY_WINDOW;
    return getFacilityScheduleWindow(selectedFacility.timezone, { instant: openedAt });
  }, [openedAt, selectedFacility?.timezone]);
  const scheduleWindowReady = Boolean(scheduleWindow.from && scheduleWindow.to);
  const schedulesQuery = useConsoleDoctorSchedulesQuery({
    hospitalId: selectedHospitalId, dateFrom: scheduleWindow.from, dateTo: scheduleWindow.to,
    enabled: readsEnabled && Boolean(selectedHospitalId) && scheduleWindowReady,
  });
  const rosterQuery = useScheduleRosterQuery(selectedHospitalId, readsEnabled);
  const detailQuery = useScheduleDetailQuery(scheduleId, readsEnabled && Boolean(scheduleId));
  const mutations = useConsoleDoctorScheduleMutations();

  const schedules = useMemo(() => schedulesQuery.data?.schedules || [], [schedulesQuery.data]);
  const staffList = useMemo(() => rosterQuery.data || [], [rosterQuery.data]);
  const refetchSchedules = schedulesQuery.refetch;
  const timezoneConfirmed = isScheduleTimezoneConfirmed(selectedFacility);
  const timezoneInputValid = isValidIanaTimezone(timezoneInput);
  const writesEnabled = scheduledCareRelease.scheduleWrites;
  const canMutate = writesEnabled && timezoneConfirmed;
  const mutationPending = mutations.create.isPending || mutations.update.isPending
    || mutations.remove.isPending || mutations.confirmTimezone.isPending;

  useEffect(() => {
    if (!isOpen) return;
    const preferred = hospitalId || initialDoctor?.hospital_id;
    if (preferred) setSelectedHospitalId(preferred);
  }, [hospitalId, initialDoctor?.hospital_id, isOpen]);

  useEffect(() => {
    if (!isOpen || selectedHospitalId || facilities.length === 0) return;
    setSelectedHospitalId(facilities[0].id);
  }, [facilities, isOpen, selectedHospitalId]);

  useEffect(() => {
    setTimezoneInput('');
    setTimezoneInputError(null);
  }, [selectedHospitalId]);

  useEffect(() => {
    if (!isOpen || !readsEnabled || !scheduleId) return;

    if (detailQuery.data) {
      const schedule = detailQuery.data;
      const facility = facilities.find((item) => item.id === schedule.hospital_id);
      setSelectedHospitalId(schedule.hospital_id);
      setSelectedSchedule(schedule);
      setDraft(createEditScheduleDraft(schedule, { timezone: schedule.scheduled_timezone || facility?.timezone }));
      setActiveTab(writesEnabled && isScheduleTimezoneConfirmed(facility) ? 'edit' : 'overview');
      setNotice('Opened linked shift.');
      return;
    }

    setSelectedSchedule(null);
    setActiveTab('overview');
    if (detailQuery.isLoading || detailQuery.isFetching) {
      setNotice('Loading linked shift...');
    } else if (detailQuery.error) {
      setNotice('The linked shift could not be loaded. Review the error and try again.');
    } else if (detailQuery.isSuccess) {
      setNotice('The linked shift was not found or is outside your schedule scope.');
    }
  }, [detailQuery.data, detailQuery.error, detailQuery.isFetching, detailQuery.isLoading,
    detailQuery.isSuccess, facilities, isOpen, readsEnabled, scheduleId, writesEnabled]);

  useStaffScheduleModalSync({
    isOpen, readsEnabled, refetchSchedules, scheduleWindowReady, schedules,
    schedulesQuery, selectedFacility, selectedHospitalId, setNotice, staffList,
  });

  const changeFacility = useCallback((nextHospitalId) => {
    const nextFacility = facilities.find((facility) => facility.id === nextHospitalId);
    setSelectedHospitalId(nextHospitalId);
    setSelectedSchedule(null);
    setDeleteCandidate(null);
    setActiveTab('overview');
    setDraft(createScheduleDraft({ hospitalId: nextHospitalId, timezone: nextFacility?.timezone }));
    setNotice('Loading shifts for this facility.');
  }, [facilities]);

  const changeTimezoneInput = useCallback((value) => {
    setTimezoneInput(value);
    setTimezoneInputError(value && !isValidIanaTimezone(value)
      ? 'Enter a valid IANA timezone, such as America/Los_Angeles.'
      : null);
  }, []);

  const openAdd = useCallback((doctor = initialDoctor) => {
    if (!canMutate) {
      setNotice(!writesEnabled
        ? 'Schedule changes are not available right now.'
        : 'Confirm the facility timezone before adding a shift.');
      return;
    }
    setSelectedSchedule(null);
    setFormErrors({});
    setDraft(createScheduleDraft({
      hospitalId: selectedHospitalId, timezone: selectedFacility?.timezone,
      doctorId: doctor?.hospital_id === selectedHospitalId ? doctor.id : '',
    }));
    setActiveTab('add');
  }, [canMutate, initialDoctor, selectedFacility?.timezone, selectedHospitalId, writesEnabled]);

  const openEdit = useCallback((schedule) => {
    if (!canMutate) return;
    setSelectedSchedule(schedule);
    setFormErrors({});
    setDraft(createEditScheduleDraft(schedule, { timezone: schedule.scheduled_timezone || selectedFacility?.timezone }));
    setActiveTab('edit');
  }, [canMutate, selectedFacility?.timezone]);

  const cancelForm = useCallback(() => {
    setActiveTab('overview'); setSelectedSchedule(null);
    setFormErrors({});
  }, []);

  const submit = useCallback(async () => {
    if (!canMutate || mutationPending) return;
    const errors = validateScheduleDraft(draft);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setNotice(Object.values(errors)[0]);
      return;
    }

    try {
      setNotice(selectedSchedule ? 'Updating shift...' : 'Adding shift...');
      const conflicts = await checkScheduleConflicts(
        draft.doctor_id, draft.date, draft.start_time, draft.end_time,
        selectedSchedule?.id, selectedHospitalId,
      );
      if (conflicts.has_conflicts) {
        setFormErrors({ start_time: 'This time overlaps another shift.' });
        setNotice('This time overlaps another shift.');
        return;
      }

      if (selectedSchedule) {
        await mutations.update.mutateAsync({ scheduleId: selectedSchedule.id, schedule: draft });
      } else {
        await mutations.create.mutateAsync(draft);
      }
      if (scheduleWindowReady) await schedulesQuery.refetch();
      setActiveTab('overview');
      setSelectedSchedule(null);
      setNotice(selectedSchedule ? 'Shift updated.' : 'Shift added.');
      toast.success(selectedSchedule ? 'Shift updated' : 'Shift added');
    } catch (error) {
      const message = getScheduleErrorMessage(error, 'The schedule could not be updated. Try again.');
      setNotice(message);
      toast.error('Schedule change failed', { description: message });
    }
  }, [canMutate, draft, mutationPending, mutations.create, mutations.update, scheduleWindowReady, schedulesQuery, selectedHospitalId, selectedSchedule]);

  const confirmTimezone = useCallback(async () => {
    const requestedTimezone = timezoneInput.trim();
    if (!writesEnabled || !selectedFacility || mutationPending) return;
    if (!isValidIanaTimezone(requestedTimezone)) {
      const message = 'Enter a valid IANA timezone, such as America/Los_Angeles.';
      setTimezoneInputError(message);
      setNotice(message);
      return;
    }
    try {
      setTimezoneInputError(null);
      setNotice('Confirming facility timezone...');
      await mutations.confirmTimezone.mutateAsync({ hospitalId: selectedFacility.id, timezone: requestedTimezone });
      const refreshed = await facilitiesQuery.refetch();
      const confirmed = (refreshed.data || []).find((facility) => facility.id === selectedFacility.id);
      if (!isScheduleTimezoneConfirmed(confirmed) || confirmed.timezone !== requestedTimezone) {
        throw new Error('The confirmed timezone could not be verified. Refresh and try again.');
      }
      if (scheduleWindowReady) await schedulesQuery.refetch();
      setNotice(`Timezone confirmed as ${confirmed.timezone}.`);
      setTimezoneInput('');
      toast.success('Facility timezone confirmed');
    } catch (error) {
      const message = getScheduleErrorMessage(error, 'The facility timezone could not be confirmed. Try again.');
      setNotice(message);
      setTimezoneInputError(message);
      toast.error('Timezone confirmation failed', { description: message });
    }
  }, [facilitiesQuery, mutationPending, mutations.confirmTimezone, scheduleWindowReady, schedulesQuery, selectedFacility, timezoneInput, writesEnabled]);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate || !canMutate || mutationPending) return;
    try {
      setNotice('Removing shift...');
      await mutations.remove.mutateAsync(deleteCandidate.id);
      await schedulesQuery.refetch();
      setDeleteCandidate(null);
      setNotice('Shift removed.');
      toast.success('Shift removed');
    } catch (error) {
      const message = getScheduleErrorMessage(error, 'The shift could not be removed. Try again.');
      setNotice(message);
      toast.error('Shift could not be removed', { description: message });
    }
  }, [canMutate, deleteCandidate, mutationPending, mutations.remove, schedulesQuery]);

  const queryError = facilitiesQuery.error || schedulesQuery.error || rosterQuery.error || detailQuery.error;
  const detailError = getScheduleErrorMessage(detailQuery.error, 'The linked shift could not be loaded.');
  const detailLoading = Boolean(scheduleId && !detailQuery.data)
    && Boolean(detailQuery.isLoading || detailQuery.isFetching);
  const detailNotFound = Boolean(scheduleId && detailQuery.isSuccess && !detailQuery.data);

  return {
    activeTab,
    canMutate,
    changeFacility,
    changeTimezoneInput,
    confirmDelete,
    confirmTimezone,
    deleteCandidate,
    detailError,
    detailLoading,
    detailNotFound,
    draft,
    facilities,
    formErrors,
    groupedSchedules: groupSchedulesByDate(schedules),
    initialLoading: facilitiesQuery.isLoading || detailLoading
      || (Boolean(selectedHospitalId) && scheduleWindowReady && schedulesQuery.isLoading),
    loadError: getScheduleErrorMessage(queryError, 'Schedule data could not be loaded.'),
    mutationPending,
    notice,
    openAdd,
    openEdit,
    readsEnabled: scheduledCareRelease.scheduleReads,
    refetch: async () => Promise.all([facilitiesQuery.refetch(), rosterQuery.refetch(), ...(scheduleWindowReady ? [schedulesQuery.refetch()] : [])]),
    refreshing: facilitiesQuery.isFetching || schedulesQuery.isFetching || rosterQuery.isFetching,
    cancelForm,
    selectedFacility,
    selectedHospitalId,
    selectedSchedule,
    setDeleteCandidate,
    setDraft,
    setActiveTab,
    staffList,
    submit,
    timezoneConfirmed,
    timezoneInput,
    timezoneInputError,
    timezoneInputValid,
    window: scheduleWindow,
    writesEnabled,
  };
};
