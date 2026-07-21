'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onboardingService } from '../services/onboardingService';
import { useAuth } from './AuthContext';
import {
  clearOnboardingDraftStorage,
  ONBOARDING_STEP_KEY,
  ONBOARDING_STORAGE_KEY,
} from './onboardingDraftStorage';

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

const OnboardingContext = createContext(null);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};

const parseStoredDraft = (stored) => {
  if (!stored) return { ownerId: null, data: null, legacy: false };
  const parsed = JSON.parse(stored);
  if (parsed?.data && typeof parsed.data === 'object') {
    return {
      ownerId: typeof parsed.ownerId === 'string' ? parsed.ownerId : null,
      data: parsed.data,
      legacy: false,
    };
  }
  return { ownerId: null, data: parsed, legacy: true };
};

export const resolveStoredOnboardingDraft = (stored, user = null) => {
  const { ownerId, data, legacy } = parseStoredDraft(stored);
  const userId = user?.id || null;
  const userEmail = String(user?.email || '');

  if (legacy || (userId && ownerId !== userId) || (!userId && ownerId)) {
    return {
      ...INITIAL_FORM_DATA,
      adminEmail: userEmail,
      contactEmail: userEmail,
    };
  }

  return data
    ? { ...INITIAL_FORM_DATA, ...data, adminPassword: '', documents: [] }
    : {
      ...INITIAL_FORM_DATA,
      adminEmail: userEmail,
      contactEmail: userEmail,
    };
};

const readStoredData = (user) => {
  try {
    const stored = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
    return resolveStoredOnboardingDraft(stored, user);
  } catch {
    return resolveStoredOnboardingDraft(null, user);
  }
};

const readStoredStep = (user) => {
  try {
    const { ownerId, legacy } = parseStoredDraft(sessionStorage.getItem(ONBOARDING_STORAGE_KEY));
    const userId = user?.id || null;
    if (legacy || (userId && ownerId !== userId) || (!userId && ownerId)) {
      return userId ? 1 : 0;
    }
    const stored = Number.parseInt(sessionStorage.getItem(ONBOARDING_STEP_KEY), 10);
    return Number.isInteger(stored) && stored >= 0 && stored < ONBOARDING_STEPS.length ? stored : 0;
  } catch {
    return user ? 1 : 0;
  }
};

export const OnboardingProvider = ({ children, correctionMode = false }) => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const submittingRef = useRef(false);
  const correctionLoadedRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(() => readStoredStep(user));
  const [formData, setFormData] = useState(() => readStoredData(user));
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
  const [isPreparingCorrection, setIsPreparingCorrection] = useState(correctionMode);

  useEffect(() => {
    if (!correctionMode || !user || correctionLoadedRef.current) return;
    correctionLoadedRef.current = true;
    setIsPreparingCorrection(true);
    setFlowError('');

    onboardingService.getCorrectionDraft()
      .then((draft) => {
        setFormData({
          ...INITIAL_FORM_DATA,
          ...draft,
          adminEmail: user.email || '',
          adminFullName: profile?.full_name || profile?.username || '',
          documents: [],
          termsAccepted: false,
        });
        setStepValidity({
          account: true,
          organization: true,
          essentials: true,
          review: false,
        });
        setDirection(1);
        setCurrentStep(3);
      })
      .catch((error) => {
        setFlowError(error.message);
      })
      .finally(() => {
        setIsPreparingCorrection(false);
      });
  }, [correctionMode, profile?.full_name, profile?.username, user]);

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
      sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        ownerId: user?.id || null,
        data: persisted,
      }));
    } catch {
      // Registration remains usable when browser storage is unavailable.
    }
  }, [formData, user?.id]);

  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_STEP_KEY, String(currentStep));
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
    const minimumStep = correctionMode ? 3 : user ? 1 : 0;
    if (currentStep <= minimumStep) return;
    setDirection(-1);
    setCurrentStep((step) => step - 1);
  }, [correctionMode, currentStep, user]);

  const goToStep = useCallback((stepIndex) => {
    const minimumStep = correctionMode ? 3 : user ? 1 : 0;
    if (stepIndex < minimumStep || stepIndex >= currentStep) return;
    setDirection(-1);
    setCurrentStep(stepIndex);
  }, [correctionMode, currentStep, user]);

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
        clearOnboardingDraftStorage();
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
    correctionMode,
    isPreparingCorrection,
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
    correctionMode,
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
    isPreparingCorrection,
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
