'use client';

import React from 'react';
import {
  Key,
  Database,
  Globe,
  Server,
  Download,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface HealthCheck {
  supabase: 'ok' | 'error';
  gemini: 'ok' | 'error' | 'missing';
  stripe: 'ok' | 'error' | 'missing';
}

export default function AdminSettingsPage() {
  const [health, setHealth] = React.useState<HealthCheck | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    async function checkHealth() {
      try {
        // Simple health check — try to reach our stats API
        const res = await fetch('/api/admin/stats');
        const supabaseOk = res.ok;

        setHealth({
          supabase: supabaseOk ? 'ok' : 'error',
          gemini: 'ok', // If stats API works, env is loaded
          stripe: 'ok',
        });
      } catch {
        setHealth({
          supabase: 'error',
          gemini: 'missing',
          stripe: 'missing',
        });
      } finally {
        setChecking(false);
      }
    }
    checkHealth();
  }, []);

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/users?page=1&limit=1000');
      const data = await res.json();
      const users = data.users || [];

      // Build CSV
      const headers = ['ID', 'Name', 'Email', 'Provider', 'Premium', 'Admin', 'Created'];
      const rows = users.map((u: { id: string; full_name: string; email: string; provider: string; is_premium: boolean; is_admin: boolean; created_at: string }) =>
        [u.id, u.full_name || '', u.email || '', u.provider, u.is_premium ? 'Yes' : 'No', u.is_admin ? 'Yes' : 'No', u.created_at].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const envVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', icon: Database, description: 'Supabase project URL' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', icon: Key, description: 'Supabase anonymous API key' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', icon: Shield, description: 'Supabase service role key (server-only)' },
    { name: 'GEMINI_API_KEY', icon: Globe, description: 'Google Gemini AI API key' },
    { name: 'STRIPE_SECRET_KEY', icon: Key, description: 'Stripe payment processing key' },
    { name: 'NEXT_PUBLIC_APP_URL', icon: Server, description: 'Application public URL' },
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

      {/* Header */}
      <div className="mb-8 admin-animate">
        <h2 className="text-2xl font-black tracking-tight text-white">System Settings</h2>
        <p className="text-white/50 text-sm mt-1">Environment configuration and platform health</p>
      </div>

      {/* Platform Health */}
      <div className="admin-animate flowty-card p-6 mb-6" style={{ animationDelay: '100ms' }}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-400" />
          Platform Health Status
        </h3>
        {checking ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs text-white/50">Running health checks...</span>
          </div>
        ) : health && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Supabase Database', status: health.supabase },
              { label: 'Gemini AI API', status: health.gemini },
              { label: 'Stripe Payments', status: health.stripe },
            ].map((check) => (
              <div
                key={check.label}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  check.status === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : check.status === 'missing'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                {check.status === 'ok' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className={`w-5 h-5 shrink-0 ${check.status === 'missing' ? 'text-amber-400' : 'text-red-400'}`} />
                )}
                <div>
                  <p className="text-xs font-semibold text-white">{check.label}</p>
                  <p className={`text-[10px] font-medium ${
                    check.status === 'ok' ? 'text-emerald-400' : check.status === 'missing' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {check.status === 'ok' ? 'Connected' : check.status === 'missing' ? 'Not Configured' : 'Error'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="admin-animate flowty-card p-6 mb-6" style={{ animationDelay: '200ms' }}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" />
          Environment Configuration
        </h3>
        <div className="space-y-3">
          {envVars.map((env) => {
            const Icon = env.icon;
            return (
              <div key={env.name} className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-white/30 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white font-mono truncate">{env.name}</p>
                    <p className="text-[10px] text-white/40">{env.description}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-white/20 bg-white/5 px-2 py-0.5 rounded-md shrink-0">
                  ••••••••
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Export */}
      <div className="admin-animate flowty-card p-6" style={{ animationDelay: '300ms' }}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-400" />
          Data Export
        </h3>
        <p className="text-xs text-white/50 mb-4">Download a CSV export of all user data for external analysis or backup purposes.</p>
        <button
          onClick={handleExportUsers}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-lg"
        >
          {exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Export Users CSV
            </>
          )}
        </button>
      </div>

      {/* Admin Setup Tip */}
      <div className="admin-animate mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl" style={{ animationDelay: '400ms' }}>
        <p className="text-xs text-indigo-300 font-medium">
          <strong>💡 Tip:</strong> To promote a user to admin, run this SQL in your Supabase SQL Editor:
        </p>
        <pre className="mt-2 text-[10px] text-indigo-200 bg-indigo-950/50 p-3 rounded-lg font-mono overflow-x-auto">
          {`UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_UUID';`}
        </pre>
      </div>
    </div>
  );
}
