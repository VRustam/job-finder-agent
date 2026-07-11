'use client';

import React from 'react';
import {
  Users,
  Crown,
  FileText,
  Briefcase,
  Compass,
  Mail,
  Languages,
  Link2,
  Calendar,
  TrendingUp,
  UserPlus,
  Shield,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  adminUsers: number;
  totalResumes: number;
  totalApplications: number;
  totalInterviews: number;
  totalCoverLetters: number;
  totalTranslations: number;
  totalSyncedJobs: number;
  totalCalendarEvents: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  recentUsers: Array<{
    id: string;
    full_name: string;
    created_at: string;
    is_premium: boolean;
    is_admin: boolean;
  }>;
  signupChart: Array<{ date: string; count: number }>;
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

function MiniBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-[3px] h-32 w-full">
      {data.map((d, i) => (
        <div
          key={d.date}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-purple-500 opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer relative group min-w-[4px]"
          style={{
            height: `${Math.max((d.count / max) * 100, 4)}%`,
            animationDelay: `${i * 20}ms`,
          }}
          title={`${d.date}: ${d.count} users`}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {d.date.slice(5)}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ premium, free }: { premium: number; free: number }) {
  const total = premium + free;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-white/40 text-xs">No data</p>
      </div>
    );
  }
  const premiumPct = (premium / total) * 100;
  const freePct = (free / total) * 100;
  const circumference = 2 * Math.PI * 45;
  const premiumDash = (premiumPct / 100) * circumference;
  const freeDash = (freePct / 100) * circumference;

  return (
    <div className="flex items-center justify-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke="url(#premiumGrad)"
          strokeWidth="14"
          strokeDasharray={`${premiumDash} ${circumference}`}
          strokeDashoffset="0"
          transform="rotate(-90 60 60)"
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="14"
          strokeDasharray={`${freeDash} ${circumference}`}
          strokeDashoffset={`${-premiumDash}`}
          transform="rotate(-90 60 60)"
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="premiumGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <text x="60" y="56" textAnchor="middle" className="fill-white text-lg font-black">{total}</text>
        <text x="60" y="72" textAnchor="middle" className="fill-white/40 text-[9px] font-medium">total</text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500" />
          <span className="text-xs text-white/70">Premium: {premium}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/20" />
          <span className="text-xs text-white/70">Free: {free}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Failed to load stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{error || 'Failed to load'}</p>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, gradient: 'from-blue-600 to-cyan-500' },
    { label: 'Premium Users', value: stats.premiumUsers, icon: Crown, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Admins', value: stats.adminUsers, icon: Shield, gradient: 'from-red-500 to-pink-500' },
    { label: 'New This Week', value: stats.newUsersThisWeek, icon: UserPlus, gradient: 'from-emerald-500 to-green-500' },
    { label: 'Resumes', value: stats.totalResumes, icon: FileText, gradient: 'from-indigo-500 to-purple-500' },
    { label: 'Applications', value: stats.totalApplications, icon: Briefcase, gradient: 'from-amber-600 to-yellow-500' },
    { label: 'Interviews', value: stats.totalInterviews, icon: Compass, gradient: 'from-purple-500 to-fuchsia-500' },
    { label: 'Cover Letters', value: stats.totalCoverLetters, icon: Mail, gradient: 'from-sky-500 to-blue-500' },
    { label: 'Translations', value: stats.totalTranslations, icon: Languages, gradient: 'from-teal-500 to-emerald-500' },
    { label: 'Synced Jobs', value: stats.totalSyncedJobs, icon: Link2, gradient: 'from-blue-700 to-blue-500' },
    { label: 'Calendar Events', value: stats.totalCalendarEvents, icon: Calendar, gradient: 'from-violet-500 to-purple-500' },
    { label: 'New This Month', value: stats.newUsersThisMonth, icon: TrendingUp, gradient: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div>
      <style>{`
        @keyframes adminSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-animate {
          animation: adminSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Page Title */}
      <div className="mb-8 admin-animate">
        <h2 className="text-2xl font-black tracking-tight text-white">Platform Overview</h2>
        <p className="text-white/50 text-sm mt-1">Real-time analytics and system health</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="admin-animate flowty-card p-5 flex items-center gap-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  <AnimatedCounter target={card.value} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Signup Chart */}
        <div className="admin-animate flowty-card p-6" style={{ animationDelay: '600ms' }}>
          <h3 className="text-sm font-bold text-white mb-4">User Signups — Last 30 Days</h3>
          <MiniBarChart data={stats.signupChart} />
        </div>

        {/* Donut Chart */}
        <div className="admin-animate flowty-card p-6" style={{ animationDelay: '650ms' }}>
          <h3 className="text-sm font-bold text-white mb-4">Premium vs Free Distribution</h3>
          <DonutChart premium={stats.premiumUsers} free={stats.totalUsers - stats.premiumUsers} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-animate flowty-card p-6" style={{ animationDelay: '700ms' }}>
        <h3 className="text-sm font-bold text-white mb-4">Recent Signups</h3>
        <div className="space-y-3">
          {stats.recentUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {(u.full_name || '?')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{u.full_name || 'Unknown'}</p>
                  <p className="text-[10px] text-white/40">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.is_premium && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 rounded-md uppercase">Premium</span>
                )}
                {u.is_admin && (
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded-md uppercase">Admin</span>
                )}
              </div>
            </div>
          ))}
          {stats.recentUsers.length === 0 && (
            <p className="text-center text-white/30 text-xs py-6">No users yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
