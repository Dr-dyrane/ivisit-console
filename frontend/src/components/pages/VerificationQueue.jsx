import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { CheckCircle, XCircle, FileText, User, Phone, FileCheck, Search, Filter, Clock, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const VerificationQueue = () => {
  const [providers, setProviders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchAllData();
    
    // Real-time subscription
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAllData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAllUsers(data || []);
      
      // Calculate stats
      const pending = data?.filter(u => !u.bvn_verified && u.role === 'provider').length || 0;
      const approved = data?.filter(u => u.bvn_verified).length || 0;
      const rejected = 0; // Would need a rejected field to track this
      
      setStats({ pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = allUsers.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    if (filterType === 'pending') {
      return matchesSearch && !user.bvn_verified && user.role === 'provider';
    } else if (filterType === 'approved') {
      return matchesSearch && user.bvn_verified;
    } else if (filterType === 'all') {
      return matchesSearch;
    }
    return matchesSearch;
  });

  const handleVerify = async (providerId, approved) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bvn_verified: approved })
        .eq('id', providerId);

      if (error) throw error;

      toast.success(approved ? 'Provider approved successfully!' : 'Provider verification rejected');
      setSelectedProvider(null);
      fetchAllData();
    } catch (error) {
      console.error('Error verifying provider:', error);
      toast.error('Failed to update verification status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="editorial-title text-3xl mb-1">Verification Queue</h1>
            <p className="text-muted-foreground font-semibold">Review and approve provider applications</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className={`squircle-lg p-5 glass border-0 cursor-pointer transition-all ${filterType === 'pending' ? 'ring-2 ring-warning' : 'hover-lift'}`}
            onClick={() => setFilterType('pending')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 squircle bg-warning/10 flex items-center justify-center">
                <Clock className="h-7 w-7 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Pending Review</p>
                <p className="text-3xl font-black">{stats.pending}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card 
            className={`squircle-lg p-5 glass border-0 cursor-pointer transition-all ${filterType === 'approved' ? 'ring-2 ring-success' : 'hover-lift'}`}
            onClick={() => setFilterType('approved')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 squircle bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Verified Users</p>
                <p className="text-3xl font-black">{stats.approved}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card 
            className={`squircle-lg p-5 glass border-0 cursor-pointer transition-all ${filterType === 'all' ? 'ring-2 ring-primary' : 'hover-lift'}`}
            onClick={() => setFilterType('all')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 squircle bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Total Users</p>
                <p className="text-3xl font-black">{allUsers.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <Card className="squircle-lg p-4 glass border-0 mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 text-lg"
          />
        </div>
      </Card>

      {/* Queue List */}
      <Card className="squircle-lg p-6 glass border-0">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-xl">
            {filterType === 'pending' && 'Pending Verifications'}
            {filterType === 'approved' && 'Verified Users'}
            {filterType === 'all' && 'All Users'}
          </h3>
          <Badge className="squircle bg-muted font-bold">{filteredProviders.length} results</Badge>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 squircle bg-muted animate-pulse mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl font-black mb-2">Queue Empty</p>
              <p className="text-muted-foreground">
                {filterType === 'pending' ? 'No pending verifications' : 'No users match your search'}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredProviders.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 squircle bg-muted/30 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-14 w-14 squircle">
                      <AvatarImage src={provider.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider.id}`} />
                      <AvatarFallback className="squircle bg-primary/10 text-primary font-black">
                        {provider.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-lg">{provider.username || 'Unknown User'}</p>
                        <Badge className={`squircle-sm font-bold ${
                          provider.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {provider.bvn_verified ? 'Verified' : 'Pending'}
                        </Badge>
                        {provider.role && (
                          <Badge className="squircle-sm bg-primary/10 text-primary" variant="outline">
                            {provider.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {provider.email || 'No email'}
                        </span>
                        {provider.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {provider.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedProvider(provider)}
                    className="squircle bg-primary hover:bg-primary/90"
                    data-testid={`review-btn-${provider.id}`}
                  >
                    Review
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </Card>

      {/* Review Modal */}
      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="squircle-lg glass border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl">User Verification Review</DialogTitle>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6 mt-4">
              {/* User Header */}
              <div className="flex items-center gap-4 p-4 squircle bg-muted/30">
                <Avatar className="h-20 w-20 squircle">
                  <AvatarImage src={selectedProvider.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProvider.id}`} />
                  <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                    {selectedProvider.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h3 className="text-xl font-black">{selectedProvider.username || 'Unknown User'}</h3>
                  <p className="text-muted-foreground">{selectedProvider.email || 'No email'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`squircle ${selectedProvider.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                      {selectedProvider.bvn_verified ? 'Verified' : 'Pending Verification'}
                    </Badge>
                    {selectedProvider.role && (
                      <Badge className="squircle bg-primary/10 text-primary" variant="outline">
                        {selectedProvider.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="squircle p-4 bg-muted/20 border-0">
                  <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                  <p className="font-bold">{selectedProvider.phone || 'Not provided'}</p>
                </Card>
                
                <Card className="squircle p-4 bg-muted/20 border-0">
                  <p className="text-sm text-muted-foreground mb-1">Gender</p>
                  <p className="font-bold">{selectedProvider.gender || 'Not specified'}</p>
                </Card>
                
                <Card className="squircle p-4 bg-muted/20 border-0">
                  <p className="text-sm text-muted-foreground mb-1">Date of Birth</p>
                  <p className="font-bold">{selectedProvider.date_of_birth || 'Not provided'}</p>
                </Card>
                
                <Card className="squircle p-4 bg-muted/20 border-0">
                  <p className="text-sm text-muted-foreground mb-1">Account Created</p>
                  <p className="font-bold">
                    {selectedProvider.created_at 
                      ? new Date(selectedProvider.created_at).toLocaleDateString() 
                      : 'Unknown'}
                  </p>
                </Card>
              </div>

              {selectedProvider.address && (
                <Card className="squircle p-4 bg-muted/20 border-0">
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="font-bold">{selectedProvider.address}</p>
                </Card>
              )}

              {/* Documents Section */}
              <Card className="squircle p-4 bg-muted/20 border-0">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-bold mb-1">Verification Documents</p>
                    <p className="text-sm text-muted-foreground">
                      In a production environment, BVN verification, ID documents, 
                      and professional licenses would be displayed here for review.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Warning for already verified */}
              {selectedProvider.bvn_verified && (
                <Card className="squircle p-4 bg-success/10 border-0">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <p className="font-semibold text-success">This user is already verified</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-6">
            {!selectedProvider?.bvn_verified && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleVerify(selectedProvider?.id, false)}
                  disabled={actionLoading}
                  className="squircle border-destructive text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleVerify(selectedProvider?.id, true)}
                  disabled={actionLoading}
                  className="squircle bg-success hover:bg-success/90"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {actionLoading ? 'Processing...' : 'Approve'}
                </Button>
              </>
            )}
            {selectedProvider?.bvn_verified && (
              <Button
                variant="outline"
                onClick={() => handleVerify(selectedProvider?.id, false)}
                disabled={actionLoading}
                className="squircle border-warning text-warning hover:bg-warning/10"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Revoke Verification
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
