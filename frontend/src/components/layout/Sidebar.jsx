import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  Ambulance, 
  Hospital, 
  FileCheck, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/map', icon: Map, label: 'God Mode Map' },
  { path: '/verification', icon: FileCheck, label: 'Verification Queue' },
  { path: '/analytics', icon: Activity, label: 'Analytics' },
  { path: '/hospitals', icon: Hospital, label: 'Hospitals' },
  { path: '/ambulances', icon: Ambulance, label: 'Fleet' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = ({ collapsed, onCollapse }) => {
  return (
    <aside 
      className={cn(
        "fixed top-0 left-0 h-screen glass border-r border-border z-50 transition-all duration-300",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between mb-8">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-fadeIn">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-glow">
                <div className="w-3 h-3 rounded-full bg-white"></div>
              </div>
              <div>
                <h1 className="font-bold text-lg">iVisit</h1>
                <p className="text-xs text-muted-foreground">Console</p>
              </div>
            </div>
          )}
          
          {collapsed && (
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-glow mx-auto">
              <div className="w-3 h-3 rounded-full bg-white pulse-dot"></div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapse(!collapsed)}
            className={cn("shrink-0", collapsed && "mx-auto mt-4")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 rounded-2xl transition-smooth group",
                  "hover:bg-muted",
                  isActive && "bg-primary text-primary-foreground shadow-glow",
                  collapsed && "justify-center"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="font-medium animate-fadeIn">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={cn(
          "mt-auto pt-4 border-t border-border",
          collapsed && "flex justify-center"
        )}>
          {!collapsed ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-smooth cursor-pointer animate-fadeIn">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">Admin User</p>
                <p className="text-xs text-muted-foreground truncate">admin@ivisit.com</p>
              </div>
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </aside>
  );
};
