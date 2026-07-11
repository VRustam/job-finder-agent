'use client';

import React from 'react';
import {
  FileText,
  Briefcase,
  Mail,
  Compass,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';

type Tab = 'resumes' | 'applications' | 'cover_letters' | 'interviews';

interface ContentItem {
  id: string;
  user_id: string;
  title?: string;
  company_name?: string;
  job_title?: string;
  status?: string;
  overall_score?: number;
  created_at: string;
}

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'resumes', label: 'Resumes', icon: FileText },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'cover_letters', label: 'Cover Letters', icon: Mail },
  { key: 'interviews', label: 'Interviews', icon: Compass },
];

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('resumes');
  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState(false);
  const limit = 20;

  const fetchContent = React.useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/content?${params}`);
      const data = await res.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch {
      console.error('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  React.useEffect(() => { fetchContent(); }, [fetchContent]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)? This action is irreversible.`)) return;
    setDeleting(true);
    try {
      await fetch('/api/admin/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: activeTab, ids: Array.from(selectedIds) }),
      });
      await fetchContent();
    } catch {
      alert('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getItemTitle = (item: ContentItem) => {
    if (activeTab === 'applications') return `${item.company_name} — ${item.job_title}`;
    if (activeTab === 'interviews') return item.job_title || 'Interview Session';
    return item.title || 'Untitled';
  };

  const getItemMeta = (item: ContentItem) => {
    if (activeTab === 'applications' && item.status) {
      const statusColors: Record<string, string> = {
        applied: 'bg-blue-500/20 text-blue-400',
        interviewing: 'bg-amber-500/20 text-amber-400',
        offer: 'bg-emerald-500/20 text-emerald-400',
        rejected: 'bg-red-500/20 text-red-400',
      };
      return (
        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${statusColors[item.status] || 'bg-white/5 text-white/40'}`}>
          {item.status}
        </span>
      );
    }
    if (activeTab === 'interviews' && item.overall_score !== null && item.overall_score !== undefined) {
      return (
        <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-400 rounded-md">
          Score: {item.overall_score}%
        </span>
      );
    }
    return null;
  };

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
          <h2 className="text-2xl font-black tracking-tight text-white">Content Management</h2>
          <p className="text-white/50 text-sm mt-1">View and moderate user-generated content</p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete {selectedIds.size} selected
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="admin-animate flex gap-2 mb-6" style={{ animationDelay: '100ms' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border border-indigo-500/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Table */}
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
                  <th className="px-5 py-3.5 w-10">
                    <button onClick={toggleSelectAll} className="text-white/30 hover:text-white transition-colors cursor-pointer">
                      {selectedIds.size === items.length && items.length > 0
                        ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">User ID</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggleSelect(item.id)} className="text-white/30 hover:text-white transition-colors cursor-pointer">
                        {selectedIds.has(item.id)
                          ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-white truncate max-w-[240px]">
                      {getItemTitle(item)}
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-white/30 font-mono truncate max-w-[120px]">
                      {item.user_id.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-3.5">
                      {getItemMeta(item) || <span className="text-[10px] text-white/20">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-white/30 text-xs">No content found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10">
            <p className="text-[10px] text-white/40">Page {page} of {totalPages} ({total} items)</p>
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
    </div>
  );
}
