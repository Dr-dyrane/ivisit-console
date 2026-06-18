import { useState, useEffect, useCallback } from 'react';
import { 
  getSupportTickets, 
  createSupportTicket, 
  updateSupportTicket, 
  deleteSupportTicket,
  updateTicketStatus,
  assignTicket,
  getSupportTicketsAnalytics,
  subscribeToSupportTickets
} from '../services/supportTicketsService';

export const useSupportTickets = () => {
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Fetch support tickets
  const fetchSupportTickets = useCallback(async (filter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSupportTickets(filter);
      setSupportTickets(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch support tickets');
      console.error('Error fetching support tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create support ticket
  const createTicket = useCallback(async (ticketData) => {
    try {
      const newTicket = await createSupportTicket(ticketData);
      setSupportTickets((prev) => [newTicket, ...prev]);
      return newTicket;
    } catch (err) {
      setError(err.message || 'Failed to create support ticket');
      throw err;
    }
  }, []);

  // Update support ticket
  const updateTicket = useCallback(async (id, updates) => {
    try {
      const updatedTicket = await updateSupportTicket(id, updates);
      setSupportTickets((prev) => 
        prev.map((ticket) => ticket.id === id ? { ...ticket, ...updatedTicket } : ticket)
      );
      return updatedTicket;
    } catch (err) {
      setError(err.message || 'Failed to update support ticket');
      throw err;
    }
  }, []);

  // Delete support ticket
  const deleteTicket = useCallback(async (id) => {
    try {
      await deleteSupportTicket(id);
      setSupportTickets((prev) => prev.filter((ticket) => ticket.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete support ticket');
      throw err;
    }
  }, []);

  // Update ticket status
  const updateStatus = useCallback(async (id, status) => {
    try {
      const updatedTicket = await updateTicketStatus(id, status);
      setSupportTickets((prev) => 
        prev.map((ticket) => ticket.id === id ? { ...ticket, ...updatedTicket } : ticket)
      );
      return updatedTicket;
    } catch (err) {
      setError(err.message || 'Failed to update ticket status');
      throw err;
    }
  }, []);

  // Assign ticket
  const assignTicketToAgent = useCallback(async (id, assignedTo) => {
    try {
      const updatedTicket = await assignTicket(id, assignedTo);
      setSupportTickets((prev) => 
        prev.map((ticket) => ticket.id === id ? { ...ticket, ...updatedTicket } : ticket)
      );
      return updatedTicket;
    } catch (err) {
      setError(err.message || 'Failed to assign ticket');
      throw err;
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getSupportTicketsAnalytics();
      setAnalytics(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSupportTickets();
  }, [fetchSupportTickets]);

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToSupportTickets((payload) => {
      console.log('Support ticket change:', payload);
      fetchSupportTickets(); // Refetch on any change
    });

    return unsubscribe;
  }, [fetchSupportTickets]);

  return {
    supportTickets,
    loading,
    error,
    analytics,
    fetchSupportTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    updateStatus,
    assignTicketToAgent,
    fetchAnalytics,
    clearError,
  };
};
