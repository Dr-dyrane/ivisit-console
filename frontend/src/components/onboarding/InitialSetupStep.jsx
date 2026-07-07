/**
 * @fileoverview InitialSetupStep - Premium Apple-standard design
 * 
 * @description
 * Type-specific setup with premium UX patterns:
 * - Section-based focus (blur inactive sections)
 * - Horizontal card layout for vehicle types on desktop
 * - Progressive disclosure for optional setup
 * - Premium microinteractions
 * 
 * @author iVisit Console Team
 * @version 2.0.0 - Premium redesign
 * @since 2026-02-02
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Bed, Users, Stethoscope, Truck, MapPin, Plus, X, Check, Play } from 'lucide-react';
import { Button } from '../ui/button';

// ============================================================================
// CONSTANTS
// ============================================================================

const HOSPITAL_DEPARTMENTS = [
    'Emergency', 'Surgery', 'Pediatrics', 'Obstetrics', 'Cardiology',
    'Orthopedics', 'Neurology', 'Oncology', 'Radiology', 'ICU'
];

const SPECIALTIES = [
    'General Medicine', 'General Surgery', 'Pediatrics', 'Obstetrics & Gynecology',
    'Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Dermatology', 'ENT',
    'Ophthalmology', 'Psychiatry', 'Radiology', 'Anesthesiology', 'Pathology'
];

const VEHICLE_TYPES = [
    { id: 'basic', name: 'Basic Life Support', short: 'BLS', description: 'Standard transport' },
    { id: 'advanced', name: 'Advanced Life Support', short: 'ALS', description: 'Critical care capable' },
    { id: 'critical', name: 'Mobile ICU', short: 'ICU', description: 'Intensive care transport' },
];

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
};

const cardVariants = {
    default: { scale: 1, filter: 'blur(0px)', opacity: 1 },
    blurred: { scale: 0.97, filter: 'blur(0px)', opacity: 0.5 },
    focused: { scale: 1.02, filter: 'blur(0px)', opacity: 1 },
};

const playButtonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: { type: 'spring', stiffness: 400, damping: 20 }
    },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InitialSetupStep = ({ formData, updateFormData, setStepValid }) => {
    const [customDepartment, setCustomDepartment] = useState('');
    const [activeSection, setActiveSection] = useState(null);
    const [focusedVehicle, setFocusedVehicle] = useState(null);
    const hasSetValidRef = useRef(false);

    // Always valid for this step (optional setup)
    useEffect(() => {
        if (!hasSetValidRef.current) {
            hasSetValidRef.current = true;
            setStepValid(true);
        }
    }, [setStepValid]);

    const toggleArrayItem = (field, item) => {
        const current = formData[field] || [];
        const updated = current.includes(item)
            ? current.filter(i => i !== item)
            : [...current, item];
        updateFormData({ [field]: updated });
    };

    const addCustomDepartment = () => {
        if (customDepartment.trim()) {
            toggleArrayItem('departments', customDepartment.trim());
            setCustomDepartment('');
        }
    };

    const getSectionState = (section) => (activeSection === section ? 'active' : 'inactive');

    // ========================================================================
    // Hospital/Clinic Setup
    // ========================================================================
    const renderHospitalClinicSetup = () => (
        <div className="space-y-6">
            {/* Departments (Hospital only) */}
            {formData.organizationType === 'hospital' && (
                <motion.div
                    variants={sectionVariants}
                    animate={getSectionState('departments')}
                    className="space-y-3 p-4 rounded-card bg-muted/20"
                    onClick={() => setActiveSection('departments')}
                >
                    <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Departments
                        {(formData.departments?.length > 0) && (
                            <Badge variant="outline" className="ml-auto">
                                {formData.departments.length} selected
                            </Badge>
                        )}
                    </Label>
                    <AnimatePresence>
                        {activeSection === 'departments' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {HOSPITAL_DEPARTMENTS.map((dept, i) => {
                                        const isSelected = formData.departments?.includes(dept);
                                        return (
                                            <motion.div
                                                key={dept}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.02 }}
                                            >
                                                <Badge
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    className="cursor-pointer transition-all hover:scale-105"
                                                    onClick={() => toggleArrayItem('departments', dept)}
                                                >
                                                    {dept}
                                                    {isSelected && <X className="w-3 h-3 ml-1" />}
                                                </Badge>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add custom department"
                                        value={customDepartment}
                                        onChange={(e) => setCustomDepartment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomDepartment()}
                                    />
                                    <Button variant="outline" size="icon" onClick={addCustomDepartment}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {activeSection !== 'departments' && (
                        <p className="text-xs text-muted-foreground/50">Tap to expand</p>
                    )}
                </motion.div>
            )}

            {/* Specialties */}
            <motion.div
                variants={sectionVariants}
                animate={getSectionState('specialties')}
                className="space-y-3 p-4 rounded-card bg-muted/20"
                onClick={() => setActiveSection('specialties')}
            >
                <Label className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    Medical Specialties
                    {(formData.specialties?.length > 0) && (
                        <Badge variant="outline" className="ml-auto">
                            {formData.specialties.length} selected
                        </Badge>
                    )}
                </Label>
                <AnimatePresence>
                    {activeSection === 'specialties' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-wrap gap-2 max-h-48 overflow-y-auto"
                        >
                            {SPECIALTIES.map((spec, i) => {
                                const isSelected = formData.specialties?.includes(spec);
                                return (
                                    <motion.div
                                        key={spec}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.015 }}
                                    >
                                        <Badge
                                            variant={isSelected ? 'default' : 'outline'}
                                            className="cursor-pointer transition-all hover:scale-105"
                                            onClick={() => toggleArrayItem('specialties', spec)}
                                        >
                                            {spec}
                                            {isSelected && <X className="w-3 h-3 ml-1" />}
                                        </Badge>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
                {activeSection !== 'specialties' && (
                    <p className="text-xs text-muted-foreground/50">Tap to expand</p>
                )}
            </motion.div>

            {/* Bed Capacity (Hospital only) */}
            {formData.organizationType === 'hospital' && (
                <motion.div
                    variants={sectionVariants}
                    animate={getSectionState('beds')}
                    className="space-y-2 p-4 rounded-card bg-muted/20"
                >
                    <Label htmlFor="beds" className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                        Total Bed Capacity
                        {formData.bedCapacity > 0 && (
                            <Check className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                    </Label>
                    <Input
                        id="beds"
                        type="number"
                        min="0"
                        placeholder="e.g., 100"
                        value={formData.bedCapacity || ''}
                        onChange={(e) => updateFormData({ bedCapacity: parseInt(e.target.value) || 0 })}
                        onFocus={() => setActiveSection('beds')}
                    />
                </motion.div>
            )}
        </div>
    );

    // ========================================================================
    // Ambulance Setup - Premium Horizontal Cards
    // ========================================================================
    const renderAmbulanceSetup = () => (
        <div className="space-y-6">
            {/* Fleet Size */}
            <motion.div
                variants={sectionVariants}
                animate={getSectionState('fleet')}
                className="space-y-2 p-4 rounded-card bg-muted/20"
            >
                <Label htmlFor="fleet" className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Fleet Size
                    {formData.fleetSize > 0 && (
                        <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                </Label>
                <Input
                    id="fleet"
                    type="number"
                    min="1"
                    placeholder="Number of ambulances"
                    value={formData.fleetSize || ''}
                    onChange={(e) => updateFormData({ fleetSize: parseInt(e.target.value) || 0 })}
                    onFocus={() => setActiveSection('fleet')}
                />
            </motion.div>

            {/* Vehicle Types - Horizontal Cards */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2 px-4">
                    Vehicle Types
                    {(formData.vehicleTypes?.length > 0) && (
                        <Badge variant="outline" className="ml-2">
                            {formData.vehicleTypes.length} selected
                        </Badge>
                    )}
                </Label>
                <div className="flex flex-col lg:flex-row gap-4">
                    {VEHICLE_TYPES.map((vehicle) => {
                        const isSelected = formData.vehicleTypes?.includes(vehicle.id);
                        const isFocused = focusedVehicle === vehicle.id;
                        const isBlurred = focusedVehicle !== null && !isFocused;

                        return (
                            <motion.div
                                key={vehicle.id}
                                className="flex-1"
                                variants={cardVariants}
                                animate={isBlurred ? 'blurred' : isFocused ? 'focused' : 'default'}
                            >
                                <motion.button
                                    onClick={() => isFocused && toggleArrayItem('vehicleTypes', vehicle.id)}
                                    onMouseEnter={() => setFocusedVehicle(vehicle.id)}
                                    onMouseLeave={() => setFocusedVehicle(null)}
                                    onTouchStart={() => setFocusedVehicle(vehicle.id)}
                                    className={`
                                        relative w-full text-left p-5 lg:p-6 rounded-card transition-colors
                                        ${isSelected
                                            ? 'bg-muted/60 shadow-lg'
                                            : isFocused
                                                ? 'bg-muted/50'
                                                : 'bg-muted/30'}
                                    `}
                                >
                                    {/* Selection Check */}
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute top-3 right-3 w-6 h-6 rounded-pill bg-foreground flex items-center justify-center"
                                        >
                                            <Check className="w-3 h-3 text-background" />
                                        </motion.div>
                                    )}

                                    <div className="flex flex-col items-center text-center">
                                        {/* Short Name */}
                                        <div className={`
                                            w-14 h-14 rounded-icon flex items-center justify-center mb-3 text-xl font-bold transition-colors
                                            ${isSelected
                                                ? 'bg-foreground text-background'
                                                : isFocused
                                                    ? 'bg-muted text-foreground'
                                                    : 'bg-muted text-muted-foreground'}
                                        `}>
                                            {vehicle.short}
                                        </div>

                                        {/* Name */}
                                        <h4 className="font-semibold text-foreground mb-1">
                                            {vehicle.name}
                                        </h4>

                                        {/* Progressive Disclosure: Description */}
                                        <AnimatePresence>
                                            {(isFocused || isSelected) && (
                                                <motion.p
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="text-sm text-muted-foreground mb-3"
                                                >
                                                    {vehicle.description}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>

                                        {/* Spotify Play Button */}
                                        <AnimatePresence>
                                            {isFocused && !isSelected && (
                                                <motion.div
                                                    variants={playButtonVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="hidden"
                                                >
                                                    <div className="w-12 h-12 rounded-pill bg-foreground flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                                                        <Play className="w-5 h-5 text-background ml-0.5" fill="currentColor" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Hint */}
                                        {!isFocused && !isSelected && (
                                            <p className="text-xs text-muted-foreground/40 mt-1">Tap to select</p>
                                        )}
                                    </div>
                                </motion.button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Coverage Area */}
            <motion.div
                variants={sectionVariants}
                animate={getSectionState('coverage')}
                className="space-y-2 p-4 rounded-card bg-muted/20"
            >
                <Label htmlFor="coverage" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Coverage Area
                    {formData.coverageArea && (
                        <Check className="w-4 h-4 text-green-500 ml-auto" />
                    )}
                </Label>
                <Input
                    id="coverage"
                    placeholder="e.g., Lagos Island, Victoria Island, Ikoyi"
                    value={formData.coverageArea || ''}
                    onChange={(e) => updateFormData({ coverageArea: e.target.value })}
                    onFocus={() => setActiveSection('coverage')}
                />
                <p className="text-xs text-muted-foreground">
                    List the areas your service covers
                </p>
            </motion.div>
        </div>
    );

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-8">
                Configure your {formData.organizationType?.replace('_', ' ')}
                <br />
                <span className="text-xs opacity-60">(You can update these later)</span>
            </p>

            {formData.organizationType === 'ambulance_service'
                ? renderAmbulanceSetup()
                : renderHospitalClinicSetup()}
        </div>
    );
};

export default InitialSetupStep;
