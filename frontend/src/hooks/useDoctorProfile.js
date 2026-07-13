import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDoctorByProfileId } from '../services/doctorsService';
import { toast } from 'sonner';

export const useDoctorProfile = () => {
    const { user, isProvider } = useAuth();
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!isProvider() || !user) return;
        try {
            setLoading(true);
            const data = await getDoctorByProfileId(user.id);
            if (data) {
                setDoctorProfile(data);
            }
        } catch {
            // Don't show toast on load error to avoid spam if just not set up yet
        } finally {
            setLoading(false);
        }
    }, [isProvider, user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProfile = async (updates) => {
        void updates;
        if (!doctorProfile) return null;
        const error = new Error('Professional directory changes require an approved provider-profile workflow.');
        error.code = 'DOCTOR_PROFILE_WRITE_UNAVAILABLE';
        toast.info('Professional directory editing is not available here.');
        throw error;
    };

    return { doctorProfile, loading, updateProfile, refresh: fetchProfile };
};
