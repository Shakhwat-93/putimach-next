'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Smartphone, Monitor, Globe, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function LiveVisitorCounter({ compact = false }: { compact?: boolean }) {
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [visitorDetails, setVisitorDetails] = useState<any[]>([]);
  const [pagesMap, setPagesMap] = useState<Record<string, number>>({});
  const [deviceStats, setDeviceStats] = useState<{ mobile: number; desktop: number }>({ mobile: 0, desktop: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const adminKey = `admin_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase.channel('online-visitors', {
      config: {
        presence: {
          key: adminKey,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const visitorKeys = Object.keys(state).filter(k => !k.startsWith('admin_'));
        setVisitorCount(visitorKeys.length);

        const details: any[] = [];
        const pMap: Record<string, number> = {};
        let mob = 0;
        let desk = 0;

        visitorKeys.forEach(k => {
          const presences = state[k] as any[];
          if (presences && presences[0]) {
            const data = presences[0];
            details.push({ id: k, ...data });
            
            const page = data.page || '/';
            pMap[page] = (pMap[page] || 0) + 1;

            if (data.device === 'Mobile') mob++;
            else desk++;
          }
        });

        setVisitorDetails(details);
        setPagesMap(pMap);
        setDeviceStats({ mobile: mob, desktop: desk });
      })
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }, []);

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm"
          title="Click to view detailed live visitor analytics"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold">{visitorCount}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
        </button>

        {/* Detailed Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Activity size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Real-Time Visitors</h3>
                    <p className="text-xs text-muted-foreground">Live sessions on putimach.com</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Stat Box */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{visitorCount}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Online Now</span>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary border border-border flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground font-mono">
                      <Smartphone size={14} className="text-blue-500" /> {deviceStats.mobile}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Mobile</span>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary border border-border flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground font-mono">
                      <Monitor size={14} className="text-purple-500" /> {deviceStats.desktop}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Desktop</span>
                  </div>
                </div>

                {/* Active Pages Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Globe size={13} /> Active Pages
                  </h4>
                  {Object.keys(pagesMap).length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(pagesMap).map(([page, cnt]) => (
                        <div key={page} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 text-xs">
                          <span className="font-mono font-medium text-foreground truncate max-w-[240px]">{page}</span>
                          <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-mono">
                            {cnt} {cnt === 1 ? 'user' : 'users'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">No active storefront visitors right now.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Real-Time Live Visitors</h3>
            <p className="text-xs text-muted-foreground">Active storefront visitors right now on putimach.com</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-sm font-black">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>{visitorCount} Online</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Online</span>
          <span className="text-xl font-black text-foreground font-mono mt-0.5">{visitorCount}</span>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Smartphone size={11} className="text-blue-500" /> Mobile
          </span>
          <span className="text-xl font-black text-blue-500 font-mono mt-0.5">{deviceStats.mobile}</span>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Monitor size={11} className="text-purple-500" /> Desktop
          </span>
          <span className="text-xl font-black text-purple-500 font-mono mt-0.5">{deviceStats.desktop}</span>
        </div>
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Globe size={11} className="text-emerald-500" /> Active Pages
          </span>
          <span className="text-xl font-black text-emerald-500 font-mono mt-0.5">{Object.keys(pagesMap).length}</span>
        </div>
      </div>

      {Object.keys(pagesMap).length > 0 && (
        <div className="pt-3 border-t border-border/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Live Page Traffic:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(pagesMap).map(([page, cnt]) => (
              <span key={page} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium">
                <span className="font-mono">{page}</span>
                <span className="font-bold text-emerald-500 font-mono">({cnt})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
