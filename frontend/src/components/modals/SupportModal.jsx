
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { X, HelpCircle, Send, MessageSquare, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { createSupportTicket } from '../../services/supportTicketsService';
import { useAuth } from '../../contexts/AuthContext';

export const SupportModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        message: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject.trim() || !formData.message.trim()) return;

        setLoading(true);

        try {
            await createSupportTicket({
                user_id: user.id,
                subject: formData.subject,
                message: formData.message,
                status: 'open',
                category: 'general',
                priority: 'normal'
            });

            toast.success("Support ticket created!");
            setFormData({ subject: '', message: '' });
            onClose();
        } catch (error) {
            console.error('Error creating ticket:', error);
            handleApiError(error, 'submit');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-background/95 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-border/10 flex justify-between items-center bg-blue-500/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                    <HelpCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">Help & Support</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">We're here to help you</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-colors p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Subject</Label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                                        className="pl-10 h-12 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-blue-500"
                                        placeholder="What do you need help with?"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Message</Label>
                                <Textarea
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                                    className="min-h-[120px] p-4 rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-blue-500 resize-none"
                                    placeholder="Describe your issue in detail..."
                                />
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/30 flex items-start gap-3">
                                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold">Email Updates</p>
                                    <p className="text-xs text-muted-foreground">We'll send the response to your registered email.</p>
                                </div>
                            </div>

                            <Button type="submit" disabled={loading} className="w-full rounded-2xl h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <span className="flex items-center gap-2">
                                        <Send className="w-4 h-4" /> Send Request
                                    </span>
                                )}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
