'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  {
    label: 'Campaigns',
    href: '/campaigns',
    icon: LayoutDashboard,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 flex-col bg-sidebar text-white flex">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">MailFlow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">
              {session?.user?.name?.charAt(0).toUpperCase() ?? session?.user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-white/50 truncate">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
          <ThemeToggle className="text-white/60 hover:text-white hover:bg-white/10" />
        </div>
      </div>
    </aside>
  );
}
