import { useEffect, useState } from 'react';
import { getEmergencyCreateFacilityOptions } from '../../../services/emergencyService';
import { getEmergencyPatientOptions } from '../../../services/profilesService';

export const useEmergencyRequestOptions = ({
  isOpen,
  isView,
  isCreate,
  isAdmin,
  isOrgAdmin,
}) => {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersPartial, setUsersPartial] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState('');
  const [facilitiesPartial, setFacilitiesPartial] = useState(false);

  useEffect(() => {
    if (!isOpen || isView) return undefined;

    let active = true;
    setUsersLoading(true);
    setUsersError('');
    getEmergencyPatientOptions()
      .then((result) => {
        if (!active) return;
        setUsers(result.data || []);
        setUsersPartial(Boolean(result.isPartial));
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error fetching patient options:', error);
        setUsers([]);
        setUsersPartial(false);
        setUsersError(error?.message || 'Patient lookup is temporarily unavailable.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, isView]);

  useEffect(() => {
    if (!isOpen || !isCreate || (!isAdmin() && !isOrgAdmin())) return undefined;

    let active = true;
    setFacilitiesLoading(true);
    setFacilitiesError('');
    getEmergencyCreateFacilityOptions()
      .then((result) => {
        if (!active) return;
        setFacilities(result.data || []);
        setFacilitiesPartial(Boolean(result.isPartial));
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error fetching emergency facility options:', error);
        setFacilities([]);
        setFacilitiesPartial(false);
        setFacilitiesError(error?.message || 'Facilities could not be loaded. Try again.');
      })
      .finally(() => {
        if (active) setFacilitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, isCreate, isOpen, isOrgAdmin]);

  return {
    users,
    usersLoading,
    usersError,
    usersPartial,
    facilities,
    facilitiesLoading,
    facilitiesError,
    facilitiesPartial,
  };
};
