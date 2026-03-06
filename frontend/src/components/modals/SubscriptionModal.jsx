import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Crown, Users, Calendar, Globe, ChevronRight, Zap, Check, CheckSquare, Square, Send, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { getSubscribersForBulkEmail, sendBulkEmail, sendWelcomeEmail, sendCustomEmail } from '../../services/subscriptionService';

export const SubscriptionModal = ({ isOpen, onClose, subscriber, mode, onSave }) => {
  const [formData, setFormData] = useState({
    email: '',
    type: 'free',
    status: 'pending',
    subscription_date: new Date().toISOString().split('T')[0],
    sendWelcomeEmail: true,
    selectedSubscribers: [],
    bulkEmailMode: false,
    bulkEmailContent: '',
    bulkEmailSubject: '',
    bulkEmailRecipients: '',
    customEmailSubject: '',
    customEmailContent: '',
    selectedSubscriberForEmail: null,
    emailAction: 'custom', // 'custom' | 'welcome' | 'bulk'
    selectedEmailAction: 'sendCustom' // 'sendCustom' | 'sendWelcome' | 'sendBulk'
  });
  const [loading, setLoading] = useState(false);
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
  const [availableSubscribers, setAvailableSubscribers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (subscriber) {
      setFormData(prev => ({
        ...prev,
        ...subscriber,
        email: subscriber.email || '',
        type: subscriber.type || 'free',
        status: subscriber.status || 'pending',
        subscription_date: subscriber.subscription_date ?
          new Date(subscriber.subscription_date).toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0],
      }));
    } else if (mode === 'create' || mode === 'emailActions' || mode === 'bulk') {
      setFormData(prev => ({
        ...prev,
        email: '',
        type: 'free',
        status: 'pending',
        subscription_date: new Date().toISOString().split('T')[0],
        sendWelcomeEmail: true,
        selectedSubscribers: [],
        bulkEmailMode: false,
        bulkEmailContent: '',
        bulkEmailSubject: '',
        bulkEmailRecipients: '',
        customEmailSubject: '',
        customEmailContent: '',
        selectedSubscriberForEmail: null,
        emailAction: 'custom',
        selectedEmailAction: 'sendCustom'
      }));
    }
  }, [subscriber, mode]);

  useEffect(() => {
    if (isOpen && (mode === 'bulk' || mode === 'emailActions')) {
      loadSubscribers();
    }
  }, [isOpen, mode]);

  const loadSubscribers = async () => {
    try {
      const subscribers = await getSubscribersForBulkEmail();
      setAvailableSubscribers(subscribers);
    } catch (error) {
      console.error('Error loading subscribers:', error);
      handleApiError(error, 'fetch');
    }
  };

  const handleBulkEmailSubmit = async () => {
    if (formData.selectedSubscribers.length === 0) {
      toast.error('Please select at least one subscriber');
      return;
    }
    if (!formData.bulkEmailSubject?.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!formData.bulkEmailContent?.trim()) {
      toast.error('Please enter email content');
      return;
    }

    setBulkEmailLoading(true);
    try {
      const selectedSubscribersData = availableSubscribers.filter(sub =>
        formData.selectedSubscribers.includes(sub.id)
      );

      await sendBulkEmail(selectedSubscribersData, formData.bulkEmailSubject, formData.bulkEmailContent);
      toast.success(`Email sent to ${formData.selectedSubscribers.length} subscribers`);
      onClose();
    } catch (error) {
      console.error('Error sending bulk email:', error);
      handleApiError(error, 'submit');
    } finally {
      setBulkEmailLoading(false);
    }
  };

  const handleEmailActionsSubmit = async () => {
    if (formData.selectedEmailAction === 'sendCustom') {
      // Handle custom email to existing subscriber
      if (!formData.selectedSubscriberForEmail) {
        toast.error('Please select a subscriber');
        return;
      }
      if (!formData.customEmailSubject?.trim()) {
        toast.error('Please enter an email subject');
        return;
      }
      if (!formData.customEmailContent?.trim()) {
        toast.error('Please enter email content');
        return;
      }

      setLoading(true);
      try {
        const selectedSubscriber = availableSubscribers.find(sub => sub.id === formData.selectedSubscriberForEmail);
        await sendCustomEmail(selectedSubscriber, formData.customEmailSubject, formData.customEmailContent);
        toast.success(`Email sent to ${selectedSubscriber.email}`);
        onClose();
      } catch (error) {
        console.error('Error sending custom email:', error);
        toast.error('Failed to send email');
        handleApiError(error, 'submit');
      } finally {
        setLoading(false);
      }
    } else if (formData.selectedEmailAction === 'sendWelcome') {
      // Handle welcome email to existing subscriber
      if (!formData.selectedSubscriberForEmail) {
        toast.error('Please select a subscriber');
        return;
      }

      setLoading(true);
      try {
        const selectedSubscriber = availableSubscribers.find(sub => sub.id === formData.selectedSubscriberForEmail);
        await sendWelcomeEmail(selectedSubscriber.email);
        toast.success(`Welcome email sent to ${selectedSubscriber.email}`);
        onClose();
      } catch (error) {
        console.error('Error sending welcome email:', error);
        toast.error('Failed to send welcome email');
        handleApiError(error, 'submit');
      } finally {
        setLoading(false);
      }
    } else if (formData.selectedEmailAction === 'sendBulk') {
      // Handle bulk email to multiple subscribers
      await handleBulkEmailSubmit();
    }
  };

  const toggleSubscriberSelection = (subscriberId) => {
    setFormData(prev => ({
      ...prev,
      selectedSubscribers: prev.selectedSubscribers.includes(subscriberId)
        ? prev.selectedSubscribers.filter(id => id !== subscriberId)
        : [...prev.selectedSubscribers, subscriberId]
    }));
  };

  const toggleSelectAll = () => {
    const filteredSubscribers = filteredAvailableSubscribers();
    if (selectAll) {
      setFormData(prev => ({
        ...prev,
        selectedSubscribers: prev.selectedSubscribers.filter(id =>
          !filteredSubscribers.some(sub => sub.id === id)
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedSubscribers: [
          ...prev.selectedSubscribers.filter(id =>
            !filteredSubscribers.some(sub => sub.id === id)
          ),
          ...filteredSubscribers.map(sub => sub.id)
        ]
      }));
    }
    setSelectAll(!selectAll);
  };

  const filteredAvailableSubscribers = () => {
    return availableSubscribers.filter(subscriber =>
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'bulk') {
      await handleBulkEmailSubmit();
      return;
    }
    if (!formData.email.trim()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving subscriber:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Backdrop: Ultra-saturated blur focus */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal: Full-bleed on mobile via ios-sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 100 }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          className={`ios-material ios-sheet relative z-10 w-full ${mode === 'bulk' ? 'max-w-5xl' : 'max-w-lg'} max-h-[calc(100dvh-5rem)] md:max-h-[90vh] md:rounded-[40px] shadow-2xl border border-foreground/10 overflow-y-auto no-scrollbar`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 md:p-10 pb-2 md:pb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/15 rounded-2xl ios-bubble border-none">
                {mode === 'bulk' ? (
                  <Send className="h-6 w-6 text-primary" />
                ) : mode === 'bulk' ? (
                  <Send className="h-6 w-6 text-primary" />
                ) : mode === 'emailActions' ? (
                  <Mail className="h-6 w-6 text-primary" />
                ) : isViewMode ? (
                  <Mail className="h-6 w-6 text-primary" />
                ) : (
                  <Users className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-tighter leading-none">
                  {mode === 'bulk' ? 'Broadcast' : mode === 'emailActions' ? 'Email Actions' : isViewMode ? 'Details' : isEditMode ? 'Edit' : 'New Link'}
                </h2>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-50 mt-1">
                  System Registry v2
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-foreground/5 active:scale-90 transition-transform">
              <X className="h-5 w-5 opacity-40" />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (mode === 'bulk') {
              handleBulkEmailSubmit();
            } else if (mode === 'emailActions') {
              handleEmailActionsSubmit();
            } else {
              onSave(formData);
              onClose();
            }
          }} className="p-2 md:p-10 pt-1 md:pt-2 space-y-4 md:space-y-6">

            {mode === 'bulk' ? (
              <>
                {/* Email Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Broadcast_Subject</label>
                  <div className="ios-input-well rounded-2xl flex items-center px-5">
                    <Mail size={18} className="opacity-20" />
                    <input
                      className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                      placeholder="Subject line..."
                      value={formData.bulkEmailSubject}
                      onChange={(e) => setFormData({ ...formData, bulkEmailSubject: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email Content */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Message_Content</label>
                  <div className="ios-input-well rounded-2xl p-5">
                    <textarea
                      className="w-full bg-transparent border-none outline-none font-normal resize-none min-h-[120px] text-foreground placeholder:text-muted-foreground"
                      placeholder="Compose your broadcast message..."
                      value={formData.bulkEmailContent}
                      onChange={(e) => setFormData({ ...formData, bulkEmailContent: e.target.value })}
                    />
                  </div>
                </div>

                {/* Recipients Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold tracking-widest uppercase opacity-30">Target_Nodes ({formData.selectedSubscribers.length})</label>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-xs font-semibold text-primary opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {selectAll ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Search */}
                  <div className="ios-input-well rounded-2xl flex items-center px-5">
                    <Search size={18} className="opacity-20" />
                    <input
                      className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                      placeholder="Filter recipients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Recipients List */}
                  <div className="ios-bubble max-h-60 overflow-y-auto scrollbar-hide">
                    {filteredAvailableSubscribers().length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground opacity-40 text-sm">
                        {searchTerm ? 'No nodes found' : 'No available nodes'}
                      </div>
                    ) : (
                      <div className="divide-y divide-foreground/5">
                        {filteredAvailableSubscribers().map((subscriber) => (
                          <label
                            key={subscriber.id}
                            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.selectedSubscribers.includes(subscriber.id)}
                              onChange={() => toggleSubscriberSelection(subscriber.id)}
                            />
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${formData.selectedSubscribers.includes(subscriber.id)
                              ? 'bg-primary border-primary'
                              : 'border-foreground/20'
                              }`}>
                              {formData.selectedSubscribers.includes(subscriber.id) && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-normal truncate">{subscriber.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-40">
                                  {subscriber.type}
                                </span>
                                <span className="text-xs opacity-30">
                                  {new Date(subscriber.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : mode === 'emailActions' ? (
              <>
                {/* Action Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Select_Action</label>
                  <div className="relative flex p-1 bg-foreground/[0.05] rounded-xl border border-foreground/5">
                    <motion.div
                      className="absolute inset-y-1 bg-background rounded-[9px] shadow-sm w-1/3"
                      animate={{
                        x: formData.selectedEmailAction === 'sendCustom' ? 0 :
                          formData.selectedEmailAction === 'sendWelcome' ? '100%' : '200%',
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedEmailAction: 'sendCustom' })}
                      className={`relative z-10 w-1/3 py-2 text-xs font-semibold transition-colors ${formData.selectedEmailAction === 'sendCustom' ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Mail size={12} className="inline mr-1 mb-0.5" /> Custom
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedEmailAction: 'sendWelcome' })}
                      className={`relative z-10 w-1/3 py-2 text-xs font-semibold transition-colors ${formData.selectedEmailAction === 'sendWelcome' ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Users size={12} className="inline mr-1 mb-0.5" /> Welcome
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, selectedEmailAction: 'sendBulk' })}
                      className={`relative z-10 w-1/3 py-2 text-xs font-semibold transition-colors ${formData.selectedEmailAction === 'sendBulk' ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Send size={12} className="inline mr-1 mb-0.5" /> Bulk
                    </button>
                  </div>
                </div>

                {formData.selectedEmailAction === 'sendCustom' ? (
                  <>
                    {/* Subscriber Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Select_Subscriber</label>
                      <div className="ios-input-well rounded-2xl p-5">
                        <select
                          className="w-full bg-transparent border-none outline-none font-normal appearance-none text-foreground"
                          value={formData.selectedSubscriberForEmail || ''}
                          onChange={(e) => setFormData({ ...formData, selectedSubscriberForEmail: e.target.value })}
                        >
                          <option value="" className="bg-background">Choose a subscriber...</option>
                          {availableSubscribers.map((subscriber) => (
                            <option key={subscriber.id} value={subscriber.id} className="bg-background">
                              {subscriber.email} ({subscriber.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Email Subject */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Email_Subject</label>
                      <div className="ios-input-well rounded-2xl flex items-center px-5">
                        <Mail size={18} className="opacity-20" />
                        <input
                          className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                          placeholder="Subject line..."
                          value={formData.customEmailSubject}
                          onChange={(e) => setFormData({ ...formData, customEmailSubject: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Message_Content</label>
                      <div className="ios-input-well rounded-2xl p-5">
                        <textarea
                          className="w-full bg-transparent border-none outline-none font-normal resize-none min-h-[120px] text-foreground placeholder:text-muted-foreground"
                          placeholder="Compose your message..."
                          value={formData.customEmailContent}
                          onChange={(e) => setFormData({ ...formData, customEmailContent: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : formData.selectedEmailAction === 'sendWelcome' ? (
                  <>
                    {/* Subscriber Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Select_Subscriber</label>
                      <div className="ios-input-well rounded-2xl p-5">
                        <select
                          className="w-full bg-transparent border-none outline-none font-normal appearance-none text-foreground"
                          value={formData.selectedSubscriberForEmail || ''}
                          onChange={(e) => setFormData({ ...formData, selectedSubscriberForEmail: e.target.value })}
                        >
                          <option value="" className="bg-background">Choose a subscriber...</option>
                          {availableSubscribers.map((subscriber) => (
                            <option key={subscriber.id} value={subscriber.id} className="bg-background">
                              {subscriber.email} ({subscriber.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="ios-bubble p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Mail size={18} className="text-primary opacity-60" />
                        <span className="text-sm font-semibold tracking-tight">Send welcome email to selected subscriber</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This will send the standard welcome email template to the subscriber.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Bulk Email Form */}
                    {/* Email Subject */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Broadcast_Subject</label>
                      <div className="ios-input-well rounded-2xl flex items-center px-5">
                        <Mail size={18} className="opacity-20" />
                        <input
                          className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                          placeholder="Subject line..."
                          value={formData.bulkEmailSubject}
                          onChange={(e) => setFormData({ ...formData, bulkEmailSubject: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Message_Content</label>
                      <div className="ios-input-well rounded-2xl p-5">
                        <textarea
                          className="w-full bg-transparent border-none outline-none font-normal resize-none min-h-[120px] text-foreground placeholder:text-muted-foreground"
                          placeholder="Compose your broadcast message..."
                          value={formData.bulkEmailContent}
                          onChange={(e) => setFormData({ ...formData, bulkEmailContent: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Recipients Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold tracking-widest uppercase opacity-30">Target_Nodes ({formData.selectedSubscribers.length})</label>
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-xs font-semibold text-primary opacity-60 hover:opacity-100 transition-opacity"
                        >
                          {selectAll ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      {/* Search */}
                      <div className="ios-input-well rounded-2xl flex items-center px-5">
                        <Search size={18} className="opacity-20" />
                        <input
                          className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                          placeholder="Filter recipients..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Recipients List */}
                      <div className="ios-bubble max-h-60 overflow-y-auto scrollbar-hide">
                        {filteredAvailableSubscribers().length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground opacity-40 text-sm">
                            {searchTerm ? 'No nodes found' : 'No available nodes'}
                          </div>
                        ) : (
                          <div className="divide-y divide-foreground/5">
                            {filteredAvailableSubscribers().map((subscriber) => (
                              <label
                                key={subscriber.id}
                                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={formData.selectedSubscribers.includes(subscriber.id)}
                                  onChange={() => toggleSubscriberSelection(subscriber.id)}
                                />
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${formData.selectedSubscribers.includes(subscriber.id)
                                  ? 'bg-primary border-primary'
                                  : 'border-foreground/20'
                                  }`}>
                                  {formData.selectedSubscribers.includes(subscriber.id) && (
                                    <Check size={12} className="text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-normal truncate">{subscriber.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider opacity-40">
                                      {subscriber.type}
                                    </span>
                                    <span className="text-xs opacity-30">
                                      {new Date(subscriber.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Identity_Core</label>
                  <div className="ios-input-well rounded-2xl flex items-center px-5">
                    <Mail size={18} className="opacity-20" />
                    <input
                      disabled={isViewMode}
                      className="w-full bg-transparent border-none py-4 px-4 text-base outline-none font-normal text-foreground placeholder:text-muted-foreground"
                      placeholder="auth@ivisit.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Segmented Control for Subscription Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Access_Level</label>
                  <div className="relative flex p-1 bg-foreground/[0.05] rounded-xl border border-foreground/5">
                    <motion.div
                      className="absolute inset-y-1 bg-background rounded-[9px] shadow-sm"
                      animate={{ x: formData.type === 'free' ? "0%" : "100%", width: "50%" }}
                    />
                    <button
                      type="button"
                      disabled={isViewMode}
                      onClick={() => setFormData({ ...formData, type: 'free' })}
                      className={`relative z-10 w-1/2 py-2 text-xs font-semibold transition-colors ${formData.type === 'free' ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      Free Tier
                    </button>
                    <button
                      type="button"
                      disabled={isViewMode}
                      onClick={() => setFormData({ ...formData, type: 'paid' })}
                      className={`relative z-10 w-1/2 py-2 text-xs font-semibold transition-colors ${formData.type === 'paid' ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      <Crown size={12} className="inline mr-1 mb-0.5" /> Premium
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase opacity-30 ml-4">Status</label>
                  <select
                    disabled={isViewMode}
                    className="w-full ios-input-well rounded-2xl py-4 px-5 text-sm font-semibold appearance-none outline-none border-none bg-transparent text-foreground"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending" className="bg-background">Pending</option>
                    <option value="active" className="bg-background">Active</option>
                    <option value="unsubscribed" className="bg-background">Terminated</option>
                  </select>
                </div>

                {/* Welcome Email Toggle: Custom iOS Style */}
                {mode === 'create' && (
                  <label className="flex items-center justify-between p-5 ios-bubble cursor-pointer active:brightness-95">
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-primary opacity-60" />
                      <span className="text-sm font-semibold tracking-tight">Send Initialization Email</span>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.sendWelcomeEmail}
                      onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.sendWelcomeEmail ? 'bg-success' : 'bg-foreground/10'}`}>
                      <motion.div
                        animate={{ x: formData.sendWelcomeEmail ? 26 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </label>
                )}

                {/* Additional Info: Native Grouped List look */}
                {subscriber && mode !== 'create' && (
                  <div className="ios-bubble p-6 space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-widest opacity-40">
                      <span>Registry Info</span>
                      <Zap size={12} />
                    </div>
                    <div className="flex justify-between items-center text-sm font-normal">
                      <span className="opacity-60">Created</span>
                      <span>{new Date(subscriber.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-normal">
                      <span className="opacity-60">Email Status</span>
                      <span className={subscriber.welcome_email_sent ? 'text-success' : 'text-orange-500'}>
                        {subscriber.welcome_email_sent ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col md:flex-row items-center gap-3 pt-4">
              <Button type="button" onClick={onClose} className="w-full md:w-auto flex-1 bg-foreground/5 text-foreground hover:bg-foreground/10 rounded-2xl font-semibold py-6">
                Cancel
              </Button>
              {mode === 'bulk' ? (
                <Button
                  type="submit"
                  disabled={bulkEmailLoading || formData.selectedSubscribers.length === 0 || !formData.bulkEmailSubject?.trim() || !formData.bulkEmailContent?.trim()}
                  className="w-full md:w-auto flex-[2] bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] rounded-2xl py-6 shadow-xl shadow-primary/20"
                >
                  {bulkEmailLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Broadcasting...
                    </div>
                  ) : (
                    `Broadcast to ${formData.selectedSubscribers.length} Node${formData.selectedSubscribers.length === 1 ? '' : 's'}`
                  )}
                </Button>
              ) : mode === 'emailActions' ? (
                <Button
                  type="submit"
                  disabled={loading || (formData.selectedEmailAction === 'sendCustom' && (!formData.selectedSubscriberForEmail || !formData.customEmailSubject?.trim() || !formData.customEmailContent?.trim())) || (formData.selectedEmailAction === 'sendWelcome' && !formData.selectedSubscriberForEmail) || (formData.selectedEmailAction === 'sendBulk' && (formData.selectedSubscribers.length === 0 || !formData.bulkEmailSubject?.trim() || !formData.bulkEmailContent?.trim()))}
                  className="w-full md:w-auto flex-[2] bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] rounded-2xl py-6 shadow-xl shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {formData.selectedEmailAction === 'sendCustom' ? 'Sending...' : formData.selectedEmailAction === 'sendWelcome' ? 'Sending...' : 'Broadcasting...'}
                    </div>
                  ) : (
                    formData.selectedEmailAction === 'sendCustom' ? 'Send Custom Message' :
                      formData.selectedEmailAction === 'sendWelcome' ? 'Send Welcome Email' :
                        `Broadcast to ${formData.selectedSubscribers.length} Recipients`
                  )}
                </Button>
              ) : (
                !isViewMode && (
                  <Button
                    type="submit"
                    className="w-full md:w-auto flex-[2] bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] rounded-2xl py-6 shadow-xl shadow-primary/20"
                  >
                    {isEditMode ? 'Update Registry' : 'Initialize Node'}
                  </Button>
                )
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
