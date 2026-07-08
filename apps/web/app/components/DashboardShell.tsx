'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Menu, X, Sparkles } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  authProvider?: string;
}

export function DashboardShell({ children, userEmail, userName, authProvider }: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/sign-in');
    router.refresh();
  };

  const displayName = userName || userEmail || 'User';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col transition-colors duration-200">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                Job Finder Agent
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* User Identity */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/50">
                <div className="w-6 h-6 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[150px] truncate">
                    {displayName}
                  </span>
                  {authProvider && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 capitalize">
                      Via {authProvider}
                    </span>
                  )}
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-neutral-750 dark:text-neutral-250 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-150"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-250 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center">
                <User className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {displayName}
                </span>
                {authProvider && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 capitalize">
                    Provider: {authProvider}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all duration-150"
            >
              <LogOut className="w-4.5 h-4.5" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
