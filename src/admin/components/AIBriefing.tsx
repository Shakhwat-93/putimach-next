'use client';
// @ts-nocheck
﻿import React from 'react';
import { Sparkles, ArrowRight, AlertCircle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import CurrencyIcon from './CurrencyIcon';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';


export const AIBriefing = ({ stats, avgCallDelay, slaRate }) => {
  const { profile } = useAuth();
  const router = useRouter();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getBriefingNarrative = () => {
    if (stats.pending > 10) {
      return (
        <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
          It's a busy day! You have <span className="font-extrabold text-rose-200 underline decoration-rose-400/50">{stats.pending} orders</span> waiting for a call. 
          Your current average call delay is <span className="font-extrabold text-teal-100">{avgCallDelay} minutes</span>. 
          We need to speed up to hit the 30m SLA target (currently at <span className="font-extrabold text-amber-200 underline decoration-amber-400/50">{slaRate}%</span>).
        </p>
      );
    } else if (stats.pending > 0) {
      return (
        <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
          Steady flow today. <span className="font-extrabold text-sky-200 underline decoration-sky-400/50">{stats.pending} orders</span> are in the queue. 
          The team is doing great with a <span className="font-extrabold text-emerald-200 underline decoration-emerald-400/50">{slaRate}% SLA success rate</span>. 
          Factory is currently processing <span className="font-extrabold text-teal-100">{stats.processing || 0} items</span>.
        </p>
      );
    } else {
      return (
        <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">
          All caught up! No orders are currently waiting in the call queue. 
          Revenue for today has reached <span className="inline-flex items-center gap-1 font-extrabold text-emerald-200"><CurrencyIcon size={15} />{stats.addedTodayRevenue?.toLocaleString() || '0'}</span>.
        </p>
      );
    }
  };

  const getSuggestions = () => {
    const suggestions = [];
    if (stats.pending > 5) {
      suggestions.push({
        id: 'call-team',
        text: 'Prioritize the Call Team queue to reduce delay',
        icon: <Clock size={14} />,
        action: '/admin/call-team'
      });
    }
    if (stats.factoryQueueCount > 10) {
      suggestions.push({
        id: 'factory',
        text: 'Factory backlog is growing. Check production capacity.',
        icon: <TrendingUp size={14} />,
        action: '/admin/factory'
      });
    }
    if (slaRate < 70) {
      suggestions.push({
        id: 'sla',
        text: 'SLA rate is dropping. Review first-call protocols.',
        icon: <AlertCircle size={14} />,
        action: '/admin/reportspanel'
      });
    }
    
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'new',
        text: 'Create a new order to boost today\'s revenue',
        icon: <Sparkles size={14} />,
        action: '/admin/ordersboard'
      });
    }

    return suggestions.slice(0, 2);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-emerald-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-white/10 transition-all hover:shadow-2xl">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-200/90 flex items-center gap-2">
            Intel Intelligence
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm m-0">
            {getGreeting()}, {profile?.name?.split(' ')[0] || 'Partner'}.
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2">
          {getBriefingNarrative()}
        </div>
        
        <div className="flex flex-col gap-2.5">
          {getSuggestions().map(sug => (
            <button 
              key={sug.id} 
              className="group flex items-center justify-between gap-3 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 p-3.5 text-left transition-all duration-200 cursor-pointer shadow-sm" 
              onClick={() => router.push(sug.action)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white group-hover:scale-110 transition-transform">
                {sug.icon}
              </div>
              <span className="text-xs font-semibold text-white/95 flex-1 leading-snug">{sug.text}</span>
              <ArrowRight size={14} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

