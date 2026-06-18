/**
 * @fileoverview OrganizationTypeStep - Premium Bento Grid Design
 * 
 * @description
 * Step 1 of onboarding with premium UX:
 * - Bento grid layout (responsive, equal space)
 * - Smooth animations (no jank)
 * - No select state (advances immediately on confirm)
 * - Glass morphism effects
 * 
 * @author iVisit Console Team
 * @version 3.0.0 - Bento grid redesign
 * @since 2026-02-02
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Building2, Stethoscope, Ambulance, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useOnboarding } from '../../contexts/OnboardingContext';

// ============================================================================
// CONSTANTS
// ============================================================================

const ORGANIZATION_TYPES = [
    {
        id: 'hospital',
        title: 'Hospital',
        description: 'Full-service medical facility with emergency care, inpatient beds, and multiple departments.',
        icon: Building2,
        features: ['Emergency Dept', 'Inpatient Beds', 'Multiple Specialties'],
        accent: 'from-red-500/20 to-orange-500/20',
    },
    {
        id: 'clinic',
        title: 'Clinic',
        description: 'Outpatient medical practice focused on specific specialties or primary care services.',
        icon: Stethoscope,
        features: ['Outpatient Care', 'Specialty Focus', 'Appointments'],
        accent: 'from-blue-500/20 to-cyan-500/20',
    },
    {
        id: 'ambulance_service',
        title: 'Ambulance',
        description: 'Emergency medical transport with trained first responders and equipped vehicles.',
        icon: Ambulance,
        features: ['Emergency Response', 'Medical Transport', 'Trained EMTs'],
        accent: 'from-green-500/20 to-emerald-500/20',
    },
];

// ============================================================================
// ANIMATION CONFIG - Premium smooth springs
// ============================================================================

const spring = {
    type: 'spring',
    stiffness: 200,
    damping: 30,
    mass: 1,
};

const gentleSpring = {
    type: 'spring',
    stiffness: 150,
    damping: 25,
    mass: 0.8,
};

// ============================================================================
// COLLAPSED CARD (shown in grid)
// ============================================================================

const CollapsedCard = memo(({ type, onExpand }) => {
    const Icon = type.icon;

    return (
        <motion.button
            layoutId={`card-${type.id}`}
            onClick={() => onExpand(type.id)}
            className={`
                relative w-full aspect-square lg:aspect-[4/3] p-6 lg:p-8
                rounded-3xl overflow-hidden
                bg-gradient-to-br ${type.accent}
                backdrop-blur-xl
                flex flex-col items-center justify-center text-center
                cursor-pointer group
                transition-colors duration-300
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={spring}
        >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Icon */}
            <motion.div
                layoutId={`icon-${type.id}`}
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center mb-4 shadow-lg"
                transition={gentleSpring}
            >
                <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-foreground" />
            </motion.div>

            {/* Title */}
            <motion.h3
                layoutId={`title-${type.id}`}
                className="text-xl lg:text-2xl font-bold text-foreground"
                transition={gentleSpring}
            >
                {type.title}
            </motion.h3>

            {/* Hint */}
            <p className="text-xs text-muted-foreground/60 mt-2 group-hover:text-muted-foreground transition-colors">
                Tap to learn more
            </p>
        </motion.button>
    );
});

CollapsedCard.displayName = 'CollapsedCard';

// ============================================================================
// EXPANDED CARD (full view)
// ============================================================================

const ExpandedCard = memo(({ type, onConfirm, onBack }) => {
    const Icon = type.icon;

    return (
        <motion.div
            layoutId={`card-${type.id}`}
            className={`
                w-full p-8 lg:p-12
                rounded-3xl overflow-hidden
                bg-gradient-to-br ${type.accent}
                backdrop-blur-xl
            `}
            transition={spring}
        >
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                {/* Left: Icon + Title */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                    <motion.div
                        layoutId={`icon-${type.id}`}
                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl bg-background/80 backdrop-blur flex items-center justify-center mb-4 shadow-xl"
                        transition={gentleSpring}
                    >
                        <Icon className="w-12 h-12 lg:w-16 lg:h-16 text-foreground" />
                    </motion.div>

                    <motion.h3
                        layoutId={`title-${type.id}`}
                        className="text-3xl lg:text-4xl font-bold text-foreground"
                        transition={gentleSpring}
                    >
                        {type.title}
                    </motion.h3>
                </div>

                {/* Right: Content */}
                <div className="flex-1 space-y-6">
                    {/* Description */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.1 }}
                        className="text-base lg:text-lg text-muted-foreground leading-relaxed"
                    >
                        {type.description}
                    </motion.p>

                    {/* Features */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.15 }}
                        className="flex flex-wrap gap-2"
                    >
                        {type.features.map((feature, i) => (
                            <span
                                key={i}
                                className="px-4 py-2 rounded-full bg-background/60 backdrop-blur text-sm font-medium text-foreground"
                            >
                                {feature}
                            </span>
                        ))}
                    </motion.div>

                    {/* CTA - Spotify Play Button */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...spring, delay: 0.2 }}
                        className="pt-4 flex justify-center lg:justify-end"
                    >
                        <button
                            onClick={() => onConfirm(type.id)}
                            className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-transform"
                        >
                            <ArrowRight className="w-7 h-7 lg:w-8 lg:h-8 text-primary-foreground" />
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Back button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 lg:mt-0 lg:absolute lg:top-6 lg:left-6"
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </Button>
            </motion.div>
        </motion.div>
    );
});

ExpandedCard.displayName = 'ExpandedCard';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrganizationTypeStep = ({ formData, updateFormData, setStepValid }) => {
    const { goNext } = useOnboarding();
    const [expandedId, setExpandedId] = useState(null);
    const prevValidRef = useRef(null);

    // Always valid when expanded, but we advance immediately on confirm
    useEffect(() => {
        const isValid = !!formData.organizationType;
        if (prevValidRef.current !== isValid) {
            prevValidRef.current = isValid;
            setStepValid(isValid);
        }
    }, [formData.organizationType, setStepValid]);

    const handleExpand = useCallback((id) => {
        setExpandedId(id);
    }, []);

    const handleCollapse = useCallback(() => {
        setExpandedId(null);
    }, []);

    const handleConfirm = useCallback((id) => {
        updateFormData({ organizationType: id });
        // Small delay for visual feedback, then advance
        setTimeout(() => goNext(), 150);
    }, [updateFormData, goNext]);

    const expandedType = ORGANIZATION_TYPES.find(t => t.id === expandedId);

    return (
        <div className="w-full min-h-[400px] flex flex-col">
            {/* Header */}
            <AnimatePresence mode="wait">
                {!expandedId && (
                    <motion.div
                        key="header"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={gentleSpring}
                        className="text-center mb-8"
                    >
                        <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-2">
                            Select your organization type
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Choose the option that best describes your healthcare facility
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cards */}
            <LayoutGroup>
                <AnimatePresence mode="wait">
                    {expandedId ? (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={gentleSpring}
                            className="flex-1 flex items-center"
                        >
                            <ExpandedCard
                                type={expandedType}
                                onConfirm={handleConfirm}
                                onBack={handleCollapse}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={gentleSpring}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
                        >
                            {ORGANIZATION_TYPES.map((type) => (
                                <CollapsedCard
                                    key={type.id}
                                    type={type}
                                    onExpand={handleExpand}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </LayoutGroup>
        </div>
    );
};

export default OrganizationTypeStep;
