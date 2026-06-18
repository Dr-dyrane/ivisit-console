import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const BackButton = ({ to = '/', label = 'Back to Dashboard' }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => navigate(to)}
      className="group flex items-center gap-3 px-5 py-3 squircle-lg bg-background/35 backdrop-blur-xs shadow-premium hover-lift border-0 transition-smooth"
    >
      <div className="w-10 h-10 squircle bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <ArrowLeft className="h-5 w-5 text-primary" />
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </motion.button>
  );
};

export const PageHeader = ({ title, subtitle, action, showBack = true }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {showBack && (
        <div className="mb-6">
          <BackButton />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="editorial-title text-4xl mb-2">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground font-medium">{subtitle}</p>
          )}
        </div>
        {action && (
          <div>{action}</div>
        )}
      </div>
    </motion.div>
  );
};
