'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BarChart2, Users, PlaySquare, Home, Flame, GitBranch, Bug, LogOut, Workflow, Sliders } from 'lucide-react';
import { clearToken } from '@/lib/auth';
import ProjectSwitcher from './ProjectSwitcher';

const navItems = [
  { href: '/dashboard', label: 'Overview',  icon: Home },
  { href: '/sessions',  label: 'Sessions',  icon: PlaySquare },
  { href: '/users',     label: 'Users',     icon: Users },
  { href: '/heatmaps',  label: 'Heatmaps',  icon: Flame },
  { href: '/funnels',   label: 'Funnels',      icon: GitBranch },
  { href: '/flow',      label: 'Screen Flow',  icon: Workflow },
  { href: '/crashes',   label: 'Crashes',      icon: Bug },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 text-slate-100 flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
            U
          </div>
          <span className="font-semibold text-white">UXClone</span>
        </div>
      </div>

      {/* Project switcher */}
      <ProjectSwitcher />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          data-testid="logout-button"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
