/**
 * @fileoverview VerificationStep - Premium Apple-standard design
 * 
 * @description
 * Final onboarding step with premium UX patterns:
 * - Progressive disclosure for summary sections
 * - Premium drag-and-drop zone with animations
 * - Section-based focus (blur inactive areas)
 * - Premium microinteractions
 * 
 * @author iVisit Console Team
 * @version 2.0.0 - Premium redesign
 * @since 2026-02-02
 */

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Upload, FileText, Check, AlertCircle, Shield, ChevronDown, X, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const sectionVariants = {
    inactive: {
        opacity: 0.5,
        filter: 'blur(1px)',
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

const revealVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
        opacity: 1,
        height: 'auto',
        transition: { type: 'spring', stiffness: 300, damping: 25 }
    },
};

const dropZoneVariants = {
    default: { scale: 1, borderColor: 'hsl(var(--border) / 0.5)' },
    dragover: {
        scale: 1.02,
        borderColor: 'hsl(var(--primary))',
        transition: { type: 'spring', stiffness: 400, damping: 25 }
    },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const VerificationStep = ({ formData, updateFormData, setStepValid, onSubmit }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeSection, setActiveSection] = useState('summary'); // 'summary' | 'upload' | 'info'
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const hasSetValidRef = useRef(false);

    // Step is always valid (documents are optional)
    useEffect(() => {
        if (!hasSetValidRef.current) {
            hasSetValidRef.current = true;
            setStepValid(true);
        }
    }, [setStepValid]);

    // Handle file upload
    const handleFileUpload = useCallback((files) => {
        const newFiles = Array.from(files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);
        updateFormData({ documents: [...(formData.documents || []), ...newFiles] });
    }, [formData.documents, updateFormData]);

    // Handle drag and drop
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files);
        }
    }, [handleFileUpload]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    // Remove file
    const removeFile = (fileId) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        updateFormData({
            documents: formData.documents?.filter(f => f.id !== fileId)
        });
    };

    // Format file size
    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getSectionState = (section) => (activeSection === section ? 'active' : 'inactive');

    // ========================================================================
    // Summary Section - Progressive Disclosure
    // ========================================================================
    const renderSummary = () => (
        <motion.div
            variants={sectionVariants}
            animate={getSectionState('summary')}
            className="relative overflow-hidden rounded-2xl bg-white/[0.03]  shadow-premium"
            onClick={() => setActiveSection('summary')}
        >
            {/* Header - Always visible */}
            <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="w-full flex items-center justify-between p-5 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Registration Summary</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">
                            {formData.organizationName} • {formData.organizationType?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: summaryExpanded ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
            </button>

            {/* Progressive Disclosure: Details */}
            <AnimatePresence>
                {summaryExpanded && (
                    <motion.div
                        variants={revealVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="px-5 pb-5 space-y-3 border-t border-white/5"
                    >
                        <div className="pt-4 space-y-3">
                            {[
                                { label: 'Organization', value: formData.organizationName },
                                { label: 'Type', value: formData.organizationType?.replace('_', ' '), badge: true },
                                { label: 'Admin', value: formData.adminEmail },
                                { label: 'Location', value: `${formData.city}, ${formData.state}` },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/5 border border-white/5"
                                >
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {item.label}
                                    </span>
                                    {item.badge ? (
                                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                                            {item.value}
                                        </Badge>
                                    ) : (
                                        <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                                            {item.value}
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    // ========================================================================
    // Upload Section - Premium Drag & Drop
    // ========================================================================
    const renderUpload = () => (
        <motion.div
            variants={sectionVariants}
            animate={getSectionState('upload')}
            className="space-y-3"
            onClick={() => setActiveSection('upload')}
        >
            <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Verification Documents
                <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>

            {/* Premium Drop Zone */}
            <motion.div
                variants={dropZoneVariants}
                animate={isDragOver ? 'dragover' : 'default'}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
                    ${isDragOver
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/30'}
                `}
            >
                <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <motion.div
                    animate={isDragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <div className={`
                        w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-colors
                        ${isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    `}>
                        <Upload className="w-8 h-8" />
                    </div>
                </motion.div>
                <p className="text-sm text-foreground font-medium">
                    Drag & drop files here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    or <span className="text-primary font-medium">browse</span> to upload
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-3">
                    CAC Certificate, License, etc. (PDF, JPG, PNG)
                </p>
            </motion.div>

            {/* Uploaded Files */}
            <AnimatePresence>
                {uploadedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {uploadedFiles.map((file, i) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(file.id)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    // ========================================================================
    // Info Section - What happens next
    // ========================================================================
    const renderInfo = () => (
        <motion.div
            variants={sectionVariants}
            animate={getSectionState('info')}
            className="space-y-4"
            onClick={() => setActiveSection('info')}
        >
            {/* What happens next */}
            <div className="flex gap-3 p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">What happens next?</p>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            Your registration will be reviewed by our team
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            Confirmation email within 24-48 hours
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            Full access to iVisit Console once verified
                        </li>
                    </ul>
                </div>
            </div>

            {/* Pending status note */}
            <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your organization will be in "Pending Verification" status until approved.
                    You can start exploring the dashboard immediately.
                </p>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-8">
                Almost there! Upload verification documents (optional).
            </p>

            {renderSummary()}
            {renderUpload()}
            {renderInfo()}
        </div>
    );
};

export default VerificationStep;
