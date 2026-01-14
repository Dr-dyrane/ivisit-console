import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <motion.span
          initial={false}
          animate={dark ? { scale: 1.8, opacity: 0.15 } : { scale: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-primary rounded-full w-14 h-14"
        />
      </span>

      <span className="relative z-10">
        <motion.span
          whileTap={{ scale: 0.92 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            dark ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          }`}
        >
          <span className={`w-3 h-3 rounded-full ${dark ? 'bg-yellow-300' : 'bg-gray-700'}`} />
        </motion.span>
      </span>
    </button>
  )
}

export default ThemeToggle
