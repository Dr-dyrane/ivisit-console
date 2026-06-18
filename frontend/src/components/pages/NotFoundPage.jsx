import React, { useMemo } from 'react';
import { usePageHeader } from '../../contexts/LayoutContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  usePageHeader("Lost Signal", null);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="squircle-3xl bg-background/50 backdrop-blur-xs border-0 p-10 relative overflow-hidden shadow-2xl">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-background opacity-50" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-destructive/10 rounded-full blur-[80px]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 squircle-2xl bg-destructive/10 flex items-center justify-center mb-8 shadow-glow animate-pulse-slow">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>

            <h1 className="text-8xl font-bold tracking-tighter text-foreground/20 mb-2">404</h1>
            <h2 className="text-2xl font-semibold mb-8">Signal Lost</h2>

            {/* Haiku Section */}
            <div className="mb-10 space-y-2 font-serif italic text-lg text-muted-foreground">
              <p>Every second counts,</p>
              <p>But this path leads to void space,</p>
              <p>Return to the pulse.</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full squircle-xl h-12 font-semibold border-0 bg-muted/30 hover:bg-muted/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>

              <Button
                onClick={() => navigate('/')}
                className="w-full squircle-xl h-12 font-semibold shadow-glow bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Clock className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
