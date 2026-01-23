import React from 'react';
import { Card } from '../ui/card';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  Shield,
  Mail,
  UserCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VerificationQueueListView = ({
  providers,
  onView,
  onDelete,
  onVerify,
  getStatusBadge,
  isMobile = false
}) => {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {providers.map((provider, index) => (
          <motion.div
            layout
            key={provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-background/35 backdrop-blur-xs squircle-lg p-0 border-0 shadow-premium hover-lift transition-all group overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 relative">
                {/* Status Strip Gradient */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${provider.verification_status === 'approved' ? 'bg-success' :
                  provider.verification_status === 'rejected' ? 'bg-destructive' : 'bg-warning'
                  }`} />

                {/* Main Content */}
                <div className="flex-1 space-y-3 md:space-y-0 md:pl-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Provider Info */}
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 squircle flex-shrink-0 border-2 border-white/5 shadow-inner">
                        <AvatarImage src={getAvatarUrl(provider)} />
                        <AvatarFallback className="font-bold bg-primary/10 text-primary text-sm">
                          {getAvatarFallback(provider)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {provider.username || provider.full_name || 'Unknown Provider'}
                          </h3>
                          {provider.bvn_verified && (
                            <div className="text-primary" title="BVN Verified">
                              <CheckCircle className="h-3.5 w-3.5 fill-primary/10" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {provider.email || 'No email'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="flex items-center gap-1 uppercase font-semibold text-[10px] tracking-wider text-foreground/70">
                            {provider.role || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta Data Grid */}
                    <div className={`grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-8 ${isMobile ? 'w-full bg-muted/30 p-3 rounded-lg' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Joined</span>
                          <span className="text-sm font-normal">
                            {new Date(provider.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col md:items-end">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Status</span>
                          <Badge className={`geo-sharp border-0 px-2.5 py-0.5 ${getStatusBadge ? getStatusBadge(provider.verification_status) : 'bg-muted text-muted-foreground'}`}>
                            {provider.verification_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-2 ${isMobile ? 'justify-end border-t border-border/40 pt-3 mt-2' : 'md:border-l md:border-border/40 md:pl-4'}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(provider)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {onVerify && !provider.bvn_verified && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerify(provider.id, true)}
                        className="squircle h-8 w-8 p-0 hover:bg-success/20 text-success hover:text-success transition-all duration-200"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerify(provider.id, false)}
                        className="squircle h-8 w-8 p-0 hover:bg-destructive/20 text-destructive hover:text-destructive transition-all duration-200"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(provider)}
                      className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
