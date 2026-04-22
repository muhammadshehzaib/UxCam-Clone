'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Users, PlaySquare, Home, Flame, GitBranch, Bug, LogOut, Workflow, Sliders, TrendingUp, Settings, Activity, Bookmark, MessageSquare } from 'lucide-react';
import { clearToken } from '@/lib/auth';
import ProjectSwitcher from './ProjectSwitcher';

const navItems = [
  { href: '/dashboard', label: 'Overview',  icon: Home },
  { href: '/sessions',   label: 'Sessions',   icon: PlaySquare },
  { href: '/bookmarks',  label: 'Bookmarks',  icon: Bookmark },
  { href: '/users',     label: 'Users',     icon: Users },
  { href: '/heatmaps',  label: 'Heatmaps',  icon: Flame },
  { href: '/funnels',   label: 'Funnels',      icon: GitBranch },
  { href: '/segments',  label: 'Segments',     icon: Sliders },
  { href: '/retention', label: 'Retention',    icon: TrendingUp },
  { href: '/events',    label: 'Events',       icon: Activity },
  { href: '/flow',      label: 'Screen Flow',  icon: Workflow },
  { href: '/crashes',   label: 'Crashes',      icon: Bug },
  { href: '/feedback',  label: 'Feedback',     icon: MessageSquare },
  { href: '/settings',  label: 'Settings',     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-[var(--sidebar-width)] bg-surface-950 text-slate-100 flex flex-col z-50 border-r border-slate-800/50 shadow-2xl">
      {/* Logo & Header */}
      <div className="px-6 py-6 border-b border-white/5">
        <Link href="/sessions" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center text-white text-lg font-bold shadow-bloom transform transition-transform group-hover:scale-110 duration-300">
            U
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-tight text-base leading-none mb-1">UXClone</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Intelligence</span>
          </div>
        </Link>
      </div>

      {/* Project selector area */}
      <div className="px-4 py-4">
        <div className="bg-slate-900/50 rounded-xl border border-white/5 p-1">
          <ProjectSwitcher />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-brand-600/10 text-brand-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <div className={`transition-colors duration-200 ${active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              </div>
              {label}
              {active && (
                <div className="absolute left-0 w-1 h-5 bg-brand-500 rounded-r-full shadow-bloom" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — logout */}
      <div className="px-4 py-6 border-t border-white/5 bg-slate-900/20 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
          data-testid="logout-button"
        >
          <div className="text-slate-500 group-hover:text-red-400">
            <LogOut size={18} />
          </div>
          Sign out
        </button>
      </div>
    </aside>
  );
}
