import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';

export const FieldError = ({ message }) => message ? (
  <motion.p
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    role="alert"
    className="mt-2 flex items-center gap-2 px-1 text-xs font-medium text-destructive"
  >
    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
    {message}
  </motion.p>
) : null;

export const PrimaryButton = ({ loading, children, disabled = false }) => (
  <button
    type="submit"
    disabled={loading || disabled}
    aria-busy={loading}
    data-state={loading ? "pending" : disabled ? "unavailable" : "ready"}
    className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-foreground px-5 text-sm font-semibold text-background shadow-e2 transition-[background,transform] hover:bg-foreground/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}
  </button>
);
