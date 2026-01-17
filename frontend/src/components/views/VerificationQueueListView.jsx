import React from 'react';
import { Card } from '../ui/card';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Eye, Trash2, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const VerificationQueueListView = ({ providers, onView, onDelete, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {providers.map((provider, index) => (
        <motion.div
          key={provider.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className="squircle-lg glass shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 squircle-md flex-shrink-0">
                  <AvatarImage src={getAvatarUrl(provider)} />
                  <AvatarFallback className="font-black bg-primary/10 text-primary text-sm">
                    {getAvatarFallback(provider)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-base truncate group-hover:text-primary transition-colors">
                      {provider.username || 'Unknown User'}
                    </h3>
                    <Badge className={`squircle-sm ${provider.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} border-0 font-black flex-shrink-0`}>
                      {provider.bvn_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {provider.email || 'No email'} • {provider.role || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right pr-4 border-r border-white/10">
                  <p className="text-xs text-muted-foreground font-semibold">JOINED</p>
                  <p className="font-black text-xs">{new Date(provider.created_at).toLocaleDateString()}</p>
                </div>
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(provider)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(provider)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
