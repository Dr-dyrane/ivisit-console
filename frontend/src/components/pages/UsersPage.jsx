import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Users, Plus, Edit, Trash2, Eye, Shield, UserCheck, ChevronRight, Phone, Mail } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { UserModal } from '../modals/UserModal';

export const UsersPage = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setModalMode('create');
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setModalMode('view');
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setModalMode('edit');
  };

  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.username}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleModalClose = (shouldRefresh) => {
    setModalMode(null);
    setSelectedUser(null);
    if (shouldRefresh) {
      fetchUsers();
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-primary/20 text-primary',
      provider: 'bg-success/20 text-success',
      patient: 'bg-info/20 text-info',
    };
    return badges[role] || badges.patient;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <PageHeader
        title="User Management"
        subtitle="Manage users, providers, and access control"
        action={
          <Button
            onClick={handleCreate}
            className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-bold">Add User</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : users.length === 0 ? (
        <Card className="squircle-lg glass shadow-premium p-12 border-0 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-black text-xl mb-2">No Users Yet</h3>
          <p className="text-muted-foreground mb-6">Get started by creating your first user</p>
          <Button onClick={handleCreate} className="squircle bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add First User
          </Button>
        </Card>
      ) : (
        <LayoutGroup>
            <motion.div 
                layout 
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
            >
            {users.map((user, index) => (
                <motion.div
                layout
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="col-span-1"
                >
                <Card className="h-full geo-ticket glass shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">
                    
                    {/* Top Right Icon */}
                    <div className="absolute top-0 right-0 p-5 z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                            <div className="w-10 h-10 geo-round bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                {user.role === 'admin' ? <Shield className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <Badge className={`geo-badge ${getRoleBadge(user.role)} border-0 font-black editorial-subtitle px-3 py-1`}>
                            {user.role || 'patient'}
                        </Badge>
                        {user.bvn_verified && (
                            <Badge className="geo-badge bg-success/20 text-success border-0 px-2 py-1">
                                Verified
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-16 h-16 geo-hexagon bg-muted/20 flex items-center justify-center overflow-hidden shadow-inner">
                            {(user.imageuri || user.avatar_url) ? (
                                <img 
                                    src={user.imageuri || user.avatar_url} 
                                    alt={user.username} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        e.target.onerror = null; 
                                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
                                    }}
                                />
                            ) : (
                                <span className="text-2xl font-black text-muted-foreground">{user.username?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="font-black text-xl tracking-tight truncate w-40">
                                {user.username || 'Unknown User'}
                            </h3>
                            {user.provider_type && (
                                <p className="text-sm font-semibold text-primary">{user.provider_type}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 mb-6 relative z-10">
                        <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                            <Mail className="h-4 w-4 text-info" />
                            <span className="truncate font-medium">{user.email || 'No email'}</span>
                        </div>
                        {user.phone && (
                            <div className="flex items-center gap-3 text-sm p-2 geo-round bg-muted/30">
                                <Phone className="h-4 w-4 text-success" />
                                <span className="font-medium">{user.phone}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted/20 relative z-10 px-2">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            ACTIONS
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(user)}
                                className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin() && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(user)}
                                        className="geo-round h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(user)}
                                        className="geo-round h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
                </motion.div>
            ))}
            </motion.div>
        </LayoutGroup>
      )}

      {modalMode && (
        <UserModal
          isOpen={!!modalMode}
          onClose={handleModalClose}
          user={selectedUser}
          mode={modalMode}
        />
      )}
    </div>
  );
};
