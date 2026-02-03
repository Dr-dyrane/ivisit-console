'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';

/**
 * AdminAccountStep - Create admin account
 * Email, password with strength indicator, terms acceptance
 */
export const AdminAccountStep = ({ formData, updateFormData, setStepValid }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const prevValidRef = useRef(null);

    // Password strength calculation
    const passwordStrength = useMemo(() => {
        const password = formData.adminPassword || '';
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
        };

        const score = Object.values(checks).filter(Boolean).length;
        const level = score <= 2 ? 'weak' : score <= 3 ? 'fair' : score <= 4 ? 'good' : 'strong';

        return { checks, score, level };
    }, [formData.adminPassword]);

    // Validate form - use ref to prevent infinite loop
    useEffect(() => {
        const isValid =
            formData.adminFullName?.trim().length >= 2 &&
            formData.adminEmail?.includes('@') &&
            passwordStrength.score >= 3 &&
            formData.termsAccepted;

        // Only call setStepValid if validity actually changed
        if (prevValidRef.current !== isValid) {
            prevValidRef.current = isValid;
            setStepValid(isValid);
        }
    }, [formData, passwordStrength, setStepValid]);

    const handleChange = (field, value) => {
        updateFormData({ [field]: value });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const strengthColors = {
        weak: 'bg-destructive',
        fair: 'bg-orange-500',
        good: 'bg-yellow-500',
        strong: 'bg-green-500',
    };

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-6">
                Create your administrator account
            </p>

            {/* Full Name */}
            <div className="space-y-2">
                <Label htmlFor="adminName" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full Name
                </Label>
                <Input
                    id="adminName"
                    placeholder="Dr. John Smith"
                    value={formData.adminFullName || ''}
                    onChange={(e) => handleChange('adminFullName', e.target.value)}
                    autoComplete="name"
                />
            </div>

            {/* Email */}
            <div className="space-y-2">
                <Label htmlFor="adminEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                </Label>
                <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@hospital.ng"
                    value={formData.adminEmail || ''}
                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                    autoComplete="email"
                    className={errors.adminEmail ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                    This will be your login email
                </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
                <Label htmlFor="adminPassword" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Password
                </Label>
                <div className="relative">
                    <Input
                        id="adminPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={formData.adminPassword || ''}
                        onChange={(e) => handleChange('adminPassword', e.target.value)}
                        autoComplete="new-password"
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.adminPassword && (
                    <div className="space-y-2">
                        {/* Strength Bar */}
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <div
                                    key={level}
                                    className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.score
                                        ? strengthColors[passwordStrength.level]
                                        : 'bg-muted'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className={`text-xs capitalize ${passwordStrength.level === 'weak' ? 'text-destructive' :
                            passwordStrength.level === 'fair' ? 'text-orange-500' :
                                passwordStrength.level === 'good' ? 'text-yellow-600' :
                                    'text-green-500'
                            }`}>
                            {passwordStrength.level} password
                        </p>

                        {/* Requirements */}
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            {Object.entries({
                                length: '8+ characters',
                                uppercase: 'Uppercase',
                                lowercase: 'Lowercase',
                                number: 'Number',
                                special: 'Special char',
                            }).map(([key, label]) => (
                                <div
                                    key={key}
                                    className={`flex items-center gap-1 ${passwordStrength.checks[key] ? 'text-green-500' : 'text-muted-foreground'
                                        }`}
                                >
                                    {passwordStrength.checks[key]
                                        ? <Check className="w-3 h-3" />
                                        : <X className="w-3 h-3" />}
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start space-x-3 pt-4">
                <Checkbox
                    id="terms"
                    checked={formData.termsAccepted || false}
                    onCheckedChange={(checked) => handleChange('termsAccepted', checked)}
                />
                <Label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                    I agree to iVisit's{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline">
                        Privacy Policy
                    </a>
                </Label>
            </div>
        </div>
    );
};

export default AdminAccountStep;
