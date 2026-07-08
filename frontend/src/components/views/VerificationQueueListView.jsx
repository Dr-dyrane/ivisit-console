import React from 'react';
import { getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Eye,
  CheckCircle,
  Calendar,
  Mail,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VerificationQueueListView = ({
  providers,
  onView,
  onFocus,
  selectedId,
  onVerify,
  getStatusBadge,
  isMobile = false
}) => {
  if (!providers || providers.length === 0) return null;

  const getStatusAccent = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/80';
      case 'rejected':
        return 'bg-destructive/80';
      case 'pending':
      default:
        return 'bg-amber-300/80';
    }
  };

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
            <div
              data-testid="approval-provider-list-row"
              onClick={() => onFocus?.(provider)}
              aria-selected={selectedId === provider.id}
              className={`backdrop-blur-xs squircle-lg p-0 shadow-premium hover-lift transition-all group overflow-hidden cursor-pointer ${selectedId === provider.id ? 'bg-amber-400/[0.08]' : 'bg-background/35'}`}
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 relative">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusAccent(provider.verification_status)}`} />

                <div className="flex-1 space-y-3 md:space-y-0 md:pl-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 squircle flex-shrink-0 shadow-inner">
                        <AvatarImage src={provider.avatar_url || provider.image_uri || undefined} />
                        <AvatarFallback className="font-bold bg-amber-400/10 text-amber-700 dark:text-amber-200 text-sm">
                          {getAvatarFallback(provider)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg tracking-tight text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors line-clamp-1">
                            {provider.username || provider.full_name || 'Unknown Provider'}
                          </h3>
                          <Badge className="squircle-sm bg-muted/35 text-foreground/60 font-mono text-[10px] ml-1">
                            {provider.display_id || 'PRV-PENDING'}
                          </Badge>
                          {provider.bvn_verified && (
                            <div className="text-emerald-300" title="BVN Verified">
                              <CheckCircle className="h-3.5 w-3.5 fill-emerald-500/10" />
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
                          <Badge className={`geo-sharp px-2.5 py-0.5 ${getStatusBadge ? getStatusBadge(provider.verification_status) : 'bg-muted text-muted-foreground'}`}>
                            {provider.verification_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className={`flex items-center gap-2 ${isMobile ? 'justify-end pt-3 mt-2' : 'md:pl-4'}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(provider)}
                    aria-label={`View details for ${provider.username || provider.email || 'provider'}`}
                    className="squircle h-8 w-8 p-0 hover:bg-amber-400/10 hover:text-amber-700 dark:hover:text-amber-200 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {onVerify && !provider.bvn_verified && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerify(provider.id, true)}
                        aria-label={`Approve ${provider.username || provider.email || 'provider'}`}
                        className="squircle h-8 w-8 p-0 hover:bg-emerald-500/15 text-emerald-300 hover:text-emerald-200 transition-all duration-200"
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerify(provider.id, false)}
                        aria-label={`Reject ${provider.username || provider.email || 'provider'}`}
                        className="squircle h-8 w-8 p-0 hover:bg-destructive/20 text-destructive hover:text-destructive transition-all duration-200"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
