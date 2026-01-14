import React, { useState, useEffect } from 'react';
import { supabase, subscribeToTable } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { CheckCircle, XCircle, FileText, User, Phone, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const VerificationQueue = () => {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUnverifiedProviders();
    
    const unsubscribe = subscribeToTable('profiles', () => {
      fetchUnverifiedProviders();
    });

    return () => unsubscribe();
  }, []);

  const fetchUnverifiedProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider')
        .eq('bvn_verified', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to fetch verification queue');
    }
  };

  const handleVerify = async (providerId, approved) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bvn_verified: approved })
        .eq('id', providerId);

      if (error) throw error;

      toast.success(approved ? 'Provider approved!' : 'Provider rejected');
      setSelectedProvider(null);
      fetchUnverifiedProviders();
    } catch (error) {
      console.error('Error verifying provider:', error);
      toast.error('Failed to update verification status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold mb-2">Verification Queue</h1>
        <p className="text-muted-foreground">Review and approve provider applications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="squircle-lg p-6 glass">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{providers.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="squircle-lg p-6 glass">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved Today</p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
        </Card>
        
        <Card className="squircle-lg p-6 glass">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected Today</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="squircle-lg p-6 glass">
        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No pending verifications</p>
            </div>
          ) : (
            providers.map((provider, index) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-smooth"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.id}`} />
                    <AvatarFallback>{provider.username?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{provider.username || 'Unknown Provider'}</p>
                      <Badge className="squircle" variant="outline">
                        {provider.provider_type || 'provider'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {provider.email || 'No email'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {provider.phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedProvider(provider)}
                  className="squircle"
                >
                  Review
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="squircle-lg glass max-w-2xl">
          <DialogHeader>
            <DialogTitle>Provider Verification</DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedProvider.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProvider.id}`} />
                  <AvatarFallback className="text-2xl">
                    {selectedProvider.username?.[0]?.toUpperCase() || 'P'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedProvider.username || 'Unknown Provider'}</h3>
                  <p className="text-muted-foreground">{selectedProvider.email || 'No email'}</p>
                  <Badge className="squircle mt-2" variant="outline">
                    {selectedProvider.provider_type || 'provider'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="squircle p-4">
                  <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                  <p className="font-medium">{selectedProvider.phone || 'Not provided'}</p>
                </Card>
                
                <Card className="squircle p-4">
                  <p className="text-sm text-muted-foreground mb-1">Gender</p>
                  <p className="font-medium">{selectedProvider.gender || 'Not specified'}</p>
                </Card>
                
                <Card className="squircle p-4">
                  <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                  <p className="font-medium">{selectedProvider.date_of_birth || 'Not provided'}</p>
                </Card>
                
                <Card className="squircle p-4">
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="font-medium">{selectedProvider.address || 'Not provided'}</p>
                </Card>
              </div>

              <Card className="squircle p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium mb-1">Documents</p>
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet. In a production environment, 
                      provider licenses and vehicle papers would be displayed here for review.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleVerify(selectedProvider?.id, false)}
              disabled={loading}
              className="squircle"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleVerify(selectedProvider?.id, true)}
              disabled={loading}
              className="squircle bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
