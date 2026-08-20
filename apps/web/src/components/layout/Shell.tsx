import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ticket, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CommandPalette } from '../ui/CommandPalette';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Shell() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tickets', href: '/tickets', icon: Ticket },
  ];

  return (
    <div className="flex h-screen bg-background text-zinc-300 overflow-hidden">
      <CommandPalette />
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-surface/50 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-white/10">
          <span className="font-semibold text-white tracking-tight">SLA Tracker</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand',
                  isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>Press <kbd className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">Cmd+K</kbd> to search</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center border border-brand/30">
              <span className="text-xs font-medium text-brand-300">A</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
