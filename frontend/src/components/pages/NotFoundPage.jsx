import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const [pendingAction, setPendingAction] = React.useState(null);

  const handleBack = () => {
    setPendingAction('back');
    navigate(-1);
  };

  const handleToday = () => {
    setPendingAction('today');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-card bg-card shadow-sm p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-icon bg-muted flex items-center justify-center mb-6">
            <Compass className="w-7 h-7 text-muted-foreground" />
          </div>

          <p className="text-5xl font-bold text-muted-foreground/40 mb-1">404</p>
          <h1 className="text-xl font-semibold text-foreground mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            This page does not exist or may have moved. Go back, or head to Today.
          </p>

          <div className="flex w-full flex-col gap-3">
            <Button
              onClick={handleToday}
              disabled={Boolean(pendingAction)}
              variant="ghost"
              className="h-12 w-full rounded-button bg-foreground font-semibold text-background hover:bg-foreground/90 hover:text-background"
            >
              {pendingAction === 'today' ? 'Opening Today...' : 'Go to Today'}
            </Button>

            <Button
              onClick={handleBack}
              disabled={Boolean(pendingAction)}
              variant="ghost"
              className="h-12 w-full rounded-button font-semibold text-muted-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {pendingAction === 'back' ? 'Opening previous page...' : 'Go back'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
