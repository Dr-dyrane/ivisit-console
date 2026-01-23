"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

export const ThemeToggle = ({ className = '', size = 'lg' }) => {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  const containerSize =
    size === 'xs' ? 'w-9 h-9' :
    size === 'sm' ? 'w-10 h-10' :
    'w-20 h-20'

  const glowBlur =
    size === 'xs' ? 'blur-[16px]' :
    size === 'sm' ? 'blur-[20px]' :
    'blur-[32px]'

  const shapeSize = (() => {
    if (size === 'xs') {
      return { dark: { w: '8px', h: '8px' }, light: { w: '18px', h: '18px' } }
    }
    if (size === 'sm') {
      return { dark: { w: '10px', h: '10px' }, light: { w: '28px', h: '28px' } }
    }
    return { dark: { w: '12px', h: '12px' }, light: { w: '56px', h: '56px' } }
  })()

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`relative flex items-center justify-center ${containerSize} outline-none ${className}`}
    >
      <motion.div
        animate={{
          opacity: isDark ? 0.5 : 0.15,
          scale: isDark ? [1, 1.2, 1] : 1,
        }}
        transition={{
          scale: { repeat: Infinity, duration: 4, ease: "easeInOut" },
          opacity: { duration: 0.5 }
        }}
        className={`absolute inset-0 rounded-full bg-pink-400/40 ${glowBlur}`}
      />

      <motion.div
        initial={false}
        animate={{
          width: isDark ? shapeSize.dark.w : shapeSize.light.w,
          height: isDark ? shapeSize.dark.h : shapeSize.light.h,
          borderRadius: isDark ? "50%" : "18px",
          backgroundColor: isDark ? "hsl(var(--primary))" : "hsl(var(--background))",
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
        <motion.div
          animate={{ opacity: isDark ? 0 : 1 }}
          className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-20 rounded-[inherit]"
        />
      </motion.div>

      <div className="absolute inset-0 rounded-full border border-pink-500/0 hover:border-pink-500/5 transition-colors duration-700" />
    </button>
  )
}

export default ThemeToggle
