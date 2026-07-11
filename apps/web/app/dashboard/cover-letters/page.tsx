'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { FileText, Plus, Calendar, ArrowRight, Loader2, Trash2, Sparkles, Copy, Check } from 'lucide-react';

interface CoverLetter {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

interface ResumeOption {
  id: string;
  title: string;
}

export default function CoverLettersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      // Load Cover Letters
      const { data: clData, error: clErr } = await supabase
        .from('cover_letters')
        .select('id, title, content, updated_at')
        .order('updated_at', { ascending: false });

      // Load Resumes (as options for generation)
      const { data: resData } = await supabase
        .from('resumes')
        .select('id, title')
        .order('updated_at', { ascending: false });

      if (!clErr && clData) {
        setCoverLetters(clData);
      }
      if (resData) {
        setResumes(resData);
        if (resData.length > 0) {
          setSelectedResumeId(resData[0].id);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this cover letter?')) return;

    try {
      const { error } = await supabase.from('cover_letters').delete().eq('id', id);
      if (error) throw error;
      setCoverLetters(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete cover letter.');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !companyName.trim()) {
      alert('Please fill out Job Title and Company Name.');
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/cover-letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId || null,
          jobTitle,
          companyName,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      const generatedContent = data.content;

      // Save to Database
      const { data: insertData, error: insertErr } = await supabase
        .from('cover_letters')
        .insert({
          user_id: user.id,
          resume_id: selectedResumeId || null,
          title: `${jobTitle} Cover Letter (${companyName})`,
          content: generatedContent,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setShowModal(false);
      // Reset form
      setJobTitle('');
      setCompanyName('');
      setJobDescription('');

      if (insertData) {
        router.push(`/dashboard/cover-letters/${insertData.id}`);
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Failed to generate cover letter.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (e: React.MouseEvent, id: string, content: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardShell userEmail={userEmail}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="animate-slide-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">AI Cover Letters</h2>
            <p className="text-sm text-neutral-500 mt-1">Generate and manage cover letters tailored for specific jobs.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Cover Letter
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          </div>
        ) : coverLetters.length === 0 ? (
          <div className="border-2 border-dashed border-neutral-250 dark:border-neutral-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-8 bg-white dark:bg-neutral-900/50">
            <FileText className="w-12 h-12 mx-auto text-neutral-400 mb-4 opacity-75" />
            <h3 className="text-lg font-bold text-neutral-850 dark:text-neutral-200">No cover letters yet</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-xs mx-auto">
              Create your first tailored cover letter using Gemini AI.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition-all text-sm cursor-pointer"
            >
              Generate your first cover letter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverLetters.map((cl) => (
              <div
                key={cl.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-neutral-350 dark:hover:border-neutral-750 transition-all flex flex-col justify-between h-48 group cursor-pointer"
                onClick={() => router.push(`/dashboard/cover-letters/${cl.id}`)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-850 rounded-lg flex items-center justify-center text-neutral-600 dark:text-neutral-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleCopy(e, cl.id, cl.content)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-lg transition-all"
                        title="Copy Content"
                      >
                        {copiedId === cl.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, cl.id)}
                        className="p-2 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-lg transition-all"
                        title="Delete Cover Letter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-bold text-neutral-900 dark:text-white truncate">{cl.title}</h4>
                  <p className="text-[11px] text-neutral-450 dark:text-neutral-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {new Date(cl.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div
                  className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-500 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal dialog for generating new cover letter */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#122b24] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-lg font-bold text-white">AI Cover Letter Builder</h3>
              </div>
              
              <form onSubmit={handleGenerate} className="space-y-4">
                {resumes.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Select Resume Profile</label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-white/10 bg-neutral-950 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-white"
                    >
                      <option value="" className="bg-[#122b24] text-white">No Resume Profile (Generic Letter)</option>
                      {resumes.map(r => (
                        <option key={r.id} value={r.id} className="bg-[#122b24] text-white">{r.title}</option>
                      ))}
                    </select>
                  </div>
                )}
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Job Title *</label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. React Engineer"
                      className="w-full px-3 py-2.5 border border-white/10 bg-neutral-950 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full px-3 py-2.5 border border-white/10 bg-neutral-950 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-white/30"
                    />
                  </div>
                </div>
 
                <div>
                  <label className="block text-xs font-bold text-white/50 mb-1.5 uppercase tracking-wider">Job Description (Optional)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job details here to target specific keywords..."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-white/10 bg-neutral-950 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 text-white placeholder-white/30"
                  />
                </div>
 
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-semibold hover:bg-white/5 text-white/60 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer shadow-lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Letter
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
