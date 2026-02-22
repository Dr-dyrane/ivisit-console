
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Upload, User, Smartphone, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../lib/avatarUtils';

export const ProfileEditModal = ({ isOpen, onClose }) => {
    const { user, profile, updateProfile, uploadAvatar } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        image_uri: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                phone: profile.phone || '',
                image_uri: profile.image_uri || profile.avatar_url || ''
            });
        }
    }, [profile]);

    const handleImageUpload = async (event) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const publicUrl = await uploadAvatar(file);

            setFormData(prev => ({ ...prev, image_uri: publicUrl }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updateProfile({
                username: formData.username,
                phone: formData.phone,
                image_uri: formData.image_uri,
                updated_at: new Date().toISOString(),
            });
            toast.success('Profile updated successfully');
            onClose();
        } catch (error) {
            console.error(error);
            handleApiError(error, 'update');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-xl bg-background/95 backdrop-blur-xl rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)] md:max-h-[85vh]"
                    >
                        <div className="p-3 md:p-6 border-b border-border/10 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold tracking-tight">Edit Profile</h2>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-colors p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <form id="profile-edit-form" onSubmit={handleSubmit} className="p-3 md:p-6 space-y-4 md:space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group cursor-pointer">
                                        <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-background shadow-xl ring-2 ring-muted">
                                            {(uploading) ? (
                                                <div className="flex items-center justify-center h-full bg-muted">
                                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={formData.image_uri || getAvatarUrl(profile)}
                                                    alt="Profile"
                                                    className="h-full w-full object-cover transition-opacity group-hover:opacity-75"
                                                />
                                            )}
                                        </div>
                                        <label
                                            htmlFor="avatar-upload"
                                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-all cursor-pointer"
                                        >
                                            <Camera className="w-8 h-8 text-white" />
                                        </label>
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tap to change photo</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Identity</Label>
                                            <div className="p-4 bg-muted/20 border border-white/5 rounded-2xl flex flex-col gap-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">First Name</span>
                                                        <div className="text-sm font-semibold">{profile?.first_name || 'Not Set'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Last Name</span>
                                                        <div className="text-sm font-semibold">{profile?.last_name || 'Not Set'}</div>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-border/10 w-full" />
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Electronic Mail</span>
                                                    <div className="text-sm font-semibold font-mono tracking-tight">{profile?.email || user?.email || 'No email linked'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Member Since</Label>
                                            <div className="p-3 bg-muted/20 border border-white/5 rounded-2xl text-sm font-medium text-muted-foreground opacity-80 cursor-not-allowed">
                                                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-border/10 my-1" />

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Username</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                value={formData.username}
                                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                                                className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                                placeholder="jdoe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Phone Number</Label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                                className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 pt-2 shrink-0 border-t border-border/5 mt-auto bg-background/50 backdrop-blur-md">
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-2xl h-12 border-0 bg-muted/50 hover:bg-muted font-semibold">
                                    Cancel
                                </Button>
                                <Button type="submit" form="profile-edit-form" disabled={loading || uploading} className="flex-1 rounded-2xl h-12 font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
