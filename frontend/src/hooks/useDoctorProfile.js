import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDoctorByProfileId, updateDoctor } from '../services/doctorsService';
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
        } catch (error) {
            console.error('Error loading doctor profile', error);
            // Don't show toast on load error to avoid spam if just not set up yet
        } finally {
            setLoading(false);
        }
    }, [isProvider, user]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updateProfile = async (updates) => {
        if (!doctorProfile) return;
        try {
            setLoading(true);
            const updated = await updateDoctor(doctorProfile.id, updates);
            setDoctorProfile(prev => ({ ...prev, ...updated }));
            toast.success('Professional profile updated successfully');
            return updated;
        } catch (error) {
            toast.error('Failed to update profile');
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { doctorProfile, loading, updateProfile, refresh: fetchProfile };
};
