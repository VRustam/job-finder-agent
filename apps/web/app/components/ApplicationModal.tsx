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
    } catch (err: any) {
      setError(err?.message || 'Failed to save application.');
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
    } catch (err: any) {
      setError(err?.message || 'Failed to delete application.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200 dark:border-neutral-850">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {application ? 'Edit Application' : 'Add Application'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        {application && (
          <div className="flex border-b border-neutral-200 dark:border-neutral-850 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Job Details
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'email'
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-500" />
              AI Recruiter Email
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                    Salary Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. $100k - $120k"
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Job Link / URL (Optional)
                </label>
                <input
                  type="text"
                  value={jobLink}
                  onChange={(e) => setJobLink(e.target.value)}
                  placeholder="https://company.com/careers/job"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Interview dates, tasks, follow-ups, and notes..."
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-850">
                {application && onDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition"
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
                    className="px-4 py-2 text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all"
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
