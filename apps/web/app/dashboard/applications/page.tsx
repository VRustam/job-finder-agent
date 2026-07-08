'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { ApplicationModal } from '@/app/components/ApplicationModal';
import { Plus, Briefcase, Calendar, Link as LinkIcon, DollarSign, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

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
  { id: 'applied', label: 'Applied', color: 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400' },
  { id: 'interviewing', label: 'Interviewing', color: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400' },
  { id: 'offer', label: 'Offer Received', color: 'border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400' },
  { id: 'rejected', label: 'Rejected', color: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400' }
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
    let nextIndex = currentIndex + (direction === 'right' ? 1 : -1);
    
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
        <button
          onClick={() => handleOpenAddModal('applied')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
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
                className="bg-neutral-100/60 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-850 rounded-2xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column Title Card */}
                <div className={`p-3 border rounded-xl flex justify-between items-center mb-4 ${col.color}`}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-current/10 rounded-full">
                    {columnApps.length}
                  </span>
                </div>

                {/* Create card button inside column */}
                <button
                  onClick={() => handleOpenAddModal(col.id)}
                  className="w-full py-2 flex items-center justify-center gap-1 border border-dashed border-neutral-300 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-450 hover:bg-white dark:hover:bg-neutral-900 text-neutral-500 text-xs font-semibold rounded-xl mb-4 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to this column
                </button>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {columnApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => handleOpenEditModal(app)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs hover:shadow-md hover:border-neutral-350 dark:hover:border-neutral-750 transition-all cursor-pointer group relative flex flex-col justify-between"
                    >
                      <div>
                        {/* Company & Title */}
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-white transition-colors">
                          {app.job_title}
                        </h4>
                        <p className="text-xs text-neutral-550 dark:text-neutral-400 mt-1 font-medium">
                          {app.company_name}
                        </p>

                        {/* Badges/Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3.5">
                          {app.salary_range && (
                            <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 dark:text-neutral-300 dark:bg-neutral-800 px-2 py-0.5 rounded flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3" />
                              {app.salary_range}
                            </span>
                          )}
                          {app.job_link && (
                            <a
                              href={app.job_link.startsWith('http') ? app.job_link : `https://${app.job_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-white px-2 py-0.5 rounded flex items-center gap-0.5 transition"
                            >
                              <LinkIcon className="w-3 h-3" />
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
