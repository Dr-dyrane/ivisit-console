import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FocusContext = createContext({});

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocus must be used within FocusProvider');
  }
  return context;
};

export const FocusProvider = ({ children }) => {
  const [focusedElement, setFocusedElement] = useState(null);
  const [focusLabel, setFocusLabel] = useState('');

  const setFocus = useCallback((elementId, label = '') => {
    setFocusedElement(elementId);
    setFocusLabel(label);
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedElement(null);
    setFocusLabel('');
  }, []);

  const isFocused = (elementId) => focusedElement === elementId;
  const hasFocus = focusedElement !== null;

  return (
    <FocusContext.Provider value={{ focusedElement, focusLabel, setFocus, clearFocus, isFocused, hasFocus }}>
      {children}
      
      {/* Global Focus Overlay */}
      <AnimatePresence>
        {hasFocus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm pointer-events-none"
            data-testid="focus-overlay"
          />
        )}
      </AnimatePresence>
    </FocusContext.Provider>
  );
};

// HOC to make any component focusable
export const Focusable = ({ 
  children, 
  focusId, 
  focusLabel = '',
  className = '',
  focusOnHover = false,
  focusOnClick = false,
  ...props 
}) => {
  const { setFocus, clearFocus, isFocused, hasFocus } = useFocus();
  const isCurrentlyFocused = isFocused(focusId);

  const handleFocus = () => {
    if (!isCurrentlyFocused) {
      setFocus(focusId, focusLabel);
    }
  };

  const handleBlur = () => {
    if (isCurrentlyFocused) {
      clearFocus();
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 ${
        hasFocus && !isCurrentlyFocused ? 'opacity-30 scale-[0.98]' : ''
      } ${isCurrentlyFocused ? 'z-40' : ''} ${className}`}
      onMouseEnter={focusOnHover ? handleFocus : undefined}
      onMouseLeave={focusOnHover ? handleBlur : undefined}
      onClick={focusOnClick ? (isCurrentlyFocused ? handleBlur : handleFocus) : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

// Simple wrapper for cards that should be focusable on hover
export const FocusableCard = ({ children, id, label, className = '', ...props }) => {
  return (
    <Focusable 
      focusId={id} 
      focusLabel={label} 
      focusOnHover 
      className={className}
      {...props}
    >
      {children}
    </Focusable>
  );
};
