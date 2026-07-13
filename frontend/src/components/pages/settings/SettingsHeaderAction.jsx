import React from 'react';
import { UserCog } from 'lucide-react';

import { Button } from '../../ui/button';

export const SettingsHeaderAction = ({ isProfileModalOpen, onOpenProfile }) => (
  <Button
    type="button"
    onClick={onOpenProfile}
    aria-haspopup="dialog"
    aria-expanded={isProfileModalOpen}
    data-state={isProfileModalOpen ? 'open' : 'idle'}
    className={`h-9 rounded-pill bg-foreground px-4 text-[12px] font-semibold text-background shadow-e2-strong transition-[background,transform] hover:bg-foreground/90 active:scale-95 ${isProfileModalOpen ? 'scale-95' : ''}`}
  >
    <UserCog className="mr-2 h-4 w-4" />
    Edit profile
  </Button>
);
