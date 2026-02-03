/**
 * @fileoverview OnboardingContext - Centralized state management for organization registration wizard
 * 
 * @description
 * This context manages all onboarding state including:
 * - Current step and navigation
 * - Form data across all 5 steps
 * - Step validation states
 * - Submission status
 * 
 * @usage
 * Wrap OnboardingPage with OnboardingProvider, then use useOnboarding() hook in step components.
 * 
 * @rollback
 * To revert to prop-drilling approach:
 * 1. Remove this file
 * 2. Restore OnboardingWizard.jsx from git (version before this change)
 * 3. Remove OnboardingProvider from OnboardingPage.jsx
 * 
 * @author iVisit Console Team
 * @version 1.0.0
 * @since 2026-02-02
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onboardingService } from '../services/onboardingService';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Step configuration for the onboarding wizard
 * NOTE: Admin account comes before Details so user is authenticated when searching hospitals
 * @constant {Array<{id: string, title: string, description: string}>}
 */
export const ONBOARDING_STEPS = [
    {
        id: 'type',
        title: 'Organization Type',
        description: 'Choose your organization category'
    },
    {
        id: 'account',
        title: 'Admin Account',
        description: 'Create your login credentials'
    },
    {
        id: 'details',
        title: 'Details',
        description: 'Basic organization information'
    },
    {
        id: 'setup',
        title: 'Initial Setup',
        description: 'Configure your organization'
    },
    {
        id: 'verify',
        title: 'Verification',
        description: 'Submit for review'
    },
];

/**
 * Initial form data state
 * @constant {Object}
 */
const INITIAL_FORM_DATA = {
    // Step 1: Organization Type
    organizationType: null, // 'hospital' | 'clinic' | 'ambulance_service'

    // Step 2: Admin Account (moved before Details for auth)
    adminEmail: '',
    adminPassword: '',
    adminFullName: '',
    termsAccepted: false,

    // Step 3: Organization Details
    organizationName: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    registrationNumber: '', // CAC number (Nigeria)
    operatingHours: { open: '08:00', close: '20:00' },
    location: null, // { lat, lng }

    // Hospital claim state (for existing hospitals)
    selectedHospitalId: null,      // ID of claimed hospital (if any)
    isClaimingExisting: false,     // Whether claiming an existing hospital

    // Step 4: Initial Setup (type-specific)
    departments: [],      // Hospital only
    specialties: [],      // Hospital/Clinic
    bedCapacity: 0,       // Hospital only
    fleetSize: 0,         // Ambulance only
    vehicleTypes: [],     // Ambulance only
    coverageArea: '',     // Ambulance only

    // Step 5: Verification
    documents: [],
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const OnboardingContext = createContext(null);

/**
 * Hook to access onboarding context
 * @throws {Error} If used outside OnboardingProvider
 * @returns {OnboardingContextValue} The onboarding context value
 */
export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within OnboardingProvider');
    }
    return context;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * OnboardingProvider - Provides onboarding state to the wizard
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * 
 * @example
 * <OnboardingProvider>
 *   <OnboardingWizard />
 * </OnboardingProvider>
 */
export const OnboardingProvider = ({ children }) => {
    const navigate = useNavigate();

    // ========================================================================
    // STATE
    // ========================================================================

    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [stepValidity, setStepValidity] = useState({
        type: false,
        account: false,   // Now step 2
        details: false,   // Now step 3
        setup: true, // Optional step, always valid
        verify: true, // Optional docs, always valid
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [direction, setDirection] = useState(0); // Animation direction: 1=forward, -1=back
    const [selectedHospital, setSelectedHospital] = useState(null); // For hospital claim feature

    // ========================================================================
    // DERIVED STATE
    // ========================================================================

    const currentStepConfig = ONBOARDING_STEPS[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
    const isCurrentStepValid = stepValidity[currentStepConfig.id];

    /**
     * Progress percentage for progress bar
     */
    const progressPercent = useMemo(() => {
        return ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
    }, [currentStep]);

    // ========================================================================
    // ACTIONS
    // ========================================================================

    /**
     * Update form data (merges with existing)
     * @param {Partial<typeof INITIAL_FORM_DATA>} updates - Fields to update
     */
    const updateFormData = useCallback((updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    /**
     * Set validity for a specific step
     * @param {string} stepId - Step ID
     * @param {boolean} isValid - Whether step is valid
     */
    const setStepValid = useCallback((stepId, isValid) => {
        setStepValidity(prev => ({ ...prev, [stepId]: isValid }));
    }, []);

    /**
     * Navigate to next step
     */
    const goNext = useCallback(() => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep]);

    /**
     * Navigate to previous step
     */
    const goPrev = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    /**
     * Jump to a specific step (only if previous steps are valid)
     * @param {number} stepIndex - Target step index
     */
    const goToStep = useCallback((stepIndex) => {
        if (stepIndex < 0 || stepIndex >= ONBOARDING_STEPS.length) return;

        // Can only go back, or forward if current step is valid
        if (stepIndex < currentStep) {
            setDirection(-1);
            setCurrentStep(stepIndex);
        } else if (stepIndex > currentStep && isCurrentStepValid) {
            // Can only advance one step at a time forward
            if (stepIndex === currentStep + 1) {
                setDirection(1);
                setCurrentStep(stepIndex);
            }
        }
    }, [currentStep, isCurrentStepValid]);

    /**
     * Submit the onboarding form
     */
    const submitOnboarding = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const result = await onboardingService.submitOnboarding(formData);
            if (result.success) {
                toast.success('Registration submitted successfully!');
                navigate('/onboarding-success');
            }
        } catch (error) {
            console.error('Onboarding submission failed:', error);
            toast.error(error.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, navigate]);

    /**
     * Reset the entire onboarding state
     */
    const resetOnboarding = useCallback(() => {
        setCurrentStep(0);
        setFormData(INITIAL_FORM_DATA);
        setStepValidity({
            type: false,
            account: false,
            details: false,
            setup: true,
            verify: true,
        });
        setIsSubmitting(false);
        setDirection(0);
        setSelectedHospital(null);
    }, []);

    /**
     * Select an existing hospital to claim (auto-fills form data)
     * 
     * @important SCHEMA: Hospital has combined 'address' field, no separate city/state/email
     * We parse city/state from address format: "street, city, state"
     * 
     * @param {Object} hospital - Hospital data from search
     */
    const selectHospital = useCallback((hospital) => {
        if (!hospital) {
            setSelectedHospital(null);
            setFormData(prev => ({
                ...prev,
                selectedHospitalId: null,
                isClaimingExisting: false,
            }));
            return;
        }

        setSelectedHospital(hospital);

        // Parse address parts (format: "street, city, state")
        const addressParts = hospital.address?.split(', ') || [];
        const streetAddress = addressParts[0] || '';
        const parsedCity = addressParts[1] || hospital.city || '';
        const parsedState = addressParts[2] || hospital.state || '';

        // Auto-fill available data from the hospital
        setFormData(prev => ({
            ...prev,
            selectedHospitalId: hospital.id,
            isClaimingExisting: true,
            organizationName: hospital.name || prev.organizationName,
            // Parse address components
            address: streetAddress || prev.address,
            city: parsedCity || prev.city,
            state: parsedState || prev.state,
            phone: hospital.phone || prev.phone,
            // email doesn't exist in hospital schema, keep previous
            email: prev.email,
            location: hospital.latitude && hospital.longitude
                ? { lat: hospital.latitude, lng: hospital.longitude }
                : prev.location,
            specialties: hospital.specialties || prev.specialties,
        }));
    }, []);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const contextValue = useMemo(() => ({
        // State
        currentStep,
        currentStepConfig,
        formData,
        stepValidity,
        isSubmitting,
        direction,
        selectedHospital,

        // Derived
        isFirstStep,
        isLastStep,
        isCurrentStepValid,
        progressPercent,
        steps: ONBOARDING_STEPS,

        // Actions
        updateFormData,
        setStepValid,
        goNext,
        goPrev,
        goToStep,
        submitOnboarding,
        resetOnboarding,
        selectHospital,
    }), [
        currentStep,
        currentStepConfig,
        formData,
        stepValidity,
        isSubmitting,
        direction,
        selectedHospital,
        isFirstStep,
        isLastStep,
        isCurrentStepValid,
        progressPercent,
        updateFormData,
        setStepValid,
        goNext,
        goPrev,
        goToStep,
        submitOnboarding,
        resetOnboarding,
        selectHospital,
    ]);

    return (
        <OnboardingContext.Provider value={contextValue}>
            {children}
        </OnboardingContext.Provider>
    );
};

export default OnboardingProvider;
