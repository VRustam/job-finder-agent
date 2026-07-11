'use client';

import React from 'react';
import {
  Search,
  Crown,
  Shield,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Briefcase,
  Compass,
  Mail,
  Languages,
  Link2,
  Calendar,
  Loader2,
} from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  provider: string;
  is_premium: boolean;
  is_admin: boolean;
  created_at: string;
  last_sign_in: string | null;
}

interface UserDetail extends User {
  stats: {
    resumes: number;
    applications: number;
    interviews: number;
    coverLetters: number;
    translations: number;
    syncedJobs: number;
    calendarEvents: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const limit = 20;

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (userId: string, field: 'is_premium' | 'is_admin', currentValue: boolean) => {
    setActionLoading(`${userId}-${field}`);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, field, value: !currentValue }),
      });
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, [field]: !currentValue } : u)
      );
    } catch {
      alert('Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action is irreversible.`)) return;
    setActionLoading(`${userId}-delete`);
    try {
      await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTotal(prev => prev - 1);
    } catch {
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetail = async (userId: string) => {
    setDetailLoading(true);
    setSelectedUser(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
    } catch {
      alert('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

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
      <div className="flex items-center justify-between mb-8 admin-animate">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">User Management</h2>
          <p className="text-white/50 text-sm mt-1">{total} registered users</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="admin-animate mb-6" style={{ animationDelay: '100ms' }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="admin-animate flowty-card overflow-hidden" style={{ animationDelay: '200ms' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Provider</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Premium</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Admin</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(u.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {(u.full_name || '?')[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-white truncate max-w-[140px]">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/60 truncate max-w-[180px]">{u.email || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold text-white/40 uppercase bg-white/5 px-2 py-0.5 rounded-md">{u.provider}</span>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggle(u.id, 'is_premium', u.is_premium)}
                        disabled={actionLoading === `${u.id}-is_premium`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          u.is_premium
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        {actionLoading === `${u.id}-is_premium` ? '...' : u.is_premium ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggle(u.id, 'is_admin', u.is_admin)}
                        disabled={actionLoading === `${u.id}-is_admin`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          u.is_admin
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {actionLoading === `${u.id}-is_admin` ? '...' : u.is_admin ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(u.id, u.full_name || u.email)}
                        disabled={actionLoading === `${u.id}-delete`}
                        className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      >
                        {actionLoading === `${u.id}-delete` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-white/30 text-xs">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10">
            <p className="text-[10px] text-white/40">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedUser(null); setDetailLoading(false); }}>
          <div className="bg-[#1a3f34] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setSelectedUser(null); setDetailLoading(false); }}
              className="absolute top-4 right-4 p-1.5 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : selectedUser && (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                    {(selectedUser.full_name || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedUser.full_name || 'Unknown'}</h3>
                    <p className="text-xs text-white/50">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedUser.is_premium && <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 rounded-md uppercase">Premium</span>}
                      {selectedUser.is_admin && <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded-md uppercase">Admin</span>}
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-white/5 text-white/40 rounded-md uppercase">{selectedUser.provider}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Resumes', value: selectedUser.stats.resumes, icon: FileText, color: 'text-blue-400' },
                    { label: 'Applications', value: selectedUser.stats.applications, icon: Briefcase, color: 'text-amber-400' },
                    { label: 'Interviews', value: selectedUser.stats.interviews, icon: Compass, color: 'text-purple-400' },
                    { label: 'Cover Letters', value: selectedUser.stats.coverLetters, icon: Mail, color: 'text-sky-400' },
                    { label: 'Translations', value: selectedUser.stats.translations, icon: Languages, color: 'text-teal-400' },
                    { label: 'Synced Jobs', value: selectedUser.stats.syncedJobs, icon: Link2, color: 'text-blue-400' },
                    { label: 'Events', value: selectedUser.stats.calendarEvents, icon: Calendar, color: 'text-violet-400' },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="p-3 bg-white/5 rounded-xl text-center">
                        <Icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                        <p className="text-base font-black text-white">{s.value}</p>
                        <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-white/30 border-t border-white/10 pt-3">
                  <span>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  {selectedUser.last_sign_in && (
                    <span>Last login: {new Date(selectedUser.last_sign_in).toLocaleDateString()}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
