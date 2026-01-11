'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  Repeat,
  Clock,
  ArrowRight,
  Plus,
  Zap,
  Loader2
} from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { motion, AnimatePresence } from 'framer-motion';
import { BotActivity } from '@/lib/bot';

interface Stats {
  totalActions: number;
  totalReplies: number;
  totalOriginalTweets: number;
  searchReplies: number;
  timelineReplies: number;
  last24h: number;
  lastRun: string | null;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<BotActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch(`/api/stats?t=${Date.now()}`),
        fetch(`/api/activity?t=${Date.now()}`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Dashboard Stats:', statsData);
        setStats(statsData);
      }
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        console.log('Dashboard Activities:', activityData);
        setActivities(activityData);
      }

      // Fetch config to get isRunning status
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setIsRunning(configData.bot.isRunning);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('CRITICAL: Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleBot = async () => {
    setIsToggling(true);
    try {
      const configRes = await fetch('/api/config');
      if (!configRes.ok) throw new Error('Failed to fetch config');
      const config = await configRes.json();

      const newIsRunning = !config.bot.isRunning;
      const updatedConfig = {
        ...config,
        bot: { ...config.bot, isRunning: newIsRunning }
      };

      const saveRes = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });

      if (saveRes.ok) {
        setIsRunning(newIsRunning);
      } else {
        alert('Failed to update bot state');
      }
    } catch (error) {
      console.error('Error toggling bot:', error);
      alert('Error toggling bot');
    } finally {
      setIsToggling(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-outfit">Loading real-time data...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Actions',
      value: stats?.totalActions || 0,
      icon: MessageSquare,
      description: stats?.last24h ? `${stats.last24h} in last 24h` : 'No recent activity'
    },
    {
      title: 'Original Tweets',
      value: stats?.totalOriginalTweets || 0,
      icon: Plus,
      description: 'AI-generated content'
    },
    {
      title: 'Targeted Replies',
      value: stats?.searchReplies || 0,
      icon: Zap,
      description: 'Keyword engagement'
    },
    {
      title: 'Organic Replies',
      value: stats?.timelineReplies || 0,
      icon: Send,
      description: 'Timeline interactions'
    },
    {
      title: 'Last Activity',
      value: stats?.lastRun ? new Date(stats.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never',
      icon: Clock,
      description: stats?.lastRun ? new Date(stats.lastRun).toLocaleDateString() : 'Waiting for first run'
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Premium Status Bar */}
      <div className="flex items-center justify-between p-1 px-1 pr-6 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px]">
            <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">System <span className="text-primary italic">Live</span></span>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-white/40">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activities.length} Actions Synced</span>
          </div>
          {lastUpdated && <span>Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-7xl font-bold tracking-tighter text-white font-outfit uppercase">
            Obsidian <span className="text-gradient">Intelligence</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg font-medium tracking-tight max-w-lg leading-relaxed opacity-80">
            Advanced autonomous engagement orchestrated by <span className="text-white border-b border-white/20">Llama 3.2</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              console.log('Manual Sync Triggered - Astra');
              fetchData();
            }}
            className="group relative px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            <span className="relative flex items-center gap-2">
              <Repeat className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Sync Neural State
            </span>
          </button>

          <button className="px-8 py-4 bg-gradient-to-tr from-primary to-accent text-white rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-95 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Generate Post</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <DashboardCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-3xl font-bold text-white font-outfit tracking-tight">Recent Activity</h2>
            <button className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20 transition-all group">
              Full History <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-white/[0.05] shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left bg-transparent table-fixed">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="w-[120px] px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tweet ID</th>
                    <th className="w-[200px] px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Author</th>
                    <th className="w-[150px] px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Source</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Content Preview</th>
                    <th className="w-[120px] px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Time</th>
                    <th className="w-[150px] px-8 py-5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  <AnimatePresence mode="popLayout">
                    {activities.slice(0, 10).map((activity) => (
                      <motion.tr
                        key={activity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="px-8 py-5 text-sm font-mono text-muted-foreground group-hover:text-white transition-colors truncate">
                          {activity.tweetId || 'New'}
                        </td>
                        <td className="px-8 py-5 text-sm font-semibold text-white truncate">
                          {activity.type === 'tweet' ? 'AI Generator' : `@${activity.authorUsername}`}
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-lg border bg-white/5 border-white/10 text-muted-foreground">
                            {activity.source}
                          </span>
                        </td>
                        <td
                          className="px-8 py-5 text-sm font-medium text-muted-foreground truncate group-hover:text-white transition-colors cursor-help"
                          title={activity.error ? `FAILURE REASON: ${activity.error}\n\nCONTENT: ${activity.text}` : activity.text}
                        >
                          {activity.text}
                        </td>
                        <td className="px-8 py-5 text-sm text-muted-foreground text-right font-medium">
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn(
                              "px-3 py-1 text-[10px] font-bold uppercase rounded-lg border shadow-sm transition-all",
                              activity.status === 'posted' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                activity.status === 'generated' ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" :
                                  activity.status === 'rate-limited' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                    "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>
                              {activity.status?.replace('-', ' ') || 'failed'}
                            </span>
                            {activity.error && (
                              <span className="text-[8px] text-rose-400/60 font-medium max-w-[100px] truncate" title={activity.error}>
                                {activity.error}
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {activities.length === 0 && (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No activity logged yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Waiting for the background worker to start...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-white/[0.05] to-transparent p-10 rounded-[2.5rem] border border-white/10 shadow-3xl sticky top-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <Zap className="text-emerald-400 w-6 h-6 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
            </div>
            <h2 className="text-2xl font-bold text-white font-outfit tracking-tight">Neural Core</h2>
          </div>

          <div className="space-y-10">
            <div className={cn(
              "p-6 rounded-[1.5rem] border flex items-center justify-between group overflow-hidden relative transition-all",
              isRunning
                ? "bg-emerald-500/5 border-emerald-500/10"
                : "bg-amber-500/5 border-amber-500/10"
            )}>
              <div className={cn(
                "absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500",
                isRunning ? "bg-emerald-500/5" : "bg-amber-500/5"
              )} />
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <div className={cn(
                    "w-3 h-3 rounded-full absolute inset-0",
                    isRunning ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                  )} />
                  <div className={cn(
                    "w-3 h-3 rounded-full relative shadow-[0_0_10px_rgba(16,185,129,0.8)]",
                    isRunning ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                </div>
                <div className={cn(
                  "font-bold tracking-wider uppercase text-xs",
                  isRunning ? "text-emerald-400" : "text-amber-400"
                )}>
                  {isRunning ? 'Live System' : 'System Paused'}
                </div>
              </div>
              <button
                onClick={toggleBot}
                disabled={isToggling}
                className={cn(
                  "relative z-10 text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50",
                  isRunning
                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
                    : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                )}
              >
                {isToggling ? 'Wait...' : (isRunning ? 'Stop Bot' : 'Start Bot')}
              </button>
            </div>

            <div className="space-y-5">
              {[
                { label: 'Total Syncs', value: stats?.totalActions || 0 },
                { label: 'Originals', value: stats?.totalOriginalTweets || 0 },
                { label: 'Health', value: 'Nominal' },
                { label: 'Latency', value: '42ms' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-1 group">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] group-hover:text-primary transition-colors">{item.label}</span>
                  <span className="text-sm text-white font-bold font-mono group-hover:scale-105 transition-transform">{item.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={async () => {
                setIsTriggering(true);
                try {
                  const res = await fetch('/api/trigger', { method: 'POST' });
                  if (res.ok) {
                    await fetchData(); // Refresh data
                    alert('Neural cycle completed successfully');
                  } else {
                    const err = await res.json();
                    alert(`Error: ${err.error}`);
                  }
                } catch (error) {
                  alert('Failed to trigger neural cycle');
                } finally {
                  setIsTriggering(false);
                }
              }}
              disabled={isTriggering}
              className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
            >
              {isTriggering && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              {isTriggering ? 'Processing...' : 'Trigger Neural Cycle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
