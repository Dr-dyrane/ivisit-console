import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Headphones,
  Clock,
  Activity,
  CheckCircle,
  TrendingUp,
  Plus,
  Filter,
  Download,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const SupportTicketsPanel = ({ supportTicketsData, loading, useMockData }) => {
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    const fetchRecentTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('id, subject, status, priority, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data) {
          setRecentTickets(data);
        }
      } catch (err) {
        console.error('Error fetching recent tickets:', err);
      }
    };

    fetchRecentTickets();

    // Real-time subscription
    const channel = supabase
      .channel('support_tickets_panel_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchRecentTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('openSupportTicketModal'));
  };

  return (
    <div className="space-y-4">
      {/* Loading State */}
      {loading.supportTickets && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Data Source Indicator */}
      {!loading.supportTickets && useMockData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-2 geo-sharp bg-warning/10 border border-warning/20 rounded-lg"
        >
          <div className="flex items-center gap-2 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" />
            <span className="font-normal">Using Mock Data</span>
          </div>
        </motion.div>
      )}

      {!loading.supportTickets && (
        <>
          {/* Ticket Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Support Queue</h3>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Total Tickets</span>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">{supportTicketsData.total}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{supportTicketsData.open}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-info/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{supportTicketsData.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{supportTicketsData.resolved}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-muted/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{supportTicketsData.averageResolutionTime}h</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Create New Ticket"
              >
                <Plus className="h-4 w-4" />
                <span className="font-normal text-xs">Create</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => window.dispatchEvent(new CustomEvent('openFilters'))}
                className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Filter Tickets"
              >
                <Filter className="h-4 w-4" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Preview"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="font-normal text-xs">Preview</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                disabled
                title="Export (Coming Soon)"
              >
                <Download className="h-4 w-4" />
                <span className="font-normal text-xs">Export</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Recent Tickets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Tickets</h3>

            <div className="space-y-2">
              {recentTickets.map((ticket) => (
                <Card key={ticket.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 geo-round ${ticket.status === 'open' ? 'bg-warning' :
                        ticket.status === 'in_progress' ? 'bg-info' :
                          'bg-success'
                        }`} />
                      <div>
                        <p className="font-normal text-sm truncate max-w-[120px]">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {ticket.priority} • {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {ticket.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </Card>
              ))}
              {recentTickets.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No recent tickets found
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
