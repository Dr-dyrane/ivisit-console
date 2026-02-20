/**
 * @fileoverview OnboardingWizard - Responsive multi-step registration wizard
 * 
 * @description
 * Main wizard component for organization registration with:
 * - Desktop: Side-by-side bento layout (progress sidebar + form)
 * - Mobile: Vertical layout with progress dots
 * - Apple-style animations and focus states
 * 
 * @usage
 * Must be wrapped in OnboardingProvider:
 * <OnboardingProvider>
 *   <OnboardingWizard />
 * </OnboardingProvider>
 * 
 * @rollback
 * To revert to previous version:
 * 1. git checkout HEAD~1 -- src/components/onboarding/OnboardingWizard.jsx
 * 2. Remove OnboardingContext.jsx if not needed
 * 
 * @author iVisit Console Team
 * @version 2.0.0 - Responsive bento layout
 * @since 2026-02-02
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Building2,
    Users,
    Stethoscope,
    Ambulance,
    Shield,
    Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { useOnboarding, ONBOARDING_STEPS } from '../../contexts/OnboardingContext';

// Step components
import { OrganizationTypeStep } from './OrganizationTypeStep';
import { OrganizationDetailsStep } from './OrganizationDetailsStep';
import { AdminAccountStep } from './AdminAccountStep';
import { InitialSetupStep } from './InitialSetupStep';
import { VerificationStep } from './VerificationStep';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Icons for each step
 */
const STEP_ICONS = {
    type: Building2,
    details: Users,
    account: Stethoscope,
    setup: Ambulance,
    verify: Shield,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * ProgressSidebar - Desktop step navigation
 * Shows all steps with completion status and allows clicking to navigate
 */
const ProgressSidebar = () => {
    const {
        currentStep,
        stepValidity,
        goToStep,
        steps
    } = useOnboarding();

    return (
        <div className="hidden lg:flex flex-col gap-2 p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                Registration Steps
            </h3>
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isAccessible = index <= currentStep || stepValidity[steps[index - 1]?.id];
                const Icon = STEP_ICONS[step.id];

                return (
                    <motion.button
                        key={step.id}
                        onClick={() => isAccessible && goToStep(index)}
                        disabled={!isAccessible}
                        className={`
                            group relative flex items-center gap-3 p-3 rounded-xl text-left transition-all
                            ${isCurrent
                                ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10'
                                : isCompleted
                                    ? 'bg-muted/30 hover:bg-muted/50'
                                    : 'opacity-40 cursor-not-allowed'}
                        `}
                        whileHover={isAccessible ? { scale: 1.02 } : {}}
                        whileTap={isAccessible ? { scale: 0.98 } : {}}
                    >
                        {/* Step number/check */}
                        <div className={`
                            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                            ${isCurrent
                                ? 'bg-primary text-primary-foreground'
                                : isCompleted
                                    ? 'bg-green-500 text-white'
                                    : 'bg-muted text-muted-foreground'}
                        `}>
                            {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                        </div>

                        {/* Step info */}
                        <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                                {step.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {step.description}
                            </p>
                        </div>

                        {/* Icon */}
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />

                        {/* Active indicator line - centered vertically */}
                        {isCurrent && (
                            <motion.div
                                layoutId="activeStep"
                                className="absolute left-0 inset-y-0 my-auto w-1 h-8 bg-primary rounded-r-full"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
};

/**
 * MobileProgress - Dots for mobile view
 */
const MobileProgress = () => {
    const { currentStep, steps } = useOnboarding();

    return (
        <div className="flex lg:hidden justify-center items-center gap-2 py-4">
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                    <motion.div
                        key={step.id}
                        className={`
                            relative flex items-center justify-center h-2 rounded-full
                            transition-all duration-300
                            ${isCompleted ? 'bg-primary' : isCurrent ? 'bg-primary' : 'bg-muted-foreground/30'}
                        `}
                        animate={{ width: isCurrent ? 32 : 8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {isCompleted && (
                            <Check className="w-1.5 h-1.5 text-primary-foreground" />
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
};

/**
 * StepContent - Renders the current step component with animations
 */
const StepContent = () => {
    const {
        currentStep,
        currentStepConfig,
        direction,
        formData,
        updateFormData,
        setStepValid
    } = useOnboarding();

    const slideVariants = {
        enter: (dir) => ({
            x: dir > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (dir) => ({
            x: dir < 0 ? 100 : -100,
            opacity: 0,
        }),
    };

    // Memoize the setStepValid callback to prevent infinite re-renders
    const handleSetStepValid = React.useCallback((isValid) => {
        setStepValid(currentStepConfig.id, isValid);
    }, [setStepValid, currentStepConfig.id]);

    const stepProps = {
        formData,
        updateFormData,
        setStepValid: handleSetStepValid,
    };

    const renderStep = () => {
        switch (currentStepConfig.id) {
            case 'type':
                return <OrganizationTypeStep {...stepProps} />;
            case 'details':
                return <OrganizationDetailsStep {...stepProps} />;
            case 'account':
                return <AdminAccountStep {...stepProps} />;
            case 'setup':
                return <InitialSetupStep {...stepProps} />;
            case 'verify':
                return <VerificationStep {...stepProps} />;
            default:
                return null;
        }
    };

    return (
        <AnimatePresence mode="wait" custom={direction}>
            <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full"
            >
                {/* Step header - mobile only */}
                <div className="lg:hidden text-center mb-6">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl font-bold text-foreground"
                    >
                        {currentStepConfig.title}
                    </motion.h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {currentStepConfig.description}
                    </p>
                </div>

                {renderStep()}
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * NavigationButtons - Back/Continue buttons
 */
const NavigationButtons = () => {
    const {
        isFirstStep,
        isLastStep,
        isCurrentStepValid,
        isSubmitting,
        goPrev,
        goNext,
        skipOnboarding,
        createAdminAccount,
        submitOnboarding,
        currentStepConfig,
    } = useOnboarding();

    const handleContinue = async () => {
        if (isLastStep) {
            submitOnboarding();
        } else if (currentStepConfig?.id === 'account') {
            // Step 2: Create admin account before continuing
            // This authenticates the user and sets onboarding_status = 'pending'
            await createAdminAccount();
            // goNext is called inside createAdminAccount on success
        } else {
            goNext();
        }
    };

    // Hide footer on first step (type selection uses play button for continue)
    if (isFirstStep) {
        return null;
    }

    return (
        <div className="flex justify-between items-center pt-6 border-t border-border/30">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={goPrev}
                    disabled={isSubmitting}
                    className="gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>

                {/* Skip option for users with identity (Step 3+) */}
                {currentStepConfig?.id !== 'type' && currentStepConfig?.id !== 'account' && (
                    <button
                        onClick={skipOnboarding}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                    >
                        Skip for now
                    </button>
                )}
            </div>

            <Button
                onClick={handleContinue}
                disabled={!isCurrentStepValid || isSubmitting}
                className="gap-2 min-w-[120px]"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    <>
                        {isLastStep ? 'Submit' : 'Continue'}
                        {!isLastStep && <ChevronRight className="w-4 h-4" />}
                    </>
                )}
            </Button>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OnboardingWizard - Main wizard component
 * 
 * Responsive layout:
 * - Desktop (lg+): Side-by-side bento layout
 * - Mobile: Vertical with progress dots
 */
export const OnboardingWizard = () => {
    const { progressPercent } = useOnboarding();

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
            {/* Desktop: Progress Sidebar */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-4 glass-card-premium rounded-2xl overflow-hidden border border-white/10 shadow-premium">
                    {/* Progress bar */}
                    <div className="h-1 bg-white/5">
                        <motion.div
                            className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        />
                    </div>
                    <ProgressSidebar />
                </div>
            </aside>

            {/* Mobile: Progress Dots */}
            <MobileProgress />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col">
                <div className="h-auto bg-background/80 dark:bg-white/[0.02] backdrop-blur-xl rounded-2xl p-6 lg:p-8">
                    {/* Desktop: Step Header */}
                    <div className="hidden lg:block mb-8">
                        <StepHeader />
                    </div>

                    {/* Step Content - Full width for card-based steps */}
                    <div className="w-full">
                        <StepContent />
                    </div>

                    {/* Navigation - Hidden on first step */}
                    <div className="w-full mt-8">
                        <NavigationButtons />
                    </div>
                </div>
            </main>
        </div>
    );
};

/**
 * StepHeader - Desktop step title with icon
 */
const StepHeader = () => {
    const { currentStepConfig } = useOnboarding();
    const Icon = STEP_ICONS[currentStepConfig.id];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 pb-6 border-b border-border/30"
        >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-foreground">
                    {currentStepConfig.title}
                </h2>
                <p className="text-muted-foreground">
                    {currentStepConfig.description}
                </p>
            </div>
        </motion.div>
    );
};

export default OnboardingWizard;
