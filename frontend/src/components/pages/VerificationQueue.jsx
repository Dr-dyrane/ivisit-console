import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { CheckCircle, XCircle, FileText, User, Phone, FileCheck, Search, Filter, Clock, Shield, AlertTriangle, ChevronRight, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { usePagination } from '../../hooks/usePagination';
import { useViewMode } from '../../hooks/useViewMode';
import { PaginationControls } from '../ui/PaginationControls';
import { ViewToggle } from '../common/ViewToggle';
import { VerificationQueueListView } from '../views/VerificationQueueListView';
import { VerificationQueueTableView } from '../views/VerificationQueueTableView';

/**
 * Verification Queue Page
 * 
 * Status: ✅ READY FOR DATA VIEW SYSTEM
 * - Paginated data fetching (12 per page)
 * - Supabase integration with filter-aware queries
 * - Smart footer with pagination info
 * - Ready for future Grid/List/Table view toggle
 * - Filter logic via stat cards (Pending/Approved/All)
 * 
 * Next: Add ViewToggle, FilterSheet, and view renderer components
 */

export const VerificationQueue = () => {
  const { isMobile } = useNavigation();
  const [providers, setProviders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const pagination = usePagination(12);
  const { viewMode, setViewMode } = useViewMode('verification-queue-page', 'grid');

  const headerActions = React.useMemo(() => (
    <div className="relative group w-full md:w-auto">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        placeholder="Lookup applicant..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 pr-4 h-9 w-full md:w-[240px] squircle-lg bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-xs font-bold"
      />
    </div>
  ), [searchTerm]);

  const viewToggleComponent = React.useMemo(() => (
    <ViewToggle value={viewMode} onChange={setViewMode} />
  ), [viewMode, setViewMode]);

  usePageHeader("Identity Vault", headerActions, !isMobile ? viewToggleComponent : null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Count total matching current filter
      let countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });

      // Filter counts
      const { count: totalCount } = await countQuery;

      if (filterType === 'pending') {
        countQuery = supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider')
          .eq('bvn_verified', false);
      } else if (filterType === 'approved') {
        countQuery = supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('bvn_verified', true);
      }

      const { count } = await countQuery;
      pagination.setTotalCount(count || 0);

      // Fetch paginated data with filter
      let query = supabase
        .from('profiles')
        .select('*')
        .range(pagination.paginationRange.start, pagination.paginationRange.end)
        .order('created_at', { ascending: false });

      if (filterType === 'pending') {
        query = query.eq('role', 'provider').eq('bvn_verified', false);
      } else if (filterType === 'approved') {
        query = query.eq('bvn_verified', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProviders(data || []);

      // Calculate global stats (all users)
      const allUsersQuery = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      const allData = allUsersQuery.data || [];
      
      const pending = allData.filter(u => !u.bvn_verified && u.role === 'provider').length;
      const approved = allData.filter(u => u.bvn_verified).length;

      setStats({ pending, approved, rejected: 0 });
      setAllUsers(allData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch verification queue');
    } finally {
      setLoading(false);
    }
  }, [pagination, filterType]);

  useEffect(() => {
    fetchAllData();

    // Real-time subscription
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAllData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, [pagination.currentPage, filterType, fetchAllData]);

  const footerContent = React.useMemo(() => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[10px] font-black">
        <span>Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalCount} {filterType === 'pending' ? 'Pending' : filterType === 'approved' ? 'Verified' : 'Total'}</span>
      </div>
    </div>
  ), [pagination.currentPage, pagination.totalPages, pagination.totalCount, filterType]);

  usePageFooter(footerContent, 'pagination', !loading && providers.length > 0);

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
    <div className="min-h-screen py-6 md:py-8">
      {/* Layout padding adjustment */}
      <div className="pt-2" />

      {/* Stats Cards - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className={`h-full squircle-lg p-6 glass border-0 cursor-pointer transition-all duration-300 relative overflow-hidden group ${filterType === 'pending' ? 'ring-2 ring-warning shadow-lg' : 'hover-lift opacity-70 hover:opacity-100'}`}
            onClick={() => setFilterType('pending')}
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 squircle bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                {filterType === 'pending' && <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />}
              </div>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Pending Review</p>
              <p className="text-4xl font-black tracking-tighter">{stats.pending}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            className={`h-full squircle-lg p-6 glass border-0 cursor-pointer transition-all duration-300 relative overflow-hidden group ${filterType === 'approved' ? 'ring-2 ring-success shadow-lg' : 'hover-lift opacity-70 hover:opacity-100'}`}
            onClick={() => setFilterType('approved')}
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                {filterType === 'approved' && <div className="h-2 w-2 rounded-full bg-success animate-pulse" />}
              </div>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Verified Users</p>
              <p className="text-4xl font-black tracking-tighter">{stats.approved}</p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card
            className={`h-full squircle-lg p-6 glass border-0 cursor-pointer transition-all duration-300 relative overflow-hidden group ${filterType === 'all' ? 'ring-2 ring-primary shadow-lg' : 'hover-lift opacity-70 hover:opacity-100'}`}
            onClick={() => setFilterType('all')}
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 squircle bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                {filterType === 'all' && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Database</p>
              <p className="text-4xl font-black tracking-tighter">{allUsers.length}</p>
            </div>
          </Card>
        </motion.div>
      </div>

      {loading ? (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[280px] squircle-lg bg-muted/10 animate-pulse"
              />
            ))}
          </motion.div>
        </LayoutGroup>
      ) : providers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 text-center"
        >
          <div className="w-20 h-20 squircle bg-muted/20 flex items-center justify-center mx-auto mb-6">
            <FileCheck className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-black mb-2">All Clear</h3>
          <p className="text-muted-foreground font-medium">No applications found matching your criteria.</p>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
          >
            <AnimatePresence mode='popLayout'>
              {providers.map((provider) => (
                <motion.div
                  layout
                  key={provider.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="h-full squircle-lg glass shadow-premium p-6 flex flex-col justify-between hover-lift group border-0 relative overflow-hidden cursor-pointer"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    {/* Card Hover Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <Avatar className="h-24 w-24 squircle-xl shadow-lg group-hover:scale-105 transition-transform duration-300">
                          <AvatarImage src={getAvatarUrl(provider)} />
                          <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                            {getAvatarFallback(provider)}
                          </AvatarFallback>
                        </Avatar>
                        <Badge className={`absolute -bottom-2 -right-2 squircle-sm px-2 py-0.5 ${provider.bvn_verified ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
                          }`}>
                          {provider.bvn_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-black tracking-tight mb-1 truncate w-full">{provider.username || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground font-semibold mb-4 truncate w-full">{provider.email}</p>

                      <div className="flex items-center gap-2 w-full justify-center">
                        {provider.role && (
                          <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground">
                            {provider.role}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="squircle-sm bg-muted/50 text-muted-foreground">
                          {new Date(provider.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>

                    <div className="relative z-10 mt-6 pt-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">VIEW DETAILS</span>
                      <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      ) : viewMode === 'list' ? (
        <VerificationQueueListView
          providers={providers}
          onView={setSelectedProvider}
          onDelete={() => {}}
          isMobile={isMobile}
        />
      ) : (
        <VerificationQueueTableView
          providers={providers}
          onView={setSelectedProvider}
          onDelete={() => {}}
          isMobile={isMobile}
        />
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={pagination.totalCount}
        itemsPerPage={pagination.itemsPerPage}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
        loading={loading}
      />

      {/* Review Modal - Apple Style Sheet */}
      <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
        <DialogContent className="squircle-2xl glass border-0 max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 shadow-2xl">
          {selectedProvider && (
            <div className="flex flex-col h-full">
              {/* Hero Header */}
              <div className="relative h-32 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full hover:bg-black/10 text-foreground"
                  onClick={() => setSelectedProvider(null)}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>

              <div className="px-8 pb-8 -mt-12 relative z-10">
                <div className="flex items-end justify-between mb-6">
                  <Avatar className="h-28 w-28 squircle-2xl shadow-xl">
                    <AvatarImage src={getAvatarUrl(selectedProvider)} />
                    <AvatarFallback className="text-4xl font-black bg-muted text-muted-foreground">
                      {selectedProvider.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2 mb-2">
                    {!selectedProvider.bvn_verified ? (
                      <>
                        <Button
                          variant="ghost"
                          className="squircle-lg text-destructive hover:bg-destructive/10 font-bold"
                          onClick={() => handleVerify(selectedProvider.id, false)}
                          disabled={actionLoading}
                        >
                          Reject
                        </Button>
                        <Button
                          className="squircle-lg bg-muted/30 hover:bg-muted/40 border border-border/30 font-bold px-6 shadow-sm"
                          onClick={() => handleVerify(selectedProvider.id, true)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Verifying...' : 'Approve'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        className="squircle-lg text-warning hover:bg-warning/10 font-bold"
                        onClick={() => handleVerify(selectedProvider.id, false)}
                        disabled={actionLoading}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-8">
                  <h2 className="text-3xl font-black tracking-tight">{selectedProvider.username}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <User className="w-4 h-4" />
                    <span>{selectedProvider.email}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedProvider.role}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div className="p-4 squircle-lg bg-muted/30">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Personal Info</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-semibold">{selectedProvider.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gender</p>
                          <p className="font-semibold capitalize">{selectedProvider.gender || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Date of Birth</p>
                          <p className="font-semibold">{selectedProvider.date_of_birth || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-4">
                    <div className="p-4 squircle-lg bg-muted/30 h-full">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Verification Status</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 squircle bg-background/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProvider.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                              {selectedProvider.bvn_verified ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold">BVN Check</p>
                              <p className="text-xs text-muted-foreground">{selectedProvider.bvn_verified ? 'Passed' : 'Pending Action'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 squircle bg-background/50 opacity-60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">Documents</p>
                              <p className="text-xs text-muted-foreground">Not Uploaded</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedProvider.address && (
                    <div className="col-span-2 p-4 squircle-lg bg-muted/30">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Address</p>
                      <p className="font-semibold">{selectedProvider.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
