import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Mail, Shield, LogOut, Moon, Sun, Bell, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, profile, signOut, isAdmin, isSponsor, isProvider } = useAuth();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-primary text-primary-foreground',
      sponsor: 'bg-secondary text-secondary-foreground',
      provider: 'bg-info text-info-foreground',
      viewer: 'bg-muted text-muted-foreground',
    };
    return colors[role] || colors.viewer;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="editorial-title text-3xl mb-1">Settings</h1>
        <p className="text-muted-foreground font-semibold">Manage your account and preferences</p>
      </motion.div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="squircle-lg glass border-0 p-6">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </h3>
            
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 squircle">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} />
                <AvatarFallback className="squircle bg-primary/10 text-primary font-black text-2xl">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-xl font-black">{profile?.username || 'User'}</h2>
                <p className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user?.email || profile?.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`squircle font-bold ${getRoleBadgeColor(profile?.role)}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {profile?.role || 'viewer'}
                  </Badge>
                  {profile?.bvn_verified && (
                    <Badge className="squircle bg-success/20 text-success font-bold">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Role Permissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="squircle-lg glass border-0 p-6">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 squircle bg-muted/30">
                <span className="font-semibold">View Dashboard & Analytics</span>
                <Badge className="squircle bg-success/20 text-success">✓ Granted</Badge>
              </div>
              <div className="flex items-center justify-between p-3 squircle bg-muted/30">
                <span className="font-semibold">Manage CRUD Operations</span>
                <Badge className={`squircle ${isProvider() ? 'bg-success/20 text-success' : 'bg-muted'}`}>
                  {isProvider() ? '✓ Granted' : '✗ Restricted'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 squircle bg-muted/30">
                <span className="font-semibold">User Verification Queue</span>
                <Badge className={`squircle ${isAdmin() ? 'bg-success/20 text-success' : 'bg-muted'}`}>
                  {isAdmin() ? '✓ Granted' : '✗ Admin Only'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 squircle bg-muted/30">
                <span className="font-semibold">User Management</span>
                <Badge className={`squircle ${isAdmin() ? 'bg-success/20 text-success' : 'bg-muted'}`}>
                  {isAdmin() ? '✓ Granted' : '✗ Admin Only'}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="squircle-lg glass border-0 p-6">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferences
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 squircle bg-muted/30">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span className="font-semibold">Dark Mode</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="squircle"
                >
                  {darkMode ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="squircle-lg glass border-0 p-6">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Session
            </h3>
            
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="squircle border-destructive text-destructive hover:bg-destructive/10 w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
