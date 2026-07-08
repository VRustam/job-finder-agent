import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/app/components/DashboardShell';
import { FileText, Briefcase, Calendar, Compass, Languages, ChevronRight } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no session exists, redirect to sign-in page (fallback protection)
  if (!user) {
    redirect('/auth/sign-in');
  }

  const userEmail = user.email || '';
  const userName = user.user_metadata?.full_name || '';
  const authProvider = user.app_metadata?.provider || 'email';

  const modules = [
    {
      title: 'Resume Builder',
      description: 'Create and tailor ATS-optimized resumes targeting specific jobs.',
      icon: FileText,
      status: 'Active',
      link: '/dashboard/resumes',
    },
    {
      title: 'Job Applications',
      description: 'Track submissions, recruiter emails, and application statuses in a visual board.',
      icon: Briefcase,
      status: 'Active',
      link: '/dashboard/applications',
    },
    {
      title: 'Calendar Scheduler',
      description: 'Coordinate availabilities and plan mock interviews around your calendar.',
      icon: Calendar,
      status: 'Coming Soon',
      link: '',
    },
    {
      title: 'Interview Coach',
      description: 'Simulate behavioral and technical interviews with personalized feedback.',
      icon: Compass,
      status: 'Active',
      link: '/dashboard/interview',
    },
    {
      title: 'Live Translation',
      description: 'Get real-time transcription and speech translations with explicit consent.',
      icon: Languages,
      status: 'Coming Soon',
      link: '',
    },
  ];

  return (
    <DashboardShell userEmail={userEmail} userName={userName} authProvider={authProvider}>
      {/* Welcome banner */}
      <div className="mb-10 p-8 rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-900 dark:to-neutral-950 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {userName || userEmail.split('@')[0]}!
          </h2>
          <p className="mt-2 text-neutral-350 dark:text-neutral-400 font-medium">
            Ready to supercharge your career? The foundation is ready. Explore our upcoming modules and build your career strategy.
          </p>
        </div>
        <div className="absolute top-1/2 -right-8 -translate-y-1/2 w-48 h-48 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Career Modules
          </h3>
          <span className="text-xs font-semibold text-neutral-500 bg-neutral-200/50 dark:bg-neutral-800 dark:text-neutral-400 px-2.5 py-1 rounded-full">
            Phase 1 & 2 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            const CardContent = (
              <>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-850 flex items-center justify-center text-neutral-800 dark:text-neutral-200 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-colors duration-200">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                      mod.status === 'Active'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {mod.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                    {mod.title}
                  </h4>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-450 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                  <span>{mod.status === 'Active' ? 'Open Module' : 'Learn more'}</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </>
            );

            if (mod.link) {
              return (
                <Link
                  key={idx}
                  href={mod.link}
                  className="relative group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-neutral-350 dark:hover:border-neutral-750 flex flex-col justify-between cursor-pointer"
                >
                  {CardContent}
                </Link>
              );
            }

            return (
              <div
                key={idx}
                className="relative group p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-750 flex flex-col justify-between"
              >
                {CardContent}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
