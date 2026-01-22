import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default", // default, destructive, warning
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'destructive':
                return <AlertTriangle className="h-6 w-6 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-warning" />;
            default:
                return <Info className="h-6 w-6 text-primary" />;
        }
    };

    const getButtonVariant = () => {
        switch (variant) {
            case 'destructive':
                return "destructive";
            case 'warning':
                return "warning"; // Assuming warning variant exists, or fallback
            default:
                return "default";
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[32px] bg-background/90 backdrop-blur-xl shadow-2xl border border-white/10 ring-1 ring-white/20"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className={`p-4 rounded-full mb-4 ${variant === 'destructive' ? 'bg-destructive/10' :
                                variant === 'warning' ? 'bg-warning/10' : 'bg-primary/10'
                                }`}>
                                {getIcon()}
                            </div>

                            <h3 id="modal-title" className="text-xl font-semibold tracking-tight text-foreground mb-2">
                                {title}
                            </h3>

                            <p className="text-sm text-muted-foreground mb-6">
                                {description}
                            </p>

                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 rounded-2xl font-medium hover:bg-muted/50"
                                    disabled={isLoading}
                                >
                                    {cancelLabel}
                                </Button>
                                <Button
                                    variant={getButtonVariant()}
                                    onClick={onConfirm}
                                    className="flex-1 rounded-2xl font-bold shadow-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Processing...' : confirmLabel}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
