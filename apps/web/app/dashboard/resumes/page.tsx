'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { FileText, Plus, Calendar, ArrowRight, Loader2, Trash2 } from 'lucide-react';

interface Resume {
  id: string;
  title: string;
  updated_at: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleDeleteResume = async (e: React.MouseEvent, resumeId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) throw error;

      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert('Failed to delete resume.');
    }
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setResumes(data);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleCreateResume = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const blankContent = {
        personal: { name: '', email: user.email || '', phone: '', website: '', summary: '' },
        experience: [],
        education: [],
        skills: [],
        projects: []
      };

      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: 'Untitled Resume',
          content: blankContent
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        router.push(`/dashboard/resumes/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating resume:', err);
      alert('Failed to create new resume.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardShell userEmail={userEmail}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">My Resumes</h2>
          <p className="text-sm text-neutral-500 mt-1">Manage and optimize your professional resumes.</p>
        </div>
        <button
          onClick={handleCreateResume}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Create New Resume
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="border-2 border-dashed border-neutral-250 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-8 bg-white dark:bg-neutral-900/50">
          <FileText className="w-12 h-12 mx-auto text-neutral-400 mb-4 opacity-75" />
          <h3 className="text-lg font-bold text-neutral-850 dark:text-neutral-200">No resumes yet</h3>
          <p className="text-sm text-neutral-500 mt-2 max-w-xs mx-auto">
            Create your first professional resume and start optimizing it with AI keyword tools.
          </p>
          <button
            onClick={handleCreateResume}
            disabled={creating}
            className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm"
          >
            Create your first resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-neutral-350 dark:hover:border-neutral-750 transition-all flex flex-col justify-between h-48 group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-850 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <button
                    onClick={(e) => handleDeleteResume(e, resume.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-lg transition-all"
                    title="Delete Resume"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                <h4 className="font-bold text-neutral-900 dark:text-white truncate">{resume.title}</h4>
                <p className="text-[11px] text-neutral-450 dark:text-neutral-500 mt-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Updated {new Date(resume.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/dashboard/resumes/${resume.id}`}
                className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-500 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors"
              >
                <span>Edit & Optimize</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
