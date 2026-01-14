import React from 'react';
import { Bell, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import ThemeToggle from '../ui/theme-toggle';

export const Header = () => {
  return (
    <header className="glass border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emergency requests, users, hospitals..."
              className="pl-10 squircle bg-muted/50 border-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mr-2">
            <ThemeToggle className="squircle" />
          </div>

          <Button variant="ghost" size="icon" className="squircle relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-[10px]">
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
};
