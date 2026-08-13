'use client';
// @ts-nocheck
import { useState, useEffect } from 'react';
import './Login.css';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import orderflowLogo from '../assets/logo.png';
import { getRoleRoute } from '../utils/authRoutes';
import { isNativeApp } from '../platform/runtime';
import { cn } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22, staggerChildren: 0.08, delayChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, user, loading: authLoading, userRoles } = useAuth();
  const { appName } = useBranding();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && userRoles.length > 0) {
      router.replace(getRoleRoute(userRoles));
    }
  }, [user, authLoading, userRoles, router]);

  useEffect(() => { document.title = `${appName} | Login`; }, [appName]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
      setLoading(false);
    }
  };

  if (loading && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center animate-sk-pulse">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Signing in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="rounded-3xl border border-border bg-card/95 backdrop-blur-xl p-8 shadow-2xl">
          
          {/* Logo + Brand */}
          <Motion.div variants={itemVariants} className="mb-8 text-center">
            <Motion.div
              whileHover={{ scale: 1.05 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-md"
            >
              <img src={typeof orderflowLogo === 'object' ? orderflowLogo.src : orderflowLogo} alt={`${appName} Logo`} className="h-12 w-12 object-contain" />
            </Motion.div>
            <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
              {appName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
          </Motion.div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Error */}
            <AnimatePresence mode="wait">
              {error && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-xs font-semibold text-destructive"
                >
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  {error}
                </Motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <Motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={cn(
                    'flex h-11 w-full rounded-xl border border-input bg-background/80 pl-10 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/60',
                    'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
              </div>
            </Motion.div>

            {/* Password */}
            <Motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={cn(
                    'flex h-11 w-full rounded-xl border border-input bg-background/80 pl-10 pr-11 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/60',
                    'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Motion.div>

            {/* Submit */}
            <Motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={cn(
                'relative mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all',
                'bg-primary text-primary-foreground shadow-md hover:opacity-90',
                'focus:outline-none focus:ring-2 focus:ring-primary/40',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'active:scale-[0.98]'
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </Motion.button>
          </form>

          {/* Footer */}
          <Motion.div variants={itemVariants} className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors">Forgot password?</span>
            <span className="text-border">•</span>
            <span className="cursor-pointer font-semibold hover:text-foreground transition-colors">Contact Admin</span>
          </Motion.div>
        </div>

        {/* Bottom note */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </p>
      </Motion.div>
    </div>
  );
};
