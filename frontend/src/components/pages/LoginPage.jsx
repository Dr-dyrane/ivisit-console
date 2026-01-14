import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../ui/theme-toggle';
import { toast } from 'sonner';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await signUp(formData.email, formData.password, formData.username);
        toast.success('Account created! Please check your email to verify.');
      }
      navigate('/');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 squircle bg-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
            <img src="/logo.png" alt="iVisit" className="w-10 h-10" />
          </div>
          <h1 className="editorial-title text-3xl mb-2">iVisit Console</h1>
          <p className="text-muted-foreground font-semibold">Emergency Response Command Center</p>
        </div>

        {/* Auth Card */}
        <Card className="squircle-lg glass border-0 p-8 shadow-premium">
          {/* Toggle */}
          <div className="flex items-center gap-2 p-1 bg-muted/30 squircle mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 squircle font-bold text-sm transition-all ${
                isLogin ? 'bg-primary text-primary-foreground shadow-glow' : 'hover:bg-muted/50'
              }`}
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 squircle font-bold text-sm transition-all ${
                !isLogin ? 'bg-primary text-primary-foreground shadow-glow' : 'hover:bg-muted/50'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-4 squircle bg-destructive/10 text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="username" className="font-bold text-sm mb-2 block">Username</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="squircle pl-12 h-12"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="font-bold text-sm mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="squircle pl-12 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="font-bold text-sm mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="squircle pl-12 pr-12 h-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full squircle h-12 bg-primary hover:bg-primary/90 font-black text-lg shadow-glow"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  {isLogin ? <LogIn className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </Button>
          </form>

          {/* Role Info */}
          <div className="mt-6 pt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">User roles after sign up:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className="squircle-sm bg-primary/10 text-primary font-bold">Admin</Badge>
              <Badge className="squircle-sm bg-secondary/10 text-secondary font-bold">Sponsor</Badge>
              <Badge className="squircle-sm bg-info/10 text-info font-bold">Provider</Badge>
              <Badge className="squircle-sm bg-muted font-bold">Viewer</Badge>
            </div>
          </div>
        </Card>

        {/* Demo Login Hint */}
        <Card className="squircle-lg glass border-0 p-4 mt-4 shadow-premium">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-bold text-foreground">Demo:</span> Use any email to sign up. 
            <span className="text-primary font-bold"> halodyrane@gmail.com</span> gets admin access.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};
