'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Sparkles, BookOpen, Play, 
  HelpCircle, RefreshCw, AlertCircle, FileText, Code, ExternalLink 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';

interface VideoRecommendation {
  title: string;
  channel: string;
  duration: string;
  searchQuery: string;
  description: string;
}

interface InterviewQnA {
  question: string;
  answer: string;
}

interface WrittenGuide {
  coreConcepts: string[];
  interviewQuestions: InterviewQnA[];
  cheatsheet: string;
}

interface TutorialData {
  videos: VideoRecommendation[];
  written: WrittenGuide;
}

const PROFESSIONS = [
  'AI Engineer',
  'Software Engineer',
  'Data Scientist',
  'Prompt Engineer',
  'Product Manager',
  'UI/UX Designer',
  'DevOps Engineer',
];

export default function TutorialsPage() {
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [authProvider, setAuthProvider] = useState('');

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || '');
        setAuthProvider(user.app_metadata?.provider || 'email');
      }
    }
    loadUser();
  }, [supabase]);

  const [selectedProfession, setSelectedProfession] = useState('Software Engineer');
  const [technology, setTechnology] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TutorialData | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technology.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('/api/interview/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: selectedProfession,
          technology: technology.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch learning resources');
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell userEmail={userEmail} userName={userName} authProvider={authProvider}>
      <div className="space-y-8">
        {/* Back link */}
        <Link
          href="/dashboard/interview"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Interview Coach
        </Link>

        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Interview Tutorials & Resources
          </h1>
          <p className="text-neutral-550 dark:text-neutral-400 mt-1">
            Generate customized video learning recommendations and written concept guides tailored to your upcoming interviews.
          </p>
        </div>

        {/* Filter Selection Panel */}
        <form onSubmit={handleSearch} className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/20 rounded-2xl space-y-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Profession / Field
              </label>
              <select
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-purple-500 text-sm"
              >
                {PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Technology / Topic to Study
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={technology}
                  onChange={(e) => setTechnology(e.target.value)}
                  placeholder="e.g. React Lifecycle, Python Pandas, Git Branching, AWS S3, Docker Compose..."
                  className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-purple-500 text-sm"
                />
                <Code className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-450" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition duration-200 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Guides...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Build Study Guide
                </>
              )}
            </button>
          </div>
        </form>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="h-6 w-1/3 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
              <div className="h-44 bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded-2xl" />
              <div className="h-44 bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded-2xl" />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-1/3 bg-neutral-200 dark:bg-neutral-800 animate-pulse rounded" />
              <div className="h-88 bg-neutral-100 dark:bg-neutral-900 animate-pulse rounded-2xl" />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-500 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Split Panel Content */}
        {data && (
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left Panel: Recommended Videos */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-red-500" />
                Video Tutorials & Guides
              </h2>

              <div className="space-y-4">
                {data.videos.map((vid, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 hover:border-indigo-500/30 rounded-2xl flex flex-col justify-between transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">
                          {vid.title}
                        </h3>
                        <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {vid.duration}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 block mb-3">
                        By {vid.channel}
                      </span>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-4">
                        {vid.description}
                      </p>
                    </div>

                    <div className="border-t border-neutral-100 dark:border-neutral-850 pt-4 flex justify-end">
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(vid.searchQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-lg transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-red-500" />
                        Search on YouTube
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel: Written Guides */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Concepts & Cheatsheets
              </h2>

              <div className="space-y-6">
                {/* Core Concepts */}
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 rounded-2xl space-y-3">
                  <h3 className="text-sm font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4 text-purple-500" />
                    Key Concepts to Master
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed">
                    {data.written.coreConcepts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Interview Questions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-2 pl-1">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    Top 5 Interview Questions
                  </h3>
                  
                  {data.written.interviewQuestions.map((qna, idx) => (
                    <div
                      key={idx}
                      className="p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/20 rounded-2xl space-y-2"
                    >
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                        Question {idx + 1}
                      </span>
                      <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                        {qna.question}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed bg-neutral-50 dark:bg-neutral-950/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-850 mt-2">
                        {qna.answer}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Quick Study Cheatsheet */}
                <div className="p-6 border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent rounded-2xl space-y-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Quick Study Guide
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {data.written.cheatsheet}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
