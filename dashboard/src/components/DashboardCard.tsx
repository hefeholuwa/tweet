'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function DashboardCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className
}: DashboardCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "glass p-8 rounded-[2rem] glass-hover relative group overflow-hidden border border-white/5",
                className
            )}
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Icon className="w-24 h-24" />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="p-4 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-2xl border border-white/5 backdrop-blur-md">
                    <Icon className="w-7 h-7 text-primary" />
                </div>
                {trend && (
                    <div className={cn(
                        "text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-xl border",
                        trend.isPositive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            : "bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                    )}>
                        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-60 italic">{title}</div>
                <div className="text-4xl font-bold tracking-tighter text-white font-outfit mb-3">{value}</div>
                {description && (
                    <div className="text-[11px] text-muted-foreground/80 font-medium flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        {description}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
