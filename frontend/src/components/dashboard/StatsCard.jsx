import React from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'up',
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("squircle-lg p-6 glass-card hover:shadow-glow transition-smooth", className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-normal text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-semibold mb-2">{value}</h3>
            {change && (
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-sm font-normal",
                  trend === 'up' ? "text-success" : "text-destructive"
                )}>
                  {trend === 'up' ? '↑' : '↓'} {change}
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>

          {Icon && (
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              "surface-raised"
            )}>
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
