/**
 * @fileoverview OrganizationTypeStep - Step 1: Select organization type
 * 
 * @description
 * First step of the onboarding wizard where users select their organization category:
 * - Hospital: Full-service medical facility with beds
 * - Clinic: Outpatient medical practice
 * - Ambulance Service: Emergency medical transport
 * 
 * @behavior
 * - Selection is required to proceed (step validity)
 * - Single selection only (radio-style)
 * - Large tappable cards with hover/tap feedback
 * 
 * @props
 * - formData: Current wizard form state
 * - updateFormData: Function to update form fields
 * - setStepValid: Function to set step validation state
 * 
 * @rollback
 * To revert: git checkout HEAD~1 -- src/components/onboarding/OrganizationTypeStep.jsx
 * 
 * @author iVisit Console Team
 * @version 1.0.0
 * @since 2026-02-02
 */

'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Stethoscope, Ambulance, Check } from 'lucide-react';

/**
 * Organization type options with icons and features
 * @constant {Array}
 */
const ORGANIZATION_TYPES = [
    {
        id: 'hospital',
        title: 'Hospital',
        description: 'Full-service medical facility with beds, emergency care, and multiple departments',
        icon: Building2,
        features: ['Emergency Department', 'Inpatient Beds', 'Multiple Specialties'],
    },
    {
        id: 'clinic',
        title: 'Clinic',
        description: 'Outpatient medical practice focused on specific specialties or primary care',
        icon: Stethoscope,
        features: ['Outpatient Care', 'Specialty Focus', 'Appointments'],
    },
    {
        id: 'ambulance_service',
        title: 'Ambulance Service',
        description: 'Emergency medical transport with trained responders and equipped vehicles',
        icon: Ambulance,
        features: ['Emergency Response', 'Medical Transport', 'Trained EMTs'],
    },
];

/**
 * OrganizationTypeStep - Select organization type
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.formData - Current form data
 * @param {Function} props.updateFormData - Update form data
 * @param {Function} props.setStepValid - Set step validity
 */
export const OrganizationTypeStep = ({ formData, updateFormData, setStepValid }) => {
    const selectedType = formData.organizationType;
    const prevValidRef = React.useRef(null);

    // Update validity when selection changes - use ref to prevent infinite loop
    useEffect(() => {
        const isValid = !!selectedType;

        // Only call setStepValid if validity actually changed
        if (prevValidRef.current !== isValid) {
            prevValidRef.current = isValid;
            setStepValid(isValid);
        }
    }, [selectedType, setStepValid]);

    const handleSelect = (typeId) => {
        updateFormData({ organizationType: typeId });
    };

    return (
        <div className="space-y-4">
            <p className="text-center text-muted-foreground mb-6">
                What type of healthcare organization are you registering?
            </p>

            <div className="grid gap-4">
                {ORGANIZATION_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    const Icon = type.icon;

                    return (
                        <motion.button
                            key={type.id}
                            onClick={() => handleSelect(type.id)}
                            className={`
                                relative w-full text-left p-6 rounded-2xl transition-all
                                ${isSelected
                                    ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/10'
                                    : 'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/20'}
                            `}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                                >
                                    <Check className="w-4 h-4 text-primary-foreground" />
                                </motion.div>
                            )}

                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className={`
                                    flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border
                                    ${isSelected
                                        ? 'bg-primary text-primary-foreground border-primary/50'
                                        : 'bg-muted/50 text-muted-foreground border-transparent'}
                                `}>
                                    <Icon className="w-6 h-6" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-lg text-foreground mb-1">
                                        {type.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {type.description}
                                    </p>

                                    {/* Features */}
                                    <div className="flex flex-wrap gap-2">
                                        {type.features.map((feature, i) => (
                                            <span
                                                key={i}
                                                className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default OrganizationTypeStep;
