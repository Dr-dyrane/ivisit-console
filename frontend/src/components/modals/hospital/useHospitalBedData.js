import { useCallback, useEffect, useRef, useState } from 'react';
import { bedManagementService } from '../../../services/bedManagementService';

export const useHospitalBedData = ({ hospitalId, isOpen, isView }) => {
  const [activeReservations, setActiveReservations] = useState([]);
  const [bedUtilization, setBedUtilization] = useState(null);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  const bedLoadSequenceRef = useRef(0);

  const loadBedData = useCallback(async () => {
    if (!hospitalId) return;
    const requestId = ++bedLoadSequenceRef.current;

    try {
      setLoadingReservations(true);
      setReservationError(null);
      const [reservations, utilization] = await Promise.all([
        bedManagementService.getActiveReservations(hospitalId),
        bedManagementService.getBedUtilization(hospitalId),
      ]);
      if (requestId !== bedLoadSequenceRef.current) return;

      setActiveReservations(reservations);
      setBedUtilization(utilization);
    } catch (error) {
      if (requestId !== bedLoadSequenceRef.current) return;
      console.error('Error loading bed data:', error);
      setReservationError('Reservation data is unavailable. Try again.');
    } finally {
      if (requestId === bedLoadSequenceRef.current) setLoadingReservations(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    if (!isOpen || !hospitalId || !isView) {
      bedLoadSequenceRef.current += 1;
      return undefined;
    }

    setActiveReservations([]);
    setBedUtilization(null);
    setReservationError(null);
    loadBedData();

    const unsubscribe = bedManagementService.subscribeToReservations(hospitalId, loadBedData);
    return () => {
      bedLoadSequenceRef.current += 1;
      if (unsubscribe) unsubscribe();
    };
  }, [hospitalId, isOpen, isView, loadBedData]);

  return {
    activeReservations,
    bedUtilization,
    loadBedData,
    loadingReservations,
    reservationError,
  };
};
