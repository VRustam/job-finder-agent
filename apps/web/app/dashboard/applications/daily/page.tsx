'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Download, ExternalLink, Sparkles, 
  Briefcase, Building2, MapPin, RefreshCw, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';

interface SyncedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  match_score: number;
  match_reason: string;
  created_at: string;
}

export default function DailyDigestPage() {
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [authProvider, setAuthProvider] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SyncedJob[]>([]);



  const fetchDailyJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/applications/daily-digest');
      if (!res.ok) {
        throw new Error('Failed to load daily job digest');
      }
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadUserAndJobs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || '');
        setAuthProvider(user.app_metadata?.provider || 'email');
      }
      await fetchDailyJobs();
    }
    loadUserAndJobs();
  }, [supabase]);



  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardShell userEmail={userEmail} userName={userName} authProvider={authProvider}>
      {/* Inline Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the print-container */
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          /* Hide utility buttons during print */
          .no-print {
            display: none !important;
          }
          /* Dark mode text defaults for printing */
          body {
            background-color: white !important;
            color: black !important;
          }
          .card-print {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 no-print">
          <div>
            <Link
              href="/dashboard/applications"
              className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition duration-200 group mb-2"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Applications
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Daily AI Job Digest
            </h1>
            <p className="text-neutral-550 dark:text-neutral-400 mt-1">
              Your customized list of LinkedIn jobs synced today, analyzed and rated by Gemini AI.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={fetchDailyJobs}
              className="inline-flex items-center justify-center p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handlePrint}
              disabled={jobs.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 no-print">
            <div className="h-28 bg-neutral-100 dark:bg-neutral-900/40 animate-pulse rounded-2xl" />
            <div className="h-28 bg-neutral-100 dark:bg-neutral-900/40 animate-pulse rounded-2xl" />
            <div className="h-28 bg-neutral-100 dark:bg-neutral-900/40 animate-pulse rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-500 text-sm flex items-center gap-3 no-print">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && jobs.length === 0 && !error && (
          <div className="p-12 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-center max-w-md mx-auto space-y-4 no-print">
            <div className="w-12 h-12 rounded-2xl bg-neutral-105 dark:bg-neutral-900 flex items-center justify-center mx-auto text-neutral-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">No Jobs Synced Today</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Open LinkedIn Job Search in your browser, and click the &quot;Sync Jobs to Agent&quot; extension button to send jobs here automatically.
              </p>
            </div>
          </div>
        )}

        {/* Printable Content Area */}
        {jobs.length > 0 && (
          <div id="print-area" className="space-y-6">
            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block border-b border-neutral-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-black">Daily AI Job Digest</h1>
              <p className="text-xs text-neutral-500">
                Generated by Career Agent on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => {
                // Determine matching score colors
                let scoreColor = 'text-amber-500 dark:text-amber-400';
                let scoreBg = 'bg-amber-500/10';
                if (job.match_score >= 80) {
                  scoreColor = 'text-emerald-500 dark:text-emerald-400';
                  scoreBg = 'bg-emerald-500/10';
                } else if (job.match_score < 60) {
                  scoreColor = 'text-rose-500 dark:text-rose-400';
                  scoreBg = 'bg-rose-500/10';
                }

                return (
                  <div
                    key={job.id}
                    className="card-print p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/30 rounded-2xl hover:border-neutral-350 dark:hover:border-neutral-750 transition flex flex-col md:flex-row justify-between gap-6"
                  >
                    {/* Left: Job Meta Details */}
                    <div className="space-y-3 flex-1">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </span>
                          <h3 className="font-extrabold text-neutral-900 dark:text-white text-base">
                            {job.title}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 pl-8">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        </div>
                      </div>

                      {/* Gemini Match Reason */}
                      {job.match_reason && (
                        <div className="pl-8 pt-2">
                          <p className="text-xs text-neutral-600 dark:text-neutral-305 leading-relaxed bg-neutral-50 dark:bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-850">
                            <span className="font-bold text-indigo-500 flex items-center gap-1 mb-1 text-[10px] uppercase tracking-wider">
                              <Sparkles className="w-3 h-3" />
                              AI Match Analysis
                            </span>
                            {job.match_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Score & Actions */}
                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-4 shrink-0 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-850 pt-4 md:pt-0 md:pl-6">
                      {/* Score Badge */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                            Match Score
                          </span>
                          <span className={`text-2xl font-black ${scoreColor}`}>
                            {job.match_score}%
                          </span>
                        </div>
                        <div className={`w-10 h-10 rounded-xl ${scoreBg} flex items-center justify-center font-bold ${scoreColor}`}>
                          {job.match_score >= 80 ? 'A' : job.match_score >= 60 ? 'B' : 'C'}
                        </div>
                      </div>

                      {/* View Link */}
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition no-print"
                      >
                        Apply on LinkedIn
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
