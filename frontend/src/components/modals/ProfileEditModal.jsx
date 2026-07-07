
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
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            const publicUrl = await uploadAvatar(file);

            setFormData(prev => ({ ...prev, image_uri: publicUrl }));
            toast.success('Image uploaded successfully');
        } catch {
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
                        role="dialog"

                        aria-modal="true"

                        className="relative z-10 flex w-full max-w-xl max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-modal bg-background/95 shadow-2xl backdrop-blur-xl md:max-h-[85vh]"
                    >
                        <div className="flex shrink-0 items-center justify-between p-3 shadow-[0_18px_42px_rgb(0_0_0/0.06)] md:p-6">
                            <h2 className="text-xl font-bold tracking-tight">Edit Profile</h2>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                aria-label="Close profile editor"
                                className="h-8 w-8 rounded-pill bg-muted/50 p-0 transition-colors hover:bg-muted"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <form id="profile-edit-form" onSubmit={handleSubmit} className="p-3 md:p-6 space-y-4 md:space-y-6">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group cursor-pointer">
                                        <div className="h-28 w-28 overflow-hidden rounded-card bg-muted shadow-xl">
                                            {(uploading) ? (
                                                <div role="status" aria-live="polite" className="flex h-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                                                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                                                    <span className="text-[10px] font-semibold">Uploading</span>
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
                                            aria-disabled={uploading ? 'true' : undefined}
                                            data-state={uploading ? 'pending' : 'ready'}
                                            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-card bg-black/40 opacity-0 transition-all group-hover:opacity-100"
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
                                    <p className="text-xs font-medium text-muted-foreground">{uploading ? 'Uploading photo...' : 'Tap to change photo'}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="ml-1 text-xs font-bold text-muted-foreground">Identity</Label>
                                            <div className="flex flex-col gap-4 rounded-inner bg-muted/20 p-4 shadow-sm">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="mb-1 block text-[10px] font-bold text-muted-foreground">First name</span>
                                                        <div className="text-sm font-semibold">{profile?.first_name || 'Not Set'}</div>
                                                    </div>
                                                    <div>
                                                        <span className="mb-1 block text-[10px] font-bold text-muted-foreground">Last name</span>
                                                        <div className="text-sm font-semibold">{profile?.last_name || 'Not Set'}</div>
                                                    </div>
                                                </div>
                                                <div className="h-1 w-full rounded-pill bg-muted/20" />
                                                <div>
                                                    <span className="mb-1 block text-[10px] font-bold text-muted-foreground">Email</span>
                                                    <div className="text-sm font-semibold font-mono tracking-tight">{profile?.email || user?.email || 'No email linked'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 col-span-2">
                                            <Label className="ml-1 text-xs font-bold text-muted-foreground">Member since</Label>
                                            <div className="cursor-not-allowed rounded-inner bg-muted/20 p-3 text-sm font-medium text-muted-foreground opacity-80 shadow-sm">
                                                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="my-1 h-1 rounded-pill bg-muted/20" />

                                    <div className="space-y-2">
                                        <Label className="ml-1 text-xs font-bold text-muted-foreground">Username</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                value={formData.username}
                                                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                                                className="h-12 rounded-button bg-muted/30 pl-10 shadow-sm"
                                                placeholder="jdoe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="ml-1 text-xs font-bold text-muted-foreground">Phone number</Label>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                                className="h-12 rounded-button bg-muted/30 pl-10 shadow-sm"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="mt-auto shrink-0 bg-background/50 p-6 pt-2 shadow-[0_-18px_42px_rgb(0_0_0/0.06)] backdrop-blur-md">
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={loading || uploading}
                                    data-state={(loading || uploading) ? 'blocked' : 'ready'}
                                    className="h-12 flex-1 rounded-button bg-muted/50 font-semibold hover:bg-muted"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    form="profile-edit-form"
                                    disabled={loading || uploading}
                                    aria-busy={loading ? 'true' : undefined}
                                    data-state={loading ? 'pending' : uploading ? 'blocked' : 'ready'}
                                    className="h-12 flex-1 rounded-button bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            Saving...
                                        </>
                                    ) : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
