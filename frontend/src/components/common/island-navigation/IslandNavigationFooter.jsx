import React from 'react';
import { Moon, PanelLeftDashed, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAvatarFallback, getAvatarUrl } from '../../../lib/avatarUtils';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

export const IslandNavigationFooter = ({
  avatarToneClass,
  configOpen,
  isBroad,
  onNavigate,
  onOpenLayout,
  onToggleTheme,
  profile,
  theme,
  user,
}) => (
  <div className="p-4 pt-5 space-y-3">
    <div className="flex w-full">
      {!isBroad ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenLayout}
              className="flex items-center gap-3 w-full rounded-button h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group justify-center px-0"
              aria-label="Sidebar Layout Settings"
              aria-haspopup="dialog"
              aria-expanded={configOpen}
            >
              <PanelLeftDashed className="w-5 h-5 flex-shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background rounded-pill px-4 py-2 font-bold tracking-wide shadow-xl">
            Layout
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onOpenLayout}
          className="flex items-center gap-3 w-full rounded-button h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group"
          aria-label="Sidebar Layout Settings"
          aria-haspopup="dialog"
          aria-expanded={configOpen}
        >
          <PanelLeftDashed className="w-5 h-5 flex-shrink-0" />
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            Layout
          </motion.span>
        </button>
      )}
    </div>

    <div className="flex w-full">
      {!isBroad ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex justify-center w-full rounded-button p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background rounded-pill px-4 py-2 font-bold tracking-wide shadow-xl">
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-3 w-full rounded-button h-10 px-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 group"
          aria-label="Toggle theme"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </motion.span>
        </button>
      )}
    </div>

    <button
      type="button"
      onClick={() => onNavigate('/settings')}
      className="w-full flex items-center gap-3 p-1 rounded-button hover:bg-muted transition-colors group"
      aria-label="User Settings"
    >
      <div className="relative">
        <Avatar className={`h-9 w-9 rounded-icon flex-shrink-0 ${avatarToneClass}`}>
          <AvatarImage src={getAvatarUrl(profile, user)} className="object-cover" />
          <AvatarFallback className="bg-transparent text-xs font-semibold">
            {getAvatarFallback(profile, user)}
          </AvatarFallback>
        </Avatar>
      </div>
      {isBroad && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-left overflow-hidden">
          <p className="text-xs font-semibold truncate text-foreground">{profile?.full_name || 'User'}</p>
          <p className="text-[10px] opacity-50 truncate font-semibold uppercase tracking-tight">Settings</p>
        </motion.div>
      )}
    </button>
  </div>
);
