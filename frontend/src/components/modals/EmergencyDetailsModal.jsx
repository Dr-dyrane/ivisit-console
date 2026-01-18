import React from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  X, 
  Siren, 
  MapPin, 
  Clock, 
  Activity, 
  Phone, 
  User, 
  Navigation,
  AlertTriangle,
  Shield,
  Calendar,
  FileText,
  Heart,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export const EmergencyDetailsModal = ({ isOpen, onClose, request }) => {
  if (!request) return null;

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'dispatched': return 'text-blue-500 bg-blue-500/10';
      case 'en_route': return 'text-purple-500 bg-purple-500/10';
      case 'arrived': return 'text-indigo-500 bg-indigo-500/10';
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'cancelled': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  const getEmergencyIcon = (type) => {
    switch(type) {
      case 'cardiac': return <Heart className="w-5 h-5" />;
      case 'accident': return <AlertTriangle className="w-5 h-5" />;
      case 'respiratory': return <Activity className="w-5 h-5" />;
      case 'stroke': return <Zap className="w-5 h-5" />;
      default: return <Siren className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl bg-background/50 backdrop-blur-xs border-0 max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Header with Priority Gradient */}
        <div className={`relative h-40 overflow-hidden ${
          request.priority === 'critical' ? 'bg-gradient-to-br from-destructive/30 via-destructive/10 to-background' :
          request.priority === 'high' ? 'bg-gradient-to-br from-orange-500/30 via-orange-500/10 to-background' :
          'bg-gradient-to-br from-blue-500/30 via-blue-500/10 to-background'
        }`}>
          {/* Geometric Pattern Overlay */}
          <div className="absolute inset-0 opacity-5" 
               style={{ 
                 backgroundImage: `
                   repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px),
                   repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)
                 ` 
               }}>
          </div>
          
          {/* Header Content */}
          <div className="absolute top-6 left-8 right-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className={`p-4 squircle-xl ${getPriorityColor(request.priority)} shadow-lg`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {getEmergencyIcon(request.emergency_type)}
              </motion.div>
              <div>
                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">
                  Emergency Incident
                </h2>
                <h1 className="text-3xl font-black tracking-tight mb-2">
                  {request.emergency_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN EMERGENCY'}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className={`squircle-sm border-0 ${getPriorityColor(request.priority)}`}>
                    {request.priority?.toUpperCase()}
                  </Badge>
                  <Badge className={`squircle-sm border-0 ${getStatusColor(request.status)}`}>
                    {request.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-black/10 text-foreground z-20"
              onClick={() => onClose(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Bento Grid Content */}
        <div className="px-8 pb-8 pt-6 overflow-y-auto max-h-[calc(90vh-12rem)] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
            
            {/* Primary Info Card - Spans 2 columns */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-2 row-span-1"
            >
              <div className="h-full squircle-xl bg-muted/30 p-6 border border-border/20">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
                    Situation Report
                  </h3>
                </div>
                <p className="text-base leading-relaxed font-medium text-foreground/90 mb-4">
                  {request.description || 'No description provided for this emergency incident.'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-mono">
                      {request.created_at ? format(new Date(request.created_at), 'dd MMM yyyy') : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">
                      {request.created_at ? format(new Date(request.created_at), 'HH:mm:ss') : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Status Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="row-span-1"
            >
              <div className="h-full squircle-xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
                    Status
                  </h3>
                </div>
                <div className="space-y-3">
                  {['pending', 'dispatched', 'en_route', 'arrived', 'completed'].map((step, i, arr) => {
                    const isCurrent = request.status === step;
                    const isPast = arr.indexOf(request.status) > i;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-3 h-3 squircle-full ${
                          isCurrent ? 'bg-primary' : 
                          isPast ? 'bg-primary/30' : 'bg-muted'
                        }`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isCurrent ? 'text-primary' : 
                          isPast ? 'text-muted-foreground/50' : 'text-muted-foreground/30'
                        }`}>
                          {step.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Location Card - Spans full width */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-3"
            >
              <div className="squircle-xl bg-muted/30 p-6 border border-border/20">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
                    Location Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase mb-2">Address</p>
                    <p className="font-medium text-foreground">
                      {request.location || 'Location not specified'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Latitude</p>
                      <p className="font-mono text-sm">
                        {request.latitude || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Longitude</p>
                      <p className="font-mono text-sm">
                        {request.longitude || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                {(request.latitude && request.longitude) && (
                  <Button 
                    variant="outline" 
                    className="mt-4 squircle border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => window.open(`https://maps.google.com/?q=${request.latitude},${request.longitude}`, '_blank')}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Maps
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Requester Info Card */}
            {request.profiles && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="md:col-span-3"
              >
                <div className="squircle-xl bg-gradient-to-br from-muted/30 to-muted/10 p-6 border border-border/20">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">
                      Requester Information
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 squircle-xl border-2 border-background shadow-sm">
                      <AvatarImage src={request.profiles.avatar_url} />
                      <AvatarFallback className="font-bold text-lg">
                        {request.profiles.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-xl font-black mb-1">
                        {request.profiles.full_name || request.profiles.username || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{request.profiles.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>{request.profiles.role || 'patient'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="pt-6 flex gap-3 justify-end border-t border-border/50 mt-6">
            <Button
              onClick={() => onClose(false)}
              className="squircle-lg bg-muted text-foreground hover:bg-muted/80 font-bold px-8"
            >
              Close Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
