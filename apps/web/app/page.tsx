import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Briefcase, FileText, Calendar, Compass, MessageSquare, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      {/* Navigation */}
      <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={36}
              height={36}
              className="w-9 h-9 rounded-lg object-contain bg-white dark:bg-neutral-800 p-0.5 border border-neutral-200 dark:border-neutral-700 shadow-xs"
            />
            <span className="text-xl font-bold tracking-tight">Job Finder Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/sign-in"
              className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white px-3 py-2 rounded-lg transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="text-sm font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-32 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-200/50 dark:bg-neutral-800/50 border border-neutral-300/30 dark:border-neutral-700/30 rounded-full text-xs font-semibold tracking-wide text-neutral-800 dark:text-neutral-200 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100 animate-pulse" />
            Empowering Your Professional Journey
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Automate Your Job Search With{' '}
            <span className="bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-400 dark:from-white dark:via-neutral-200 dark:to-neutral-500 bg-clip-text text-transparent">
              Job Finder Agent
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
            Tailor resumes, track job applications, schedule interviews, and practice mock coaching sessions in one place. Stop wasting hours on manual applications.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-8 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all duration-150 shadow-md group"
            >
              Get started for free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="w-full sm:w-auto py-3.5 px-8 bg-white dark:bg-neutral-900 text-neutral-750 dark:text-neutral-250 font-semibold border border-neutral-300 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 active:scale-[0.98] transition-all duration-150"
            >
              Sign in to dashboard
            </Link>
          </div>
        </div>

        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-200/20 via-transparent to-transparent dark:from-neutral-800/10 pointer-events-none" />
      </section>

      {/* Feature Grid Section */}
      <section className="py-20 bg-white dark:bg-neutral-900 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              An All-in-One AI Career Suite
            </h2>
            <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
              Unlock a set of powerful, intelligent modules designed to skyrocket your hire rate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <h3 className="text-lg font-bold mb-2">Resume Builder</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Optimize content for Applicant Tracking Systems (ATS) and construct professional, tailored resumes with AI assistance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <h3 className="text-lg font-bold mb-2">Job Application Tracker</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Automatically organize your job search. Track submissions, recruiter replies, and calendar schedules effortlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <h3 className="text-lg font-bold mb-2">Calendar Scheduler</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Intelligently coordinate interview availabilities, set reminders, and reserve dedicated preparation time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mb-4">
                <Compass className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <h3 className="text-lg font-bold mb-2">Interview Coach</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Simulate structured technical or behavioral mock interviews and receive immediate, actionable performance reports.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-white dark:text-neutral-900" />
              </div>
              <h3 className="text-lg font-bold mb-2">Live Translation & Captions</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Real-time, consent-based translations and captions for international video interviews to assure clear communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
          <p>© 2026 Job Finder Agent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
