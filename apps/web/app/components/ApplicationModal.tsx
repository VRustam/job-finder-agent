'use client';

import React, { useState } from 'react';
import { X, Briefcase, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { RecruiterEmailGenerator } from './RecruiterEmailGenerator';

interface Application {
  id?: string;
  company_name: string;
  job_title: string;
  status: 'applied' | 'interviewing' | 'offer' | 'rejected';
  salary_range: string;
  job_link: string;
  notes: string;
}

interface ApplicationModalProps {
  application?: Application | null; // null if creating a new one
  defaultStatus?: 'applied' | 'interviewing' | 'offer' | 'rejected';
  onClose: () => void;
  onSave: (app: Partial<Application>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ApplicationModal({
  application,
  defaultStatus = 'applied',
  onClose,
  onSave,
  onDelete,
}: ApplicationModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'email'>('details');
  
  const [companyName, setCompanyName] = useState(application?.company_name || '');
  const [jobTitle, setJobTitle] = useState(application?.job_title || '');
  const [status, setStatus] = useState<Application['status']>(application?.status || defaultStatus);
  const [salaryRange, setSalaryRange] = useState(application?.salary_range || '');
  const [jobLink, setJobLink] = useState(application?.job_link || '');
  const [notes, setNotes] = useState(application?.notes || '');
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      setError('Company Name and Job Title are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: application?.id,
        company_name: companyName,
        job_title: jobTitle,
        status,
        salary_range: salaryRange,
        job_link: jobLink,
        notes,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to save application.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!application?.id || !onDelete) return;
    if (!confirm('Are you sure you want to delete this job application?')) return;

    setDeleting(true);
    setError(null);

    try {
      await onDelete(application.id);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete application.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#122b24] border border-white/10 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            {application ? 'Edit Application' : 'Add Application'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        {application && (
          <div className="flex border-b border-white/10 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Job Details
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'email'
                  ? 'border-white text-white'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              AI Recruiter Email
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none placeholder-white/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="applied" className="bg-[#122b24] text-white">Applied</option>
                    <option value="interviewing" className="bg-[#122b24] text-white">Interviewing</option>
                    <option value="offer" className="bg-[#122b24] text-white">Offer</option>
                    <option value="rejected" className="bg-[#122b24] text-white">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $100k - $120k"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                  Job Link / URL (Optional)
                </label>
                <input
                  type="text"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://company.com/careers/job"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none placeholder-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Interview dates, tasks, follow-ups, and notes..."
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none resize-none placeholder-white/30"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                {application && onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold border border-white/10 hover:bg-white/5 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer shadow-lg"
                  >
                    {saving ? 'Saving...' : 'Save Application'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <RecruiterEmailGenerator companyName={companyName} jobTitle={jobTitle} />
          )}
        </div>
      </div>
    </div>
  );
}
