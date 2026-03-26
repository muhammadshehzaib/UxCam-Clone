'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Users, PlaySquare, Home, Flame, GitBranch, Bug } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview',  icon: Home },
  { href: '/sessions',  label: 'Sessions',  icon: PlaySquare },
  { href: '/users',     label: 'Users',     icon: Users },
  { href: '/heatmaps',  label: 'Heatmaps',  icon: Flame },
  { href: '/funnels',   label: 'Funnels',   icon: GitBranch },
  { href: '/crashes',   label: 'Crashes',   icon: Bug },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 text-slate-100 flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
            U
          </div>
          <span className="font-semibold text-white">UXClone</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">Dev Project</p>
      </div>
    </aside>
  );
}
