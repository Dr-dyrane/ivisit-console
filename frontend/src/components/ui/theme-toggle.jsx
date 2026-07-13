"use client"

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export const ThemeToggle = ({ className = '', size = 'lg' }) => {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const dimensions = size === 'xs' ? 'h-9 w-9' : size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'
  const Icon = isDark ? Sun : Moon
  const label = isDark ? 'Use light theme' : 'Use dark theme'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-button bg-foreground/[0.055] text-muted-foreground transition-[background,color,transform] hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.07] dark:hover:bg-white/[0.11] ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

export default ThemeToggle
