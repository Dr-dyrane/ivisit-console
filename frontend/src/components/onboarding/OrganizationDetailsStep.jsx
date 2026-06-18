'use client';

/**
 * @fileoverview OrganizationDetailsStep - Enhanced with hospital autocomplete
 * 
 * @description
 * Step 3 of onboarding (after admin account creation, so user is authenticated).
 * Features progressive disclosure, hospital autocomplete, and Apple-inspired animations.
 * 
 * Flow:
 * 1. User types organization name
 * 2. Debounced search shows matching hospitals
 * 3. User can select existing (auto-fill) or create new
 * 4. If hospital is claimed, show block state
 * 
 * @rollback
 * To revert: git checkout HEAD~1 -- src/components/onboarding/OrganizationDetailsStep.jsx
 * 
 * @author iVisit Console Team
 * @version 2.0.0
 * @since 2026-02-02
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
    MapPin, Phone, Mail, Building, FileText, Clock,
    Search, Loader2, Check, X, AlertCircle, Sparkles,
    ChevronRight, MapPinned
} from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { onboardingService } from '../../services/onboardingService';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEBOUNCE_MS = 300;

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Custom hook for debounced hospital search
 */
const useHospitalSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);

    const search = useCallback((searchQuery) => {
        setQuery(searchQuery);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Don't search for short queries
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            setIsSearching(false);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const hospitals = await onboardingService.searchHospitalsByName(searchQuery);
                setResults(hospitals);
                setHasSearched(true);
            } catch (error) {
                console.error('Hospital search failed:', error);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, DEBOUNCE_MS);
    }, []);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return { query, results, isSearching, hasSearched, search, clearSearch };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * HospitalSuggestion - Individual hospital suggestion with hover-to-reveal details
 */
const HospitalSuggestion = ({ hospital, onSelect, isSelected }) => {
    const [isHovered, setIsHovered] = useState(false);

    const statusConfig = {
        verified: { label: 'Registered', color: 'text-destructive', bg: 'bg-destructive/10' },
        pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10' },
        unclaimed: { label: 'Available', color: 'text-green-500', bg: 'bg-green-500/10' },
    };

    const status = statusConfig[hospital.claimStatus] || statusConfig.unclaimed;

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={() => onSelect(hospital)}
            disabled={hospital.claimStatus === 'verified' || hospital.claimStatus === 'pending'}
            className={`
                w-full text-left p-4 rounded-xl transition-all duration-200
                ${isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : hospital.claimStatus === 'unclaimed'
                        ? 'bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-primary/20'
                        : 'bg-muted/20 border border-transparent opacity-75 cursor-not-allowed'}
            `}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate">{hospital.name}</span>
                    </div>

                    {/* Progressive disclosure - show on hover */}
                    <AnimatePresence>
                        {(isHovered || isSelected) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    {hospital.address && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate">{hospital.address}</span>
                                        </div>
                                    )}
                                    {hospital.city && (
                                        <div className="flex items-center gap-2">
                                            <MapPinned className="w-3 h-3" />
                                            <span>{hospital.city}, {hospital.state}</span>
                                        </div>
                                    )}
                                    {hospital.isGoogleImported && (
                                        <div className="flex items-center gap-1 text-xs text-primary">
                                            <Sparkles className="w-3 h-3" />
                                            <span>From Google Maps</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status badge */}
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.label}
                </span>
            </div>
        </motion.button>
    );
};

/**
 * BlockedHospitalCard - Shown when hospital is already claimed
 */
const BlockedHospitalCard = ({ hospital, onDismiss }) => {
    const isPending = hospital.claimStatus === 'pending';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20 text-center space-y-4"
        >
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                    {isPending ? 'Registration Pending' : 'Already Registered'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {isPending
                        ? `${hospital.name} already has a pending registration. Please wait for verification or contact support.`
                        : `${hospital.name} is already registered and verified with another organization.`}
                </p>
            </div>
            <Button variant="outline" onClick={onDismiss} className="gap-2">
                <X className="w-4 h-4" />
                Choose Different Name
            </Button>
        </motion.div>
    );
};

/**
 * SelectedHospitalCard - Shows auto-filled hospital with confirm action
 */
const SelectedHospitalCard = ({ hospital, onConfirm, onClear }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4"
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{hospital.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            {hospital.address || `${hospital.city}, ${hospital.state}`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span>Data auto-filled from {hospital.isGoogleImported ? 'Google Maps' : 'our records'}</span>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={onClear} className="flex-1">
                    Enter Manually
                </Button>
                <Button onClick={onConfirm} className="flex-1 gap-2">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrganizationDetailsStep - Collect organization information with autocomplete
 * @component
 */
export const OrganizationDetailsStep = ({ formData, updateFormData, setStepValid }) => {
    const { selectedHospital, selectHospital } = useOnboarding();
    const [errors, setErrors] = useState({});
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [blockedHospital, setBlockedHospital] = useState(null);
    const prevValidRef = useRef(null);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    const { query, results, isSearching, hasSearched, search, clearSearch } = useHospitalSearch();

    // ========================================================================
    // VALIDATION
    // ========================================================================

    useEffect(() => {
        const isValid =
            formData.organizationName?.trim().length >= 3 &&
            formData.address?.trim().length >= 5 &&
            formData.city?.trim().length >= 2 &&
            formData.state?.trim().length >= 2 &&
            formData.phone?.trim().length >= 10 &&
            formData.email?.includes('@');

        if (prevValidRef.current !== isValid) {
            prevValidRef.current = isValid;
            setStepValid(isValid);
        }
    }, [formData, setStepValid]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleChange = useCallback((field, value) => {
        updateFormData({ [field]: value });

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    }, [updateFormData, errors]);

    const handleNameChange = useCallback((e) => {
        const value = e.target.value;
        handleChange('organizationName', value);
        search(value);
        setShowSuggestions(true);

        // Clear selected hospital if name changes
        if (selectedHospital) {
            selectHospital(null);
        }
    }, [handleChange, search, selectedHospital, selectHospital]);

    const handleSelectHospital = useCallback(async (hospital) => {
        // Check if hospital can be claimed
        if (hospital.claimStatus === 'verified' || hospital.claimStatus === 'pending') {
            setBlockedHospital(hospital);
            return;
        }

        // Auto-fill data
        selectHospital(hospital);
        setShowSuggestions(false);
        clearSearch();
    }, [selectHospital, clearSearch]);

    const handleClearSelection = useCallback(() => {
        selectHospital(null);
        clearSearch();
        updateFormData({
            organizationName: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            email: '',
            location: null,
        });
    }, [selectHospital, clearSearch, updateFormData]);

    const handleDismissBlocked = useCallback(() => {
        setBlockedHospital(null);
        handleClearSelection();
    }, [handleClearSelection]);

    const validateField = useCallback((field, value) => {
        let error = null;

        switch (field) {
            case 'organizationName':
                if (value.trim().length < 3) error = 'Name must be at least 3 characters';
                break;
            case 'email':
                if (!value.includes('@')) error = 'Invalid email address';
                break;
            case 'phone':
                if (value.replace(/\D/g, '').length < 10) error = 'Invalid phone number';
                break;
            default:
                break;
        }

        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ========================================================================
    // RENDER STATES
    // ========================================================================

    // Show blocked state
    if (blockedHospital) {
        return (
            <div className="space-y-6">
                <p className="text-center text-muted-foreground mb-6">
                    Tell us about your {formData.organizationType?.replace('_', ' ') || 'organization'}
                </p>
                <BlockedHospitalCard hospital={blockedHospital} onDismiss={handleDismissBlocked} />
            </div>
        );
    }

    // Show selected hospital confirmation
    if (selectedHospital) {
        return (
            <div className="space-y-6">
                <p className="text-center text-muted-foreground mb-6">
                    We found your organization! Confirm the details below.
                </p>
                <SelectedHospitalCard
                    hospital={selectedHospital}
                    onConfirm={() => setShowSuggestions(false)}
                    onClear={handleClearSelection}
                />

                {/* Show form fields disabled with auto-filled data */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4 opacity-60"
                >
                    <FormFields
                        formData={formData}
                        errors={errors}
                        handleChange={handleChange}
                        validateField={validateField}
                        disabled
                    />
                </motion.div>
            </div>
        );
    }

    // ========================================================================
    // MAIN RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-6">
                Tell us about your {formData.organizationType?.replace('_', ' ') || 'organization'}
            </p>

            {/* Organization Name with Autocomplete */}
            <div className="space-y-2 relative">
                <Label htmlFor="orgName" className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    Organization Name
                </Label>
                <div className="relative">
                    <Input
                        ref={inputRef}
                        id="orgName"
                        placeholder="Start typing to search..."
                        value={formData.organizationName || ''}
                        onChange={handleNameChange}
                        onFocus={() => hasSearched && setShowSuggestions(true)}
                        onBlur={(e) => validateField('organizationName', e.target.value)}
                        className={`pr-10 ${errors.organizationName ? 'border-destructive' : ''}`}
                        autoComplete="off"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && (results.length > 0 || hasSearched) && (
                        <motion.div
                            ref={suggestionsRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 p-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg max-h-[300px] overflow-y-auto"
                        >
                            {results.length > 0 ? (
                                <div className="space-y-2">
                                    {results.map((hospital) => (
                                        <HospitalSuggestion
                                            key={hospital.id}
                                            hospital={hospital}
                                            onSelect={handleSelectHospital}
                                            isSelected={selectedHospital?.id === hospital.id}
                                        />
                                    ))}
                                </div>
                            ) : hasSearched && !isSearching ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    <p className="text-sm">No matching hospitals found.</p>
                                    <p className="text-xs mt-1">Continue to register a new organization.</p>
                                </div>
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>

                {errors.organizationName && (
                    <p className="text-xs text-destructive">{errors.organizationName}</p>
                )}
            </div>

            {/* Form Fields - Staggered animation */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: {
                        transition: { staggerChildren: 0.05 }
                    }
                }}
            >
                <FormFields
                    formData={formData}
                    errors={errors}
                    handleChange={handleChange}
                    validateField={validateField}
                />
            </motion.div>
        </div>
    );
};

// ============================================================================
// FORM FIELDS COMPONENT
// ============================================================================

/**
 * Reusable form fields with staggered animation
 */
const FormFields = ({ formData, errors, handleChange, validateField, disabled = false }) => {
    const fieldVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-4">
            {/* Address */}
            <motion.div variants={fieldVariants} className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Street Address
                </Label>
                <Input
                    id="address"
                    placeholder="e.g., 12 Marina Road"
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    disabled={disabled}
                />
            </motion.div>

            {/* City & State */}
            <motion.div variants={fieldVariants} className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        placeholder="Lagos"
                        value={formData.city || ''}
                        onChange={(e) => handleChange('city', e.target.value)}
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                        id="state"
                        placeholder="Lagos"
                        value={formData.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        disabled={disabled}
                    />
                </div>
            </motion.div>

            {/* Phone */}
            <motion.div variants={fieldVariants} className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number
                </Label>
                <Input
                    id="phone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={(e) => validateField('phone', e.target.value)}
                    className={errors.phone ? 'border-destructive' : ''}
                    disabled={disabled}
                />
                {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                )}
            </motion.div>

            {/* Email */}
            <motion.div variants={fieldVariants} className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Official Email
                </Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="contact@hospital.ng"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={(e) => validateField('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                    disabled={disabled}
                />
                {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                )}
            </motion.div>

            {/* CAC Registration */}
            <motion.div variants={fieldVariants} className="space-y-2">
                <Label htmlFor="regNumber" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    CAC Registration Number
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                    id="regNumber"
                    placeholder="RC 123456"
                    value={formData.registrationNumber || ''}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    disabled={disabled}
                />
            </motion.div>

            {/* Operating Hours */}
            <motion.div variants={fieldVariants} className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Operating Hours
                </Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="openTime" className="text-xs text-muted-foreground">Opens</Label>
                        <Input
                            id="openTime"
                            type="time"
                            value={formData.operatingHours?.open || '08:00'}
                            onChange={(e) => handleChange('operatingHours', {
                                ...formData.operatingHours,
                                open: e.target.value
                            })}
                            disabled={disabled}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="closeTime" className="text-xs text-muted-foreground">Closes</Label>
                        <Input
                            id="closeTime"
                            type="time"
                            value={formData.operatingHours?.close || '20:00'}
                            onChange={(e) => handleChange('operatingHours', {
                                ...formData.operatingHours,
                                close: e.target.value
                            })}
                            disabled={disabled}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OrganizationDetailsStep;
