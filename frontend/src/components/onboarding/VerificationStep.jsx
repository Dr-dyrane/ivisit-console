'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Upload, FileText, Check, AlertCircle, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';

/**
 * VerificationStep - Document upload and verification
 * Final step before submission
 */
export const VerificationStep = ({ formData, updateFormData, setStepValid, onSubmit }) => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const hasSetValidRef = useRef(false);

    // Step is always valid (documents are optional for faster onboarding) - only set once
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

    // Summary of what's being submitted
    const renderSummary = () => (
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 p-5 shadow-premium space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Registration Summary</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Please review your details</p>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Organization</span>
                    <span className="text-sm font-black text-foreground">{formData.organizationName}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</span>
                    <Badge variant="outline" className="squircle border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                        {formData.organizationType?.replace('_', ' ')}
                    </Badge>
                </div>
                <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admin</span>
                    <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{formData.adminEmail}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <p className="text-center text-muted-foreground mb-6">
                Almost there! Upload verification documents (optional).
            </p>

            {/* Summary */}
            {renderSummary()}

            {/* Document Upload */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Verification Documents
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                        relative border border-dashed rounded-xl p-8 text-center transition-all
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
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Drag & drop files here, or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        CAC Certificate, License, etc. (PDF, JPG, PNG)
                    </p>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(file.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    Remove
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="flex gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-medium">What happens next?</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Your registration will be reviewed by our team</li>
                        <li>• You'll receive a confirmation email within 24-48 hours</li>
                        <li>• Once verified, you'll have full access to iVisit Console</li>
                    </ul>
                </div>
            </div>

            {/* Note about pending status */}
            <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your organization will be in "Pending Verification" status until approved.
                    You can start exploring the dashboard immediately.
                </p>
            </div>
        </div>
    );
};

export default VerificationStep;
