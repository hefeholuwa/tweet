'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Key,
  Settings,
  LogOut,
  Twitter,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/' },
  { icon: Key, label: 'Credentials', href: '/settings/credentials' },
  { icon: Settings, label: 'Automation', href: '/settings/automation' },
  { icon: UserCircle, label: 'Persona', href: '/settings/persona' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [username, setUsername] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => {
        if (data.username) {
          setUsername(`@${data.username}`);
        } else {
          setUsername('Not Connected');
        }
      })
      .catch(() => setUsername('Error'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="w-68 h-screen border-r border-white/5 glass flex flex-col p-8 flex-shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-4 mb-12 px-2">
        <div className="w-12 h-12 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Twitter className="text-white w-7 h-7" />
        </div>
        <div>
          <span className="text-2xl font-bold tracking-tighter text-white font-outfit uppercase">Obsidian</span>
          <div className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase -mt-1 opacity-80">Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 6 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-accent/10 text-white shadow-[0_0_20px_rgba(139,92,246,0.1)] border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                <span className="font-semibold tracking-tight">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-6 bg-gradient-to-b from-primary to-accent rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 neon-border">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 font-bold opacity-60">Identity</div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px]">
              <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-white/80" />
              </div>
            </div>
            <div className="text-sm font-bold truncate text-white font-outfit">
              {isLoading ? '...' : (username || 'Offline')}
            </div>
          </div>
        </div>

        <button className="w-full flex items-center shrink-0 gap-3 px-5 py-4 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300 group">
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-xs uppercase tracking-widest">Logout</span>
        </button>
      </div>
    </div>
  );
}
