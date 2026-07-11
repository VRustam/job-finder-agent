import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/app/components/DashboardShell';
import { FileText, Briefcase, Calendar, Compass, Languages, ChevronRight, TrendingUp, Mail } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session exists, redirect to sign-in page (fallback protection)
  if (!session || !session.user) {
    redirect('/auth/sign-in');
  }

  const user = session.user;
  const token = session.access_token || '';

  const userEmail = user.email || '';
  const userName = user.user_metadata?.full_name || '';
  const authProvider = user.app_metadata?.provider || 'email';

  // Fetch real-time metrics parallelly
  const [
    { count: resumesCount },
    { count: applicationsCount },
    { count: interviewsCount },
    { count: eventsCount }
  ] = await Promise.all([
    supabase.from('resumes').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('interview_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('calendar_events').select('*', { count: 'exact', head: true }),
  ]);

  const modules = [
    {
      title: 'Resume Builder',
      description: 'Create and tailor ATS-optimized resumes targeting specific jobs.',
      icon: FileText,
      status: 'Active',
      link: '/dashboard/resumes',
    },
    {
      title: 'Cover Letters',
      description: 'Generate and edit job-specific AI Cover Letters using your resume details.',
      icon: Mail,
      status: 'Active',
      link: '/dashboard/cover-letters',
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
      status: 'Active',
      link: '/dashboard/calendar',
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
      status: 'Active',
      link: '/dashboard/translation',
    },
    {
      title: 'Market Analysis',
      description: 'Research daily high-demand sectors and skills powered by Gemini AI.',
      icon: TrendingUp,
      status: 'Active',
      link: '/dashboard/market',
    },
  ];

  return (
    <DashboardShell userEmail={userEmail} userName={userName} authProvider={authProvider}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-slide-up {
          animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div className="animate-slide-up">
        {/* Welcome banner */}
        <div className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-850 dark:from-neutral-900 dark:to-neutral-950 text-white shadow-xl relative overflow-hidden group">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2.5s_infinite] transition-transform pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-neutral-200 bg-clip-text text-transparent">
              Welcome back, {userName || userEmail.split('@')[0]}!
            </h2>
            <p className="mt-2 text-neutral-300 dark:text-neutral-400 font-medium">
              Ready to supercharge your career? The foundation is ready. Explore your modules and track your stats below.
            </p>
          </div>
        </div>

      {/* Chrome Extension Promo / Install Card */}
      <div className="mb-8 p-6 bg-white/10 border border-white/15 rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span className="text-purple-400 text-lg">✦</span>
              Install Career Agent Chrome Extension
            </h3>
            <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
              Scrape job descriptions, save messaging histories, auto-sync LinkedIn search results, and generate recruiter outreach drafts directly in your browser.
            </p>
          </div>
          <div className="shrink-0 w-full md:w-auto">
            <a
              href="/api/extension/download"
              className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-650 text-white rounded-xl font-bold text-xs shadow-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-center"
            >
              Download Chrome Extension (ZIP)
            </a>
          </div>
        </div>

        {/* Reload Warning for Updates */}
        <div className="p-3 bg-amber-400/20 border border-amber-400/35 rounded-xl text-xs text-amber-250 font-medium leading-relaxed">
          <strong>⚠️ Crucial Update Step:</strong> If you are updating the extension, you <strong>MUST</strong> open <code className="px-1 py-0.5 bg-white/10 text-white rounded">chrome://extensions</code>, click the <strong>Reload (Circular Arrow)</strong> button on the extension card, and then <strong>refresh (F5)</strong> your LinkedIn search tab. Otherwise, Chrome will continue running the old cached code from its memory.
        </div>

        {/* Dynamic Quick Guide */}
        <details className="group border-t border-purple-500/10 pt-3">
          <summary className="text-[11px] font-bold text-purple-600 dark:text-purple-400 cursor-pointer list-none flex items-center gap-1">
            <span>▼</span> How to install in 4 simple steps
          </summary>
          <div className="mt-3 pl-4 border-l-2 border-purple-500/20 text-xs text-neutral-550 dark:text-neutral-400 space-y-1.5 leading-relaxed">
            <p>1. Download the ZIP file above and extract (unzip) it to a folder on your computer.</p>
            <p>2. Open Google Chrome and navigate to <code className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-850 rounded">chrome://extensions</code></p>
            <p>3. Enable <strong>Developer mode</strong> using the toggle in the top right corner.</p>
            <p>4. Click <strong>Load unpacked</strong> in the top left and select the unzipped extension folder.</p>
          </div>
        </details>
      </div>

      {/* Analytics Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Active Resumes', count: resumesCount, icon: FileText, color: 'text-blue-500' },
          { label: 'Tracked Jobs', count: applicationsCount, icon: Briefcase, color: 'text-amber-500' },
          { label: 'Completed Practices', count: interviewsCount, icon: Compass, color: 'text-purple-550' },
          { label: 'Scheduled Events', count: eventsCount, icon: Calendar, color: 'text-green-500' },
        ].map((stat, i) => {
          const StatIcon = stat.icon;
          return (
            <div key={i} className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl shrink-0">
                <StatIcon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="truncate">
                <span className="block text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{stat.label}</span>
                <span className="block text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{stat.count || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Career Modules
          </h3>
          <span className="text-xs font-semibold text-neutral-500 bg-neutral-200/50 dark:bg-neutral-800 dark:text-neutral-400 px-2.5 py-1 rounded-full">
            All 6 Phases Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            const CardContent = (
              <>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:bg-gradient-to-tr group-hover:from-indigo-500 group-hover:to-pink-500 transition-all duration-300 transform group-hover:rotate-6">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                      mod.status === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-350'
                        : 'bg-white/10 text-slate-300'
                    }`}>
                      {mod.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">
                    {mod.title}
                  </h4>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
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
                  className="flowty-card animate-card-pop relative group p-6 flex flex-col justify-between cursor-pointer"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {CardContent}
                </Link>
              );
            }

            return (
              <div
                key={idx}
                className="flowty-card animate-card-pop relative group p-6 flex flex-col justify-between"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {CardContent}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      <div id="jf-supabase-token" style={{ display: 'none' }} aria-hidden="true">{token}</div>
    </DashboardShell>
  );
}
