import { useState, useEffect, useCallback } from 'react';
import { 
  getSubscribers, 
  createSubscriber, 
  createSubscriberWithWelcome,
  updateSubscriber, 
  deleteSubscriber,
  updateSubscriberStatus,
  updateSubscriberType,
  markWelcomeEmailSent,
  getSubscriptionAnalytics,
  subscribeToSubscribers,
  sendWelcomeToSubscriber
} from '../services/subscriptionService';
import { toast } from 'sonner';

export const useSubscription = (options = {}) => {
  const {
    autoFetch = true,
    autoSubscribe = true,
  } = options;
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscribers
  const fetchSubscribers = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscribers(filters);
      setSubscribers(data);
    } catch (err) {
      setError(err.message);
      if (!filters?.quiet) {
        toast.error('Failed to fetch subscribers');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create subscriber
  const createNewSubscriber = useCallback(async (subscriberData) => {
    try {
      const newSubscriber = subscriberData.sendWelcomeEmail
        ? await createSubscriberWithWelcome(subscriberData)
        : await createSubscriber(subscriberData);
      setSubscribers(prev => [newSubscriber, ...prev]);
      toast.success(subscriberData.sendWelcomeEmail ? 'Subscriber created and welcome processed' : 'Subscriber created');
      
      return newSubscriber;
    } catch (err) {
      toast.error('Failed to create subscriber');
      throw err;
    }
  }, []);

  // Update subscriber
  const updateExistingSubscriber = useCallback(async (id, updates) => {
    try {
      const updatedSubscriber = await updateSubscriber(id, updates);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      toast.error('Failed to update subscriber');
      throw err;
    }
  }, []);

  // Delete subscriber
  const deleteExistingSubscriber = useCallback(async (id) => {
    try {
      await deleteSubscriber(id);
      setSubscribers(prev => prev.filter(sub => sub.id !== id));
    } catch (err) {
      toast.error('Failed to delete subscriber');
      throw err;
    }
  }, []);

  // Update subscriber status
  const updateStatus = useCallback(async (id, status) => {
    try {
      const updatedSubscriber = await updateSubscriberStatus(id, status);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      toast.error('Failed to update subscriber status');
      throw err;
    }
  }, []);

  // Update subscriber type
  const updateType = useCallback(async (id, type) => {
    try {
      const updatedSubscriber = await updateSubscriberType(id, type);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      toast.error('Failed to update subscriber type');
      throw err;
    }
  }, []);

  // Mark welcome email as sent
  const markEmailSent = useCallback(async (id) => {
    try {
      const updatedSubscriber = await markWelcomeEmailSent(id);
      setSubscribers(prev => 
        prev.map(sub => sub.id === id ? updatedSubscriber : sub)
      );
      return updatedSubscriber;
    } catch (err) {
      toast.error('Failed to mark email as sent');
      throw err;
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      return await getSubscriptionAnalytics();
    } catch (err) {
      toast.error('Failed to fetch analytics');
      throw err;
    }
  }, []);

  // Send welcome email
  const sendWelcome = useCallback(async (subscriberId) => {
    try {
      const result = await sendWelcomeToSubscriber(subscriberId);
      setSubscribers(prev =>
        prev.map(sub => sub.id === subscriberId ? result.subscriber : sub)
      );
      toast.success(result.marked ? 'Welcome email sent' : 'Email sent, subscriber row not marked');
      return result;
    } catch (err) {
      toast.error('Failed to send welcome email');
      throw err;
    }
  }, []);

  // Real-time subscription to subscriber changes
  const subscribeToChanges = useCallback((callback) => {
    return subscribeToSubscribers((payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          setSubscribers(prev => [newRecord, ...prev]);
          if (callback) callback({ type: 'INSERT', data: newRecord });
          break;
        case 'UPDATE':
          setSubscribers(prev => 
            prev.map(sub => sub.id === newRecord.id ? newRecord : sub)
          );
          if (callback) callback({ type: 'UPDATE', data: newRecord, old: oldRecord });
          break;
        case 'DELETE':
          setSubscribers(prev => prev.filter(sub => sub.id !== oldRecord.id));
          if (callback) callback({ type: 'DELETE', data: oldRecord });
          break;
      }
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }

    fetchSubscribers({ quiet: true });
  }, [autoFetch, fetchSubscribers]);

  // Set up real-time subscription
  useEffect(() => {
    if (!autoSubscribe) return undefined;

    const unsubscribe = subscribeToChanges();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [autoSubscribe, subscribeToChanges]);

  return {
    // Data
    subscribers,
    loading,
    error,
    
    // Actions
    fetchSubscribers,
    createSubscriber: createNewSubscriber,
    updateSubscriber: updateExistingSubscriber,
    deleteSubscriber: deleteExistingSubscriber,
    updateStatus,
    updateType,
    markEmailSent,
    fetchAnalytics,
    sendWelcome,
    
    // Real-time
    subscribeToChanges,
    subscribeToNewSubscribers: subscribeToChanges,
  };
};
