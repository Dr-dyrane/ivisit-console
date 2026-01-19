import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Users2,
  Clock,
  Mail,
  UserPlus,
  Shield,
  Send,
  BarChart3,
  Plus
} from 'lucide-react';

export const SubscriptionsPanel = ({ subscribers }) => {
  const handleOpenEmailActions = () => {
    const event = new CustomEvent('openEmailActionsModal');
    window.dispatchEvent(event);
  };

  const handleOpenCreateSubscriber = () => {
    const event = new CustomEvent('openSubscriptionModal');
    window.dispatchEvent(event);
  };

  const handleOpenAnalytics = () => {
    const event = new CustomEvent('openSubscriptionAnalyticsModal', {
      detail: { button: document.querySelector('[data-subscription-analytics="true"]') }
    });
    window.dispatchEvent(event);
  };

  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const pendingSubscribers = subscribers.filter(s => s.status === 'pending').length;
  const freeSubscribers = subscribers.filter(s => s.type === 'free').length;
  const paidSubscribers = subscribers.filter(s => s.type === 'paid').length;

  return (
    <div className="p-4 space-y-4">
      {/* Subscriber Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Subscriber Overview</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-success/20 flex items-center justify-center">
                <Users2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <span className="font-black tracking-tight">Active</span>
                <p className="text-xs text-muted-foreground">Engaged subscribers</p>
              </div>
            </div>
            <Badge className="bg-success/20 text-success border-0">{activeSubscribers}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <span className="font-black tracking-tight">Pending</span>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </div>
            </div>
            <Badge className="bg-warning/20 text-warning border-0">{pendingSubscribers}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="font-black tracking-tight">Total</span>
                <p className="text-xs text-muted-foreground">All subscribers</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-0">{subscribers.length}</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Subscription Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Subscription Types</h3>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-info" />
              </div>
              <div>
                <span className="font-black tracking-tight">Free Tier</span>
                <p className="text-xs text-muted-foreground">Basic access</p>
              </div>
            </div>
            <Badge className="bg-info/20 text-info border-0">{freeSubscribers}</Badge>
          </div>
        </Card>

        <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 geo-round bg-purple-20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <span className="font-black tracking-tight">Premium</span>
                <p className="text-xs text-muted-foreground">Full access</p>
              </div>
            </div>
            <Badge className="bg-purple-20 text-purple-600 border-0">{paidSubscribers}</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreateSubscriber}
            className="bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium text-xs">Add</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAnalytics}
            data-subscription-analytics="true"
            className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium text-xs">Analytics</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenEmailActions}
            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
          >
            <Send className="h-4 w-4" />
            <span className="font-medium text-xs">Email</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span className="font-medium text-xs">Export</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Subscribers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">Recent Subscribers</h3>

        <div className="space-y-2">
          {subscribers.slice(0, 3).map((subscriber) => (
            <Card key={subscriber.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 geo-round ${subscriber.status === 'active' ? 'bg-success' :
                    subscriber.status === 'pending' ? 'bg-warning' : 'bg-muted'
                    }`} />
                  <div>
                    <p className="font-medium text-sm truncate max-w-[120px]">{subscriber.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscriber.type} • {new Date(subscriber.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {subscriber.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
