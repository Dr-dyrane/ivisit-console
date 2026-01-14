import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../common/Navigation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { TableSkeleton } from '../ui/skeleton';
import { Users, Plus, Edit, Trash2, Eye, Shield, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { UserModal } from '../modals/UserModal';

export const UsersPage = () => {
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
      admin: 'bg-primary/20 text-primary border-primary/30',
      provider: 'bg-success/20 text-success border-success/30',
      patient: 'bg-info/20 text-info border-info/30',
    };
    return badges[role] || badges.patient;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 md:pl-24">
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
        <div className="space-y-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="squircle-lg glass shadow-premium p-5 border-0 hover-lift group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 squircle bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-full h-full squircle object-cover" />
                    ) : (
                      <Users className="h-7 w-7 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-lg tracking-tight truncate">
                        {user.username || 'Unknown User'}
                      </h3>
                      <Badge className={`squircle-sm ${getRoleBadge(user.role)} border font-black editorial-subtitle px-2 py-1 shrink-0`}>
                        {user.role || 'patient'}
                      </Badge>
                      {user.bvn_verified && (
                        <div className="w-6 h-6 squircle-sm bg-success/20 flex items-center justify-center shrink-0">
                          <UserCheck className="icon-secondary text-success" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate font-medium">
                      {user.email || 'No email'}
                    </p>
                    {user.phone && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {user.phone}
                      </p>
                    )}
                  </div>

                  {user.provider_type && (
                    <Badge className="squircle-sm bg-warning/20 text-warning border-0 px-3 py-1 shrink-0">
                      {user.provider_type}
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(user)}
                      className="squircle card-action"
                    >
                      <Eye className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      className="squircle card-action"
                    >
                      <Edit className="icon-secondary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(user)}
                      className="squircle text-destructive hover:bg-destructive/10 card-action"
                    >
                      <Trash2 className="icon-secondary" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
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
