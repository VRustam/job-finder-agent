'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { ApplicationModal } from '@/app/components/ApplicationModal';
import { Plus, Calendar, Link as LinkIcon, DollarSign, ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface Application {
  id: string;
  company_name: string;
  job_title: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  salary_range: string;
  job_link: string;
  notes: string;
  updated_at: string;
}

const COLUMNS: { id: Application['status']; label: string; color: string }[] = [
  { id: 'applied', label: 'Applied', color: 'border-blue-400/20 bg-blue-500/10 text-blue-300' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-amber-400/20 bg-amber-500/10 text-amber-300' },
  { id: 'offer', label: 'Offer Received', color: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' },
  { id: 'rejected', label: 'Rejected', color: 'border-red-400/20 bg-red-500/10 text-red-300' }
];

export default function ApplicationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<Application['status']>('applied');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setApplications(data as Application[]);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleOpenAddModal = (status: Application['status']) => {
    setSelectedApp(null);
    setModalDefaultStatus(status);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (app: Application) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const handleSaveApplication = async (appData: Partial<Application>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (appData.id) {
      // Update
      const { error } = await supabase
        .from('applications')
        .update({
          ...appData,
          updated_at: new Date().toISOString()
        })
        .eq('id', appData.id);

      if (error) throw error;

      setApplications(prev =>
        prev.map(item => (item.id === appData.id ? { ...item, ...appData } as Application : item))
      );
    } else {
      // Create
      const { data, error } = await supabase
        .from('applications')
        .insert({
          ...appData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setApplications(prev => [data as Application, ...prev]);
      }
    }
  };

  const handleDeleteApplication = async (id: string) => {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setApplications(prev => prev.filter(item => item.id !== id));
  };

  const shiftStatus = async (e: React.MouseEvent, app: Application, direction: 'left' | 'right') => {
    e.stopPropagation(); // Avoid triggering openEditModal
    
    const currentIndex = COLUMNS.findIndex(c => c.id === app.status);
    const nextIndex = currentIndex + (direction === 'right' ? 1 : -1);
    
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;
    
    const nextStatus = COLUMNS[nextIndex].id;

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', app.id);

      if (error) throw error;

      setApplications(prev =>
        prev.map(item => (item.id === app.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      console.error('Error shifting application status:', err);
      alert('Failed to update status.');
    }
  };

  return (
    <DashboardShell userEmail={userEmail}>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Job Applications</h2>
          <p className="text-sm text-neutral-500 mt-1">Track interview statuses and generate recruiter outreach drafts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/applications/daily"
            className="flex items-center gap-1.5 px-4 py-2.5 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold rounded-lg transition-all text-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Daily AI Digest
          </Link>
          <button
            onClick={() => handleOpenAddModal('applied')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Application
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        /* Kanban Grid columns */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map((col) => {
            const columnApps = applications.filter((app) => app.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-black/25 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column Title Card */}
                <div className={`p-3 border rounded-xl flex justify-between items-center mb-4 ${col.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-current/15 rounded-full">
                    {columnApps.length}
                  </span>
                </div>

                {/* Create card button inside column */}
                <button
                  onClick={() => handleOpenAddModal(col.id)}
                  className="w-full py-2 flex items-center justify-center gap-1 border border-dashed border-white/15 hover:border-white/35 hover:bg-white/5 text-white/50 text-xs font-semibold rounded-xl mb-4 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to this column
                </button>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {columnApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => handleOpenEditModal(app)}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-white/20 transition-all cursor-pointer group relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Company & Title */}
                        <h4 className="font-bold text-sm text-white group-hover:text-white transition-colors">
                          {app.job_title}
                        </h4>
                        <p className="text-xs text-white/60 mt-1 font-medium">
                          {app.company_name}
                        </p>

                        {/* Badges/Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3.5">
                          {app.salary_range && (
                            <span className="text-[10px] font-bold text-white bg-white/10 border border-white/5 px-2 py-0.5 rounded flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3 text-indigo-400" />
                              {app.salary_range}
                            </span>
                          )}
                          {app.job_link && (
                            <a
                              href={app.job_link.startsWith('http') ? app.job_link : `https://${app.job_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold text-white hover:text-indigo-300 bg-white/10 border border-white/5 hover:bg-white/15 px-2 py-0.5 rounded flex items-center gap-0.5 transition"
                            >
                              <LinkIcon className="w-3 h-3 text-indigo-400" />
                              Link
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Card Footer actions */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(app.updated_at).toLocaleDateString()}
                        </span>
                        
                        {/* Directional status shifts */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.status !== 'applied' && (
                            <button
                              onClick={(e) => shiftStatus(e, app, 'left')}
                              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition text-neutral-550 hover:text-neutral-900 dark:hover:text-white"
                              title="Move Left"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {app.status !== 'rejected' && (
                            <button
                              onClick={(e) => shiftStatus(e, app, 'right')}
                              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded transition text-neutral-550 hover:text-neutral-900 dark:hover:text-white"
                              title="Move Right"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnApps.length === 0 && (
                    <div className="h-28 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800/40 rounded-xl text-[11px] text-neutral-400 font-medium">
                      No applications
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog overlay */}
      {isModalOpen && (
        <ApplicationModal
          application={selectedApp}
          defaultStatus={modalDefaultStatus}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveApplication}
          onDelete={handleDeleteApplication}
        />
      )}
    </DashboardShell>
  );
}
