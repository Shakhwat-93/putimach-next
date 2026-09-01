'use client';
// @ts-nocheck
import React from 'react';
import { useAuth } from '../context/AuthContext';
import './PresenceStack.css';

export const PresenceStack = () => {
  const { onlineUsers, user } = useAuth();
  const [isSyncing, setIsSyncing] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsSyncing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const sortedUsers = [...(onlineUsers || [])].sort((a, b) => {
    const aIsAdmin = a.roles?.includes('Admin');
    const bIsAdmin = b.roles?.includes('Admin');
    if (aIsAdmin !== bIsAdmin) return aIsAdmin ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const displayUsers = sortedUsers.slice(0, 3);
  const extraCount = Math.max(0, sortedUsers.length - displayUsers.length);

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 select-none shrink-0">
      {displayUsers.length > 0 ? (
        <div className="hidden sm:flex items-center -space-x-1.5 overflow-hidden py-0.5">
          {displayUsers.map((u) => (
            <div
              key={u.id}
              className="relative inline-block rounded-full ring-1.5 ring-background overflow-hidden bg-secondary shrink-0 shadow-2xs"
              style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px', maxWidth: '20px', maxHeight: '20px' }}
              title={`${u.name || 'User'} (${u.roles?.join(', ') || 'Staff'}) • ${u.context?.page || 'Online'}`}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.name || 'User'} className="h-full w-full object-cover rounded-full" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-muted-foreground bg-muted">
                  {(u.name || u.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
          {extraCount > 0 && (
            <div 
              className="relative inline-flex items-center justify-center rounded-full bg-muted ring-1.5 ring-background text-[8px] font-bold text-muted-foreground shrink-0 shadow-2xs"
              style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}
            >
              +{extraCount}
            </div>
          )}
        </div>
      ) : null}
      
      <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {isSyncing ? 'Syncing...' : `${onlineUsers.length} Online`}
      </span>
    </div>
  );
};
