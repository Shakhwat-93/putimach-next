'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import './UserManagement.css';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

import { 
  Plus, AlertCircle, MoreHorizontal, Edit2, Check, Lock, 
  Trash2, Mail, Phone as PhoneIcon, ShieldCheck, ChevronDown, Sparkles 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Modal } from '../components/Modal';
import { Input } from '../components/ui/input';
import { PremiumSearch } from '../components/PremiumSearch';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const AVAILABLE_ROLES = [
  'Admin',
  'Moderator',
  'Call Team',
  'Courier Team',
  'Factory Team',
  'Digital Marketer'
];

const ROLE_DESCRIPTIONS = {
  'Admin': 'Full system access — orders, users, reports, all panels',
  'Moderator': 'Order management and inventory access',
  'Call Team': 'Handles incoming customer calls and order confirmations',
  'Courier Team': 'Manages deliveries and shipment tracking',
  'Factory Team': 'Manages production tasks and factory workflow',
  'Digital Marketer': 'Tracks daily ad spend, campaign performance, and reports'
};

const roleColors = {
  'Admin': 'bg-purple-100 text-purple-700',
  'Moderator': 'bg-blue-100 text-blue-700',
  'Call Team': 'bg-amber-100 text-amber-700',
  'Courier Team': 'bg-sky-100 text-sky-700',
  'Factory Team': 'bg-emerald-100 text-emerald-700',
  'Digital Marketer': 'bg-rose-100 text-rose-700',
};

export const UserManagement = () => {
  const { confirmDialog, showError, showSuccess, showWarning, showInfo, ConfirmDialogComponent } = useConfirmDialog();
  const { user: currentUser, profile: currentProfile, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userRoles, setUserRoles] = useState({});
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    status: 'active'
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    userId: '',
    userName: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmingUserId, setConfirmingUserId] = useState(null);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Call Team'
  });
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data: usersData }, { data: rolesData }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('user_roles').select('*')
      ]);

      setUsers(usersData || []);
      
      const rolesMap = {};
      rolesData?.forEach(mapping => {
        if (!rolesMap[mapping.user_id]) rolesMap[mapping.user_id] = [];
        rolesMap[mapping.user_id].push(mapping.role_id);
      });
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      status: user.status || 'active'
    });
    setIsEditModalOpen(true);
    setDropdownOpen(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.updateUserProfile(selectedUser.id, editFormData, isAdmin);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (error) {
      showError(error.message, 'Update Failed');
    }
  };

  const handleDeleteUser = (user) => {
    setDropdownOpen(null);
    if (user.id === currentUser?.id) {
      showWarning('You cannot delete your own admin account.', 'Action Not Allowed');
      return;
    }
    confirmDialog({
      title: `Delete User "${user.name}"`,
      description: `Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.deleteUser(user.id, isAdmin);
          fetchUsers();
        } catch (error) {
          showError(error.message, 'Delete Failed');
        }
      },
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateUser({
        name: addFormData.name,
        email: addFormData.email,
        password: addFormData.password,
        role: addFormData.role
      });

      setIsAddModalOpen(false);
      setAddFormData({ name: '', email: '', password: '', role: 'Call Team' });
      
      const adminName = currentProfile?.name || currentUser?.email || 'Admin';
      await api.logActivity({
        action_type: 'USER_CREATE',
        changed_by_user_id: currentUser?.id,
        changed_by_user_name: adminName,
        action_description: `${adminName} added a new team member: ${addFormData.name} (${addFormData.role})`
      });

      fetchUsers();
    } catch (error) {
      showError(error.message, 'Add User Failed');
    }
  };

  const toggleRole = async (userId, roleId) => {
    const currentRoles = userRoles[userId] || [];
    const hasRole = currentRoles.includes(roleId);

    try {
      const newRoles = hasRole 
        ? currentRoles.filter(r => r !== roleId)
        : [...currentRoles, roleId];

      if (newRoles.length === 0) {
        showWarning('A user must have at least one role.', 'Role Required');
        return;
      }

      await api.updateUserRoles(userId, newRoles, isAdmin);

      const adminName = currentProfile?.name || currentUser?.email || 'Admin';
      const targetUser = users.find(u => u.id === userId);
      await api.logActivity({
        action_type: 'ROLE_UPDATE',
        changed_by_user_id: currentUser?.id,
        changed_by_user_name: adminName,
        action_description: `${adminName} updated roles for ${targetUser?.name || 'user'}: [${newRoles.join(', ')}]`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling role:', error);
    }
  };

  const handleResetPasswordClick = (user) => {
    setDropdownOpen(null);
    setResetPasswordData({
      userId: user.id,
      userName: user.name,
      newPassword: '',
      confirmPassword: ''
    });
    setIsResetModalOpen(true);
  };

  const handleConfirmEmail = async (user) => {
    setDropdownOpen(null);
    if (!user?.id) return;

    setConfirmingUserId(user.id);
    try {
      await api.adminConfirmUser(user.id);

      const adminName = currentProfile?.name || currentUser?.email || 'Admin';
      await api.logActivity({
        action_type: 'USER_EMAIL_CONFIRM',
        changed_by_user_id: currentUser?.id,
        changed_by_user_name: adminName,
        action_description: `${adminName} manually confirmed login email for ${user.name || user.email}`
      });

      showSuccess(`Email confirmed for ${user.name || user.email}. The user can now login.`, 'Email Confirmed');
    } catch (error) {
      showError(error.message, 'Email Confirm Failed');
    } finally {
      setConfirmingUserId(null);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      showWarning('Passwords do not match!', 'Validation Error');
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      showWarning('Password must be at least 6 characters.', 'Validation Error');
      return;
    }

    setIsResetting(true);
    try {
      await api.adminResetPassword(resetPasswordData.userId, resetPasswordData.newPassword);
      
      const adminName = currentProfile?.name || currentUser?.email || 'Admin';
      await api.logActivity({
        action_type: 'PASSWORD_RESET',
        changed_by_user_id: currentUser?.id,
        changed_by_user_name: adminName,
        action_description: `${adminName} reset the password for ${resetPasswordData.userName}`
      });

      showSuccess(`Password for ${resetPasswordData.userName} has been reset successfully.`, 'Password Reset');
      setIsResetModalOpen(false);
    } catch (error) {
      showError(error.message, 'Reset Failed');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this area.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {filteredUsers.length} Team Members
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage roles, security, and profile details for your staff.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-md">
            <PremiumSearch
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search candidates/staff..."
              suggestions={
                searchTerm ? users.filter(u => 
                  u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5).map(u => ({
                  id: u.id,
                  label: u.name,
                  sub: u.email,
                  type: 'user',
                  original: u
                })) : []
              }
              onSuggestionClick={(item) => {
                if (item.type === 'user') {
                  setSearchTerm(item.label);
                }
              }}
            />
          </div>
          
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-sm whitespace-nowrap" 
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={18} />
            Add Candidate
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4 animate-pulse mt-6">
          <div className="h-16 bg-muted rounded-xl"></div>
          <div className="h-16 bg-muted rounded-xl"></div>
          <div className="h-16 bg-muted rounded-xl"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-border rounded-2xl bg-card mt-6">
          <AlertCircle size={40} className="text-muted-foreground mb-4 opacity-50" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">No Members Found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <motion.div 
          className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm mt-6 animate-slide-up"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center overflow-hidden shrink-0">
                          {userItem.avatar_url ? (
                            <img src={userItem.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            userItem.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{userItem.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {userItem.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(userRoles[userItem.id] || []).length > 0 ? (
                          (userRoles[userItem.id] || []).map(r => (
                            <span 
                              key={r} 
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${roleColors[r] || 'bg-muted text-muted-foreground'}`}
                            >
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            Member
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${userItem.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${userItem.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {userItem.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(userItem.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-4 text-right relative">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEditUser(userItem)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 size={14} />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={() => setDropdownOpen(dropdownOpen === userItem.id ? null : userItem.id)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          
                          <AnimatePresence>
                            {dropdownOpen === userItem.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10 py-1 overflow-hidden"
                              >
                                <button 
                                  onClick={() => handleConfirmEmail(userItem)} 
                                  disabled={confirmingUserId === userItem.id}
                                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Check size={14} /> {confirmingUserId === userItem.id ? 'Confirming...' : 'Confirm Email'}
                                </button>
                                <button 
                                  onClick={() => handleResetPasswordClick(userItem)}
                                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                                >
                                  <Lock size={14} /> Reset Pass
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(userItem)}
                                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Remove
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Member: ${selectedUser?.name}`}
      >
        <div className="max-w-md w-full">
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <section className="space-y-4">
              <h4 className="text-sm font-bold text-foreground">Profile Details</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Full Name</label>
                  <Input
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Email Address</label>
                  <Input
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 mt-4">
                <div>
                  <label className="text-xs font-medium text-foreground block">Account Status</label>
                  <span className={`text-xs font-bold ${editFormData.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {editFormData.status === 'active' ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={editFormData.status === 'active' ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200'}
                  onClick={() => setEditFormData({
                    ...editFormData,
                    status: editFormData.status === 'active' ? 'inactive' : 'active'
                  })}
                >
                  {editFormData.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Role Permissions</h4>
                <p className="text-xs text-muted-foreground mt-1">Select multiple roles for combined permissions.</p>
              </div>
              <div className="flex flex-col gap-2">
                {AVAILABLE_ROLES.map(role => {
                  const isAssigned = userRoles[selectedUser?.id]?.includes(role);
                  return (
                    <div 
                      key={role}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isAssigned ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                      onClick={() => toggleRole(selectedUser.id, role)}
                    >
                      <div>
                        <span className="text-sm font-semibold text-foreground block">{role}</span>
                        <span className="text-xs text-muted-foreground block leading-tight mt-0.5">{ROLE_DESCRIPTIONS[role]}</span>
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isAssigned ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30'}`}>
                        {isAssigned && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Team Member"
      >
        <div className="max-w-md w-full">
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2 items-start mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span><strong>Full Managed Account:</strong> You are creating a login-ready account. Provide a secure password for the user.</span>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Full Name</label>
              <Input
                placeholder="Enter name"
                value={addFormData.name}
                onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Email Address</label>
              <Input
                placeholder="user@example.com"
                value={addFormData.email}
                onChange={e => setAddFormData({ ...addFormData, email: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={addFormData.password}
                onChange={e => setAddFormData({ ...addFormData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Initial Role</label>
              <div className="relative">
                <select
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  value={addFormData.role}
                  onChange={e => setAddFormData({ ...addFormData, role: e.target.value })}
                  required
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => !isResetting && setIsResetModalOpen(false)}
        title={`Reset Password: ${resetPasswordData.userName}`}
      >
        <div className="max-w-md w-full">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2 items-start mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>You are about to change the security credentials for this user. This will take effect immediately.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">New Password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={resetPasswordData.newPassword}
                onChange={e => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                required
                minLength={6}
                autoFocus
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Confirm New Password</label>
              <Input
                type="password"
                placeholder="Repeat new password"
                value={resetPasswordData.confirmPassword}
                onChange={e => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="ghost" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {ConfirmDialogComponent}
    </div>
  );
};

export default UserManagement;
