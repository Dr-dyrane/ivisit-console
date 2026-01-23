import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useDoctorProfile } from '../../hooks/useDoctorProfile';
import { Loader2, Save, X, Edit2, Stethoscope, Building2, Star, Award, CreditCard, Clock, Activity, Shield } from 'lucide-react';

export const DoctorProfileCard = () => {
    const { doctorProfile, loading, updateProfile } = useDoctorProfile();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});

    // Initialize form data when profile loads
    useEffect(() => {
        if (doctorProfile) {
            setFormData({
                about: doctorProfile.about || '',
                experience: doctorProfile.experience || 0,
                consultation_fee: doctorProfile.consultation_fee || 0,
                is_available: doctorProfile.is_available ?? false,
                status: doctorProfile.status || 'offline'
            });
        }
    }, [doctorProfile]);

    const handleSave = async () => {
        try {
            await updateProfile(formData);
            setIsEditing(false);
        } catch (error) {
            // Toast handled in hook
        }
    };

    if (loading && !doctorProfile) {
        return (
            <Card className="squircle-3xl p-8 flex justify-center items-center bg-background/60 backdrop-blur-md border-white/5">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    if (!doctorProfile) {
        return (
            <Card className="squircle-3xl bg-background/60 backdrop-blur-md border-white/5 shadow-xl relative overflow-hidden p-8 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Stethoscope className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-xl font-bold">Professional Profile Inactive</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Your account has the Provider role, but your professional credentials haven't been configured yet.
                    Please contact an administrator to complete your onboarding.
                </p>
                <div className="pt-4">
                    <Button
                        variant="outline"
                        onClick={() => window.dispatchEvent(new CustomEvent('openSupportModal'))}
                        className="squircle-xl border-white/10"
                    >
                        Contact Support
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="squircle-3xl bg-background/60 backdrop-blur-md border-white/5 shadow-xl relative overflow-hidden">
            {/* Dynamic Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Header */}
            <div className="p-6 border-b border-border/10 flex justify-between items-center bg-muted/10 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-muted/20">
                            {doctorProfile.image ? (
                                <img
                                    src={doctorProfile.image}
                                    alt="Professional"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Stethoscope className="w-6 h-6 text-muted-foreground opacity-50" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-lg border border-white/5 shadow-sm">
                            <Shield className="w-2.5 h-2.5 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-none">Professional Profile</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Provider ID: #{doctorProfile.id?.slice(-8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.dispatchEvent(new CustomEvent('openDoctorModal'))}
                        className="rounded-xl hover:bg-background/80 text-xs font-semibold px-3 hidden sm:flex"
                    >
                        View Card
                    </Button>
                    {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl hover:bg-background/80">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Details
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl">
                                <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={handleSave} className="rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 grid gap-8 relative z-10">
                {/* Read Only Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Award className="w-3 h-3" /> Specialization
                        </div>
                        <div className="font-semibold text-sm truncate" title={doctorProfile.specialization}>
                            {doctorProfile.specialization || 'General'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Building2 className="w-3 h-3" /> Affiliation
                        </div>
                        <div className="font-semibold text-sm truncate" title={doctorProfile.hospitals?.name}>
                            {doctorProfile.hospitals?.name || 'Independent'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Star className="w-3 h-3 text-orange-400" /> Rating
                        </div>
                        <div className="font-semibold text-sm">
                            {doctorProfile.rating} <span className="text-muted-foreground text-xs">({doctorProfile.reviews_count} reviews)</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                            <Activity className="w-3 h-3" /> Status
                        </div>
                        <div className={`font-semibold text-sm ${formData.is_available ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {formData.is_available ? 'Available' : 'Unavailable'}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Consultation Fee</Label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    disabled={!isEditing}
                                    value={formData.consultation_fee}
                                    onChange={(e) => setFormData(p => ({ ...p, consultation_fee: parseFloat(e.target.value) }))}
                                    className="pl-10 h-11 bg-muted/10 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Years of Experience</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    disabled={!isEditing}
                                    value={formData.experience}
                                    onChange={(e) => setFormData(p => ({ ...p, experience: parseInt(e.target.value) }))}
                                    className="pl-10 h-11 bg-muted/10 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-white/5">
                            <div className="space-y-1">
                                <Label className="text-sm font-semibold">Availability Status</Label>
                                <p className="text-xs text-muted-foreground">Toggle to appear in search results</p>
                            </div>
                            <Switch
                                disabled={!isEditing}
                                checked={formData.is_available}
                                onCheckedChange={(checked) => setFormData(p => ({ ...p, is_available: checked, status: checked ? 'active' : 'offline' }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Bio / About</Label>
                        <Textarea
                            disabled={!isEditing}
                            value={formData.about}
                            onChange={(e) => setFormData(p => ({ ...p, about: e.target.value }))}
                            className="h-full min-h-[160px] bg-muted/10 border-white/10 resize-none p-4 leading-relaxed"
                            placeholder="Tell patients about your expertise and background..."
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};
