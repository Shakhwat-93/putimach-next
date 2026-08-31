'use client';
// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import './Profile.css';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { User, Camera, Shield, Save, CheckCircle, AlertCircle, X, Loader2, FolderOpen } from 'lucide-react';
import { MediaPickerModal } from '../components/media/MediaPickerModal';

export const Profile = () => {
  const { user, profile, updateProfile, updatePassword, uploadAvatar } = useAuth();
  const fileInputRef = useRef(null);
  const [avatarMediaPickerOpen, setAvatarMediaPickerOpen] = useState(false);

  const [name, setName] = useState('');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState({ profile: false, password: false, avatar: false });
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sync name state when profile loads
  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profile?.id && !user?.id) {
      setMessage({ type: 'error', text: 'User session not found' });
      return;
    }
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      await updateProfile(profile?.id || user?.id, { name });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    if (passwords.new.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));
    try {
      // 1. Verify Current Password by attempting a re-login
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile?.email || user?.email,
        password: passwords.current,
      });

      if (authError) {
        throw new Error('Verification failed: Current password is incorrect.');
      }

      // 2. Update to New Password
      await updatePassword(passwords.new);
      
      setPasswords({ current: '', new: '', confirm: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });

      // Log the security change
      await api.logActivity({
        action_type: 'PASSWORD_CHANGE',
        changed_by_user_id: user?.id,
        changed_by_user_name: profile?.name || 'User',
        action_description: `${profile?.name || 'User'} updated their password`
      });

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(prev => ({ ...prev, avatar: true }));
    try {
      await uploadAvatar(file);
      setMessage({ type: 'success', text: 'Avatar updated!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal profile and security.</p>
      </div>

      {message.text && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg"
            aria-label="Close message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        <Card className="rounded-3xl border border-border bg-card p-6 shadow-sm animate-slide-up space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border">
            <div 
              className="relative group cursor-pointer shrink-0" 
              onClick={handleAvatarClick}
            >
              <div className="h-20 w-20 rounded-full overflow-hidden border-4 border-border bg-secondary flex items-center justify-center relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center h-full w-full">
                    {profile?.name?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full text-white">
                  <Camera className="h-5 w-5" />
                </div>
                {loading.avatar && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center rounded-full">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <h3 className="text-lg font-bold font-display text-foreground">{profile?.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAvatarMediaPickerOpen(true)}
                  className="h-7 text-xs font-bold"
                >
                  <FolderOpen size={12} className="mr-1 text-primary" />
                  Select from Media
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAvatarClick}
                  className="h-7 text-xs font-bold"
                >
                  <Camera size={12} className="mr-1" />
                  Upload New
                </Button>
                {profile?.status && (
                  <Badge variant="primary">{profile.status}</Badge>
                )}
              </div>
            </div>
          </div>

          <MediaPickerModal
            isOpen={avatarMediaPickerOpen}
            onClose={() => setAvatarMediaPickerOpen(false)}
            onSelect={async (urls) => {
              if (urls && urls[0]) {
                setLoading(prev => ({ ...prev, avatar: true }));
                try {
                  await updateProfile(profile?.id || user?.id, { avatar_url: urls[0] });
                  setMessage({ type: 'success', text: 'Avatar updated from Media Library!' });
                } catch (err: any) {
                  setMessage({ type: 'error', text: err.message || 'Failed to set avatar' });
                } finally {
                  setLoading(prev => ({ ...prev, avatar: false }));
                }
              }
            }}
            multiple={false}
            initialSelectedUrls={profile?.avatar_url ? [profile.avatar_url] : []}
            title="Select Profile Avatar"
          />

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                Display Name
              </label>
              <Input 
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                Email Address (Login)
              </label>
              <Input 
                value={profile?.email || ''}
                disabled
              />
            </div>
            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={loading.profile || (!profile && !user)}>
                {loading.profile ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    <span>Update Name</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="rounded-3xl border border-border bg-card p-6 shadow-sm animate-slide-up space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold font-display text-foreground">Security</h3>
          </div>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                Current Password
              </label>
              <Input 
                type="password"
                placeholder="Verify your identity"
                value={passwords.current}
                onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                required
              />
            </div>
            <div className="h-px bg-border my-2" />
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                New Password
              </label>
              <Input 
                type="password"
                placeholder="Min 6 characters"
                value={passwords.new}
                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block">
                Confirm New Password
              </label>
              <Input 
                type="password"
                placeholder="Repeat new password"
                value={passwords.confirm}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>
            <div className="pt-2">
              <Button type="submit" variant="ghost" disabled={loading.password}>
                {loading.password ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Verifying & Changing...</span>
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
