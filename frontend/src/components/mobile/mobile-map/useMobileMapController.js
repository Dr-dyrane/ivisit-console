import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import {
  completeEmergency,
  dispatchEmergency,
} from '../../../services/emergencyResponseService';
import { getEmergencyActionState } from '../../../utils/emergencyActions';
import { getStandardizedPatient } from '../../../utils/patientUtils';
import { getMobileMapKpis } from './mobileMapPresentation';

export const useMobileMapController = ({
  allMarkers,
  mapData,
  refresh,
  setFilter,
  setSelectedMarker,
}) => {
  const { selectedMarker, loading, error } = mapData;
  const { isAdmin, isOrgAdmin } = useAuth();
  const canManageRequests = Boolean(isAdmin?.() || isOrgAdmin?.());
  const [mapCommand, setMapCommand] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapNotice, setMapNotice] = useState('');

  const mapKPIs = useMemo(
    () => getMobileMapKpis(mapData),
    [mapData]
  );
  const patientData = selectedMarker?.type === 'emergency'
    ? getStandardizedPatient(selectedMarker.data)
    : null;
  const emergencyActionState = selectedMarker?.type === 'emergency'
    ? getEmergencyActionState(selectedMarker.data)
    : null;
  const commandBusy = mapCommand !== null;
  const hasMapPoints = allMarkers.length > 0;
  const showInitialLoading = loading && !hasMapPoints;
  const showRefreshState = (loading || isRefreshing) && hasMapPoints;

  useEffect(() => {
    setMapCommand(null);
    setConfirmClose(false);
  }, [selectedMarker?.type, selectedMarker?.data?.id]);

  const runMapCommand = async (command, loadingCopy, successCopy, fallbackCopy, action) => {
    const toastId = `mobile-map-${command}`;
    setMapCommand(command);
    toast.loading(loadingCopy, { id: toastId });
    try {
      await action();
      toast.success(successCopy, { id: toastId });
    } catch (commandError) {
      toast.error(commandError?.message || fallbackCopy, { id: toastId });
    } finally {
      setMapCommand(null);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing || loading) return;
    setIsRefreshing(true);
    setMapNotice('Updating map data');
    try {
      await refresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilter = (item) => {
    setFilter?.(item.id);
    setMapNotice(`${item.label} requests shown`);
  };

  const handleDispatch = async () => {
    await runMapCommand('send', 'Sending unit...', 'Unit sent', 'Could not send unit', async () => {
      await dispatchEmergency(selectedMarker.data.id, selectedMarker.data);
      setSelectedMarker(null);
      await refresh();
    });
  };

  const handleComplete = async () => {
    if (!confirmClose) {
      setConfirmClose(true);
      toast.info('Confirm close to finish');
      return;
    }

    await runMapCommand('close', 'Closing request...', 'Request closed', 'Could not close request', async () => {
      await completeEmergency(selectedMarker.data.id, selectedMarker.data);
      setSelectedMarker(null);
      await refresh();
    });
  };

  return {
    canManageRequests,
    commandBusy,
    confirmClose,
    emergencyActionState,
    error,
    handleComplete,
    handleDispatch,
    handleFilter,
    handleRefresh,
    hasMapPoints,
    isRefreshing,
    loading,
    mapCommand,
    mapKPIs,
    mapNotice,
    patientData,
    selectedMarker,
    showInitialLoading,
    showRefreshState,
  };
};
