'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Bed, Users, Stethoscope, Truck, MapPin, Plus, X } from 'lucide-react';
import { Button } from '../ui/button';

// Predefined options
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
    { id: 'basic', name: 'Basic Life Support (BLS)', description: 'Standard transport' },
    { id: 'advanced', name: 'Advanced Life Support (ALS)', description: 'Critical care capable' },
    { id: 'critical', name: 'Mobile ICU', description: 'Intensive care transport' },
];

/**
 * InitialSetupStep - Type-specific setup
 * Different forms based on organization type
 */
export const InitialSetupStep = ({ formData, updateFormData, setStepValid }) => {
    const [customDepartment, setCustomDepartment] = useState('');
    const hasSetValidRef = useRef(false);

    // Always valid for this step (optional setup) - only set once
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

    // Render based on organization type
    const renderHospitalClinicSetup = () => (
        <div className="space-y-6">
            {/* Departments (Hospital only) */}
            {formData.organizationType === 'hospital' && (
                <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Departments
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {HOSPITAL_DEPARTMENTS.map((dept) => {
                            const isSelected = formData.departments?.includes(dept);
                            return (
                                <Badge
                                    key={dept}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="cursor-pointer transition-all"
                                    onClick={() => toggleArrayItem('departments', dept)}
                                >
                                    {dept}
                                    {isSelected && <X className="w-3 h-3 ml-1" />}
                                </Badge>
                            );
                        })}
                    </div>
                    {/* Custom department input */}
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
                </div>
            )}

            {/* Specialties */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    Medical Specialties
                </Label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {SPECIALTIES.map((spec) => {
                        const isSelected = formData.specialties?.includes(spec);
                        return (
                            <Badge
                                key={spec}
                                variant={isSelected ? 'default' : 'outline'}
                                className="cursor-pointer transition-all"
                                onClick={() => toggleArrayItem('specialties', spec)}
                            >
                                {spec}
                                {isSelected && <X className="w-3 h-3 ml-1" />}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Bed Capacity (Hospital only) */}
            {formData.organizationType === 'hospital' && (
                <div className="space-y-2">
                    <Label htmlFor="beds" className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                        Total Bed Capacity
                    </Label>
                    <Input
                        id="beds"
                        type="number"
                        min="0"
                        placeholder="e.g., 100"
                        value={formData.bedCapacity || ''}
                        onChange={(e) => updateFormData({ bedCapacity: parseInt(e.target.value) || 0 })}
                    />
                </div>
            )}
        </div>
    );

    const renderAmbulanceSetup = () => (
        <div className="space-y-6">
            {/* Fleet Size */}
            <div className="space-y-2">
                <Label htmlFor="fleet" className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Fleet Size
                </Label>
                <Input
                    id="fleet"
                    type="number"
                    min="1"
                    placeholder="Number of ambulances"
                    value={formData.fleetSize || ''}
                    onChange={(e) => updateFormData({ fleetSize: parseInt(e.target.value) || 0 })}
                />
            </div>

            {/* Vehicle Types */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    Vehicle Types
                </Label>
                <div className="space-y-2">
                    {VEHICLE_TYPES.map((vehicle) => {
                        const isSelected = formData.vehicleTypes?.includes(vehicle.id);
                        return (
                            <div
                                key={vehicle.id}
                                onClick={() => toggleArrayItem('vehicleTypes', vehicle.id)}
                                className={`
                                    p-3 rounded-xl cursor-pointer transition-all
                                    ${isSelected
                                        ? 'bg-primary/10 border border-primary/30 shadow-lg shadow-primary/5'
                                        : 'bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-primary/20'}
                                `}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{vehicle.name}</p>
                                        <p className="text-sm text-muted-foreground">{vehicle.description}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <X className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Coverage Area */}
            <div className="space-y-2">
                <Label htmlFor="coverage" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Coverage Area
                </Label>
                <Input
                    id="coverage"
                    placeholder="e.g., Lagos Island, Victoria Island, Ikoyi"
                    value={formData.coverageArea || ''}
                    onChange={(e) => updateFormData({ coverageArea: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                    List the areas your service covers
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-6">
                Configure your {formData.organizationType?.replace('_', ' ')}
                <br />
                <span className="text-xs">(You can update these later)</span>
            </p>

            {formData.organizationType === 'ambulance_service'
                ? renderAmbulanceSetup()
                : renderHospitalClinicSetup()}
        </div>
    );
};

export default InitialSetupStep;
