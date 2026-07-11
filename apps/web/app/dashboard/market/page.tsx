'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, TrendingUp, Sparkles, RefreshCw, Layers, ShieldAlert, Search, Briefcase, DollarSign, MapPin, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';

interface Sector {
  name: string;
  demand: 'Critical' | 'High' | 'Moderate';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface MarketData {
  dailyInsight: string;
  sectors: Sector[];
  emergingSkills: string[];
}

interface SearchResult {
  profession: string;
  demandScore: number;
  summary: string;
  requiredSkills: string[];
  salaryRange: string;
  topRegions: string[];
}

const PROFESSIONS = [
  'All',
  'AI Engineer',
  'Machine Learning Engineer',
  'Prompt Engineer',
  'NLP Scientist',
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UI/UX Designer',
  'DevOps Engineer',
  'Data Engineer',
  'Cloud Architect',
  'Marketing Specialist',
];

export default function MarketPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [authProvider, setAuthProvider] = useState('');

  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('All');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to generate daily insights');
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadUserAndTrends() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.full_name || '');
      setAuthProvider(user.app_metadata?.provider || 'email');
      
      // Load daily insights asynchronously
      await fetchTrends();
    }
    loadUserAndTrends();
  }, [router, supabase]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await fetch('/api/market/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          profession: selectedProfession === 'All' ? '' : selectedProfession,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to perform AI market search');
      }

      const json = await res.json();
      setSearchResult(json);
    } catch (err) {
      setSearchError(err instanceof Error ? (err as Error).message : 'An error occurred during search');
    } finally {
      setSearchLoading(false);
    }
  };



  const getDemandBadge = (demand: string) => {
    switch (demand.toLowerCase()) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-rose-500/20 text-rose-350 border border-rose-500/30">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-purple-500/20 text-purple-350 border border-purple-500/30">
            High
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md bg-amber-500/20 text-amber-350 border border-amber-500/30">
            Moderate
          </span>
        );
    }
  };

  return (
    <DashboardShell userEmail={userEmail} userName={userName} authProvider={authProvider}>
      <div className="space-y-12">
        {/* Back navigation link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>

        {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Market Analysis & Trends
          </h1>
          <p className="text-slate-200 mt-1">
            Real-time daily career market research driven by Gemini AI.
          </p>
        </div>
        <button
          onClick={fetchTrends}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-white/10 hover:border-purple-500/55 bg-white/5 hover:bg-white/10 text-white rounded-xl transition duration-200 text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-2xl" />
              <div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-2xl" />
            </div>
            <div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        <div className="p-6 border border-rose-500/20 bg-rose-500/5 rounded-2xl flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-rose-450 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white text-lg">Error generating trends</h3>
            <p className="text-slate-200 text-sm mt-1">{error}</p>
            <button
              onClick={fetchTrends}
              className="text-rose-450 hover:text-rose-400 font-semibold text-xs mt-3 underline cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-12">
          {/* Daily AI Insight */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-black/20 to-black/30 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hidden sm:block">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Daily AI Briefing
                  </span>
                  <span className="text-white/40 text-xs">Today</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  Daily Recruitment Market Insight
                </h3>
                <p className="text-slate-200 leading-relaxed text-sm sm:text-base">
                  {data.dailyInsight}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* High Demand Sectors */}
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Critical & High Demand Sectors
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {data.sectors.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-bold text-white leading-tight">
                          {sec.name}
                        </h3>
                        {getDemandBadge(sec.demand)}
                      </div>
                      <p className="text-xs text-slate-250 leading-relaxed">
                        {sec.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-white/40 text-[11px]">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Trend: </span>
                      <span className="font-semibold text-slate-200 capitalize">
                        {sec.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emerging Skills & Tech */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-400" />
                Fastest Growing Skills
              </h2>

              <div className="p-6 border border-white/10 bg-white/5 rounded-2xl">
                <p className="text-xs text-white/50 mb-6 leading-relaxed">
                  AI models tracked this week&apos;s rapid resume matching &amp; search requirements for software developers.
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.emergingSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="py-1.5 px-3 bg-white/10 border border-white/5 rounded-xl text-slate-200 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Live Search & Filter Section */}
      <div className="border-t border-white/10 pt-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-purple-400" />
            AI Live Market Search & Filter
          </h2>
          <p className="text-slate-250 text-sm mt-1">
            Specify a target profession and custom keyword query to evaluate real-time hiring trends.
          </p>
        </div>

        <form onSubmit={handleSearch} className="p-6 border border-white/10 bg-black/25 rounded-2xl space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                Profession Filter
              </label>
              <select
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                className="w-full px-4 py-2 border border-white/10 rounded-xl bg-neutral-950 text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                {PROFESSIONS.map((prof) => (
                  <option key={prof} value={prof} className="bg-[#122b24] text-white">
                    {prof}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-9">
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                Custom Search Query
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Remote React Native demand in Europe or AWS salary trends..."
                  className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-xl bg-neutral-950 text-white focus:outline-none focus:border-purple-500 text-sm placeholder-white/30"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={searchLoading}
              className="flex items-center gap-2 px-6 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition duration-200 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {searchLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Market...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Market Demand
                </>
              )}
            </button>
          </div>
        </form>

        {/* Search Results Display */}
        {searchLoading && (
          <div className="p-10 border border-white/10 bg-white/5 rounded-2xl animate-pulse space-y-4">
            <div className="h-6 w-1/4 bg-white/10 rounded" />
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-4 w-1/2 bg-white/10 rounded" />
          </div>
        )}

        {searchError && (
          <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-2xl text-rose-450 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {searchError}
          </div>
        )}

        {searchResult && (
          <div className="p-6 border border-white/10 bg-white/5 rounded-2xl space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  AI LIVE REPORT
                </span>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-white/40" />
                  {searchResult.profession}
                </h3>
              </div>

              {/* Demand Score Display */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-white/60">
                  Hiring Velocity:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-2xl font-black ${
                      searchResult.demandScore >= 80
                        ? 'text-emerald-450'
                        : searchResult.demandScore >= 50
                        ? 'text-amber-450'
                        : 'text-rose-450'
                    }`}
                  >
                    {searchResult.demandScore}%
                  </span>
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        searchResult.demandScore >= 80
                          ? 'bg-emerald-450'
                          : searchResult.demandScore >= 50
                          ? 'bg-amber-450'
                          : 'bg-rose-450'
                      }`}
                      style={{ width: `${searchResult.demandScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed border-t border-white/10 pt-4">
              {searchResult.summary}
            </p>

            <div className="grid gap-6 sm:grid-cols-3 border-t border-white/10 pt-6">
              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Required Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {searchResult.requiredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="py-1 px-2.5 bg-white/10 border border-white/5 rounded-lg text-slate-200 text-[11px] font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Market Salary Range
                </h4>
                <span className="text-lg font-bold text-white">
                  {searchResult.salaryRange}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Top Hiring Regions
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {searchResult.topRegions.map((region, idx) => (
                    <span
                      key={idx}
                      className="py-1 px-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-[11px] font-bold"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </DashboardShell>
  );
}
