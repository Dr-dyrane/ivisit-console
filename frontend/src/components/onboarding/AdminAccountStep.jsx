/**
 * @fileoverview AdminAccountStep - Premium Apple-standard design
 * 
 * @description
 * Admin account creation with progressive disclosure:
 * - Active input section is focused (bright)
 * - Inactive sections are dimmed (blur-sm)
 * - Smooth reveal animations for password requirements
 * - Premium microinteractions
 * 
 * @author iVisit Console Team
 * @version 2.0.0 - Premium redesign
 * @since 2026-02-02
 */

'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Mail, Lock, User, Eye, EyeOff, Check, X, Shield } from 'lucide-react';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const sectionVariants = {
    inactive: {
        opacity: 0.5,
        filter: 'blur(0px)',
        scale: 0.98,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    active: {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
    completed: {
        opacity: 0.8,
        filter: 'blur(0px)',
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
};

const revealVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
        opacity: 1,
        height: 'auto',
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminAccountStep = ({ formData, updateFormData, setStepValid }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [activeSection, setActiveSection] = useState('name'); // 'name' | 'email' | 'password' | 'terms'
    const [errors, setErrors] = useState({});
    const prevValidRef = useRef(null);

    // Section completion states
    const sectionStates = useMemo(() => ({
        name: formData.adminFullName?.trim().length >= 2,
        email: formData.adminEmail?.includes('@'),
        password: false, // Will be calculated below
        terms: formData.termsAccepted,
    }), [formData]);

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

        return { checks, score, level, isValid: score >= 3 };
    }, [formData.adminPassword]);

    // Validate form
    useEffect(() => {
        const isValid =
            sectionStates.name &&
            sectionStates.email &&
            passwordStrength.isValid &&
            sectionStates.terms;

        if (prevValidRef.current !== isValid) {
            prevValidRef.current = isValid;
            setStepValid(isValid);
        }
    }, [sectionStates, passwordStrength, setStepValid]);

    // Auto-focus to terms when password becomes valid
    const prevPasswordValid = useRef(false);
    useEffect(() => {
        // When password just became valid and terms not yet accepted, move focus to terms
        if (passwordStrength.isValid && !prevPasswordValid.current && !formData.termsAccepted) {
            setTimeout(() => setActiveSection('terms'), 300);
        }
        prevPasswordValid.current = passwordStrength.isValid;
    }, [passwordStrength.isValid, formData.termsAccepted]);

    const handleChange = (field, value) => {
        updateFormData({ [field]: value });
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const getSectionState = (section) => {
        if (activeSection === section) return 'active';
        if (section === 'name' && sectionStates.name) return 'completed';
        if (section === 'email' && sectionStates.email) return 'completed';
        if (section === 'password' && passwordStrength.isValid) return 'completed';
        if (section === 'terms' && sectionStates.terms) return 'completed';
        return 'inactive';
    };

    const strengthColors = {
        weak: 'bg-destructive',
        fair: 'bg-orange-500',
        good: 'bg-yellow-500',
        strong: 'bg-green-500',
    };

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-8">
                Create your administrator account
            </p>

            {/* Two-column grid on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Name + Email */}
                <div className="space-y-6">
                    {/* Full Name Section */}
                    <motion.div
                        variants={sectionVariants}
                        animate={getSectionState('name')}
                        className="space-y-2 p-4 rounded-card bg-muted/20 transition-colors"
                    >
                        <Label htmlFor="adminName" className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            Full Name
                            {sectionStates.name && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                        </Label>
                        <Input
                            id="adminName"
                            placeholder="Dr. John Smith"
                            value={formData.adminFullName || ''}
                            onChange={(e) => handleChange('adminFullName', e.target.value)}
                            onFocus={() => setActiveSection('name')}
                            autoComplete="name"
                        />
                    </motion.div>

                    {/* Email Section */}
                    <motion.div
                        variants={sectionVariants}
                        animate={getSectionState('email')}
                        className="space-y-2 p-4 rounded-card bg-muted/20 transition-colors"
                    >
                        <Label htmlFor="adminEmail" className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            Email Address
                            {sectionStates.email && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                        </Label>
                        <Input
                            id="adminEmail"
                            type="email"
                            placeholder="admin@hospital.ng"
                            value={formData.adminEmail || ''}
                            onChange={(e) => handleChange('adminEmail', e.target.value)}
                            onFocus={() => setActiveSection('email')}
                            autoComplete="email"
                        />
                        <AnimatePresence>
                            {activeSection === 'email' && (
                                <motion.p
                                    variants={revealVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="text-xs text-muted-foreground"
                                >
                                    This will be your login email
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Right Column: Password + Terms */}
                <div className="flex flex-col justify-between gap-6">
                    {/* Password Section */}
                    <motion.div
                        variants={sectionVariants}
                        animate={getSectionState('password')}
                        className="space-y-2 p-4 rounded-card bg-muted/20 transition-colors"
                    >
                        <Label htmlFor="adminPassword" className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            Password
                            {passwordStrength.isValid && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                        </Label>
                        <div className="relative">
                            <Input
                                id="adminPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a strong password"
                                value={formData.adminPassword || ''}
                                onChange={(e) => handleChange('adminPassword', e.target.value)}
                                onFocus={() => setActiveSection('password')}
                                autoComplete="new-password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Progressive Disclosure: Password Strength */}
                        <AnimatePresence mode="wait">
                            {(activeSection === 'password' && formData.adminPassword) && (
                                <motion.div
                                    variants={revealVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
                                    className="space-y-3 pt-2"
                                >
                                    {/* Strength Bar */}
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <motion.div
                                                key={level}
                                                initial={{ scaleX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ delay: level * 0.05 }}
                                                className={`h-1.5 flex-1 rounded-pill transition-colors origin-left ${level <= passwordStrength.score
                                                    ? strengthColors[passwordStrength.level]
                                                    : 'bg-muted'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs capitalize font-medium ${passwordStrength.level === 'weak' ? 'text-destructive' :
                                        passwordStrength.level === 'fair' ? 'text-orange-500' :
                                            passwordStrength.level === 'good' ? 'text-yellow-600' :
                                                'text-green-500'
                                        }`}>
                                        {passwordStrength.level} password
                                    </p>

                                    {/* Requirements Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {Object.entries({
                                            length: '8+ characters',
                                            uppercase: 'Uppercase',
                                            lowercase: 'Lowercase',
                                            number: 'Number',
                                            special: 'Special char',
                                        }).map(([key, label], i) => (
                                            <motion.div
                                                key={key}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.03 }}
                                                className={`flex items-center gap-1.5 ${passwordStrength.checks[key] ? 'text-green-500' : 'text-muted-foreground'
                                                    }`}
                                            >
                                                {passwordStrength.checks[key]
                                                    ? <Check className="w-3.5 h-3.5" />
                                                    : <X className="w-3.5 h-3.5" />}
                                                {label}
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Terms Section */}
                    <motion.div
                        variants={sectionVariants}
                        animate={getSectionState('terms')}
                        className="p-4 rounded-card bg-muted/20 transition-colors"
                        onFocus={() => setActiveSection('terms')}
                    >
                        <div className="flex items-start space-x-3">
                            <Checkbox
                                id="terms"
                                checked={formData.termsAccepted || false}
                                onCheckedChange={(checked) => {
                                    handleChange('termsAccepted', checked);
                                    setActiveSection('terms');
                                }}
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                            >
                                I agree to iVisit's{' '}
                                <a href="https://ivisit.ng/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-muted-foreground">
                                    Terms of Service
                                </a>
                                {' '}and{' '}
                                <a href="https://ivisit.ng/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-muted-foreground">
                                    Privacy Policy
                                </a>
                            </Label>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AdminAccountStep;
