'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Users,
  FileStack,
  Settings,
  ArrowLeft,
  Shield,
  Loader2,
} from 'lucide-react';

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Content', href: '/admin/content', icon: FileStack },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }
      setAuthorized(true);
      setLoading(false);
    }
    checkAdmin();
  }, [supabase, router]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-[#1f493d] flex items-center justify-center">
        <div className="flowty-bg-glow" />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-white/60 text-sm font-medium">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f493d] text-white flex">
      <div className="flowty-bg-glow" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#173a30]/80 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-[10px] text-white/40 font-medium">Job Finder Agent</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-400' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to Dashboard */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
