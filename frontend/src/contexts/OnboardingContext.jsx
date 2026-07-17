'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onboardingService } from '../services/onboardingService';
import { useAuth } from './AuthContext';

export const ONBOARDING_STEPS = [
  { id: 'account', title: 'Account', description: 'Secure your administrator access' },
  { id: 'organization', title: 'Organization', description: 'Choose the organization you are registering' },
  { id: 'essentials', title: 'Essentials', description: 'Add the details needed for review' },
  { id: 'review', title: 'Review', description: 'Confirm and submit your registration' },
];

const INITIAL_FORM_DATA = {
  adminEmail: '',
  adminPassword: '',
  adminFullName: '',
  organizationMode: 'new',
  organizationType: '',
  organizationName: '',
  facilitySearch: '',
  existingFacilityId: null,
  existingFacilityName: '',
  existingFacilityAddress: '',
  claimNote: '',
  registrationNumber: '',
  contactEmail: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  location: null,
  documents: [],
  termsAccepted: false,
};

const STORAGE_KEY = 'ivisit_onboarding_data_v2';
const STEP_KEY = 'ivisit_onboarding_step_v2';

const OnboardingContext = createContext(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};

const readStoredData = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? { ...INITIAL_FORM_DATA, ...JSON.parse(stored), documents: [] } : INITIAL_FORM_DATA;
  } catch {
    return INITIAL_FORM_DATA;
  }
};

const readStoredStep = () => {
  try {
    const stored = Number.parseInt(sessionStorage.getItem(STEP_KEY), 10);
    return Number.isInteger(stored) && stored >= 0 && stored < ONBOARDING_STEPS.length ? stored : 0;
  } catch {
    return 0;
  }
};

export const OnboardingProvider = ({ children }) => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const submittingRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(readStoredStep);
  const [formData, setFormData] = useState(readStoredData);
  const [stepValidity, setStepValidity] = useState({
    account: Boolean(user),
    organization: false,
    essentials: false,
    review: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [flowError, setFlowError] = useState('');

  useEffect(() => {
    if (user) {
      setStepValidity((current) => ({ ...current, account: true }));
      setFormData((current) => ({
        ...current,
        adminEmail: current.adminEmail || user.email || '',
        contactEmail: current.contactEmail || user.email || '',
      }));
      if (currentStep === 0) setCurrentStep(1);
    } else if (currentStep > 0) {
      setCurrentStep(0);
    }
  }, [currentStep, user]);

  useEffect(() => {
    try {
      const persisted = { ...formData, adminPassword: '', documents: [] };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Registration remains usable when browser storage is unavailable.
    }
  }, [formData]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(currentStep));
    } catch {
      // Registration remains usable when browser storage is unavailable.
    }
  }, [currentStep]);

  const currentStepConfig = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isCurrentStepValid = Boolean(stepValidity[currentStepConfig.id]);
  const progressPercent = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const updateFormData = useCallback((updates) => {
    setFlowError('');
    setFormData((current) => ({ ...current, ...updates }));
  }, []);

  const setStepValid = useCallback((stepId, valid) => {
    setStepValidity((current) => ({ ...current, [stepId]: Boolean(valid) }));
  }, []);

  const goNext = useCallback(() => {
    if (currentStep >= ONBOARDING_STEPS.length - 1) return;
    setDirection(1);
    setCurrentStep((step) => step + 1);
  }, [currentStep]);

  const goPrev = useCallback(() => {
    const minimumStep = user ? 1 : 0;
    if (currentStep <= minimumStep) return;
    setDirection(-1);
    setCurrentStep((step) => step - 1);
  }, [currentStep, user]);

  const goToStep = useCallback((stepIndex) => {
    const minimumStep = user ? 1 : 0;
    if (stepIndex < minimumStep || stepIndex >= currentStep) return;
    setDirection(-1);
    setCurrentStep(stepIndex);
  }, [currentStep, user]);

  const beginSubmitting = useCallback(() => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitting(true);
    setFlowError('');
    return true;
  }, []);

  const endSubmitting = useCallback(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  const createAdminAccount = useCallback(async () => {
    if (!beginSubmitting()) return null;
    setConfirmationRequired(false);
    try {
      const result = await onboardingService.createAdminAccount(formData);
      if (result.accountReady) {
        setStepValidity((current) => ({ ...current, account: true }));
        goNext();
      } else if (result.confirmationRequired) {
        setConfirmationRequired(true);
      }
      return result;
    } catch (error) {
      setFlowError(error.message);
      return null;
    } finally {
      endSubmitting();
    }
  }, [beginSubmitting, endSubmitting, formData, goNext]);

  const signInWithGoogle = useCallback(async () => {
    if (!beginSubmitting()) return;
    try {
      await onboardingService.signInWithGoogle();
    } catch (error) {
      setFlowError(error.message);
      endSubmitting();
    }
  }, [beginSubmitting, endSubmitting]);

  const submitOnboarding = useCallback(async () => {
    if (!beginSubmitting()) return null;
    try {
      const result = await onboardingService.submitOnboarding(formData);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STEP_KEY);
      } catch {
        // The backend result remains canonical when local cleanup is unavailable.
      }
      toast.success('Registration submitted');
      navigate('/onboarding-success', { replace: true, state: { result } });
      void refreshProfile();
      return result;
    } catch (error) {
      setFlowError(error.message);
      return null;
    } finally {
      endSubmitting();
    }
  }, [beginSubmitting, endSubmitting, formData, navigate, refreshProfile]);

  const contextValue = useMemo(() => ({
    currentStep,
    currentStepConfig,
    formData,
    stepValidity,
    isSubmitting,
    direction,
    confirmationRequired,
    flowError,
    isFirstStep,
    isLastStep,
    isCurrentStepValid,
    progressPercent,
    steps: ONBOARDING_STEPS,
    user,
    profile,
    updateFormData,
    setStepValid,
    goNext,
    goPrev,
    goToStep,
    createAdminAccount,
    signInWithGoogle,
    submitOnboarding,
  }), [
    confirmationRequired,
    createAdminAccount,
    currentStep,
    currentStepConfig,
    direction,
    flowError,
    formData,
    goNext,
    goPrev,
    goToStep,
    isCurrentStepValid,
    isFirstStep,
    isLastStep,
    isSubmitting,
    profile,
    progressPercent,
    signInWithGoogle,
    stepValidity,
    submitOnboarding,
    updateFormData,
    setStepValid,
    user,
  ]);

  return <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>;
};

export default OnboardingProvider;
