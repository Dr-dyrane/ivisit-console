"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`relative flex items-center justify-center w-20 h-20 outline-none ${className}`}
    >
      {/* THE SUBTLE PINK GLOW - Always there, but breathes */}
      <motion.div
        animate={{
          opacity: isDark ? 0.5 : 0.15,
          scale: isDark ? [1, 1.2, 1] : 1,
        }}
        transition={{
          scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          opacity: { duration: 0.5 }
        }}
        className="absolute inset-0 rounded-full bg-pink-400/40 blur-[32px]"
      />

      {/* THE MAIN MORPHING SHAPE */}
      <motion.div
        initial={false}
        animate={{
          // Size: Large in Light mode, Tiny "Splinter" in Dark mode
          width: isDark ? "12px" : "56px",
          height: isDark ? "12px" : "56px",

          // Shape: Perfect circle when tiny, Squircle when big
          borderRadius: isDark ? "50%" : "18px",

          // Color: Pure white in Light, Hot Pink in Dark
          backgroundColor: isDark ? "#f472b6" : "#ffffff",

          // Rotation: Just for a bit of premium "twist" during the transition
          rotate: isDark ? 180 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 22,
          mass: 1
        }}
        className="relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(244,114,182,0.4)]"
      >
        {/* SUBTLE INNER LIGHT (Adds that 'Premium' depth) */}
        <motion.div
          animate={{ opacity: isDark ? 0 : 1 }}
          className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-20 rounded-[inherit]"
        />
      </motion.div>

      {/* HOVER FEEDBACK - Very faint ring */}
      <div className="absolute inset-0 rounded-full border border-pink-500/0 hover:border-pink-500/5 transition-colors duration-700" />
    </button>
  )
}

export default ThemeToggle