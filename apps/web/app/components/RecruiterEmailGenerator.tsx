'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Copy, Check, FileText, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Resume {
  id: string;
  title: string;
  content: any;
}

interface RecruiterEmailGeneratorProps {
  companyName: string;
  jobTitle: string;
}

export function RecruiterEmailGenerator({ companyName, jobTitle }: RecruiterEmailGeneratorProps) {
  const supabase = createClient();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumesLoading, setResumesLoading] = useState(true);

  useEffect(() => {
    async function loadResumes() {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, content')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setResumes(data);
        if (data.length > 0) {
          setSelectedResumeId(data[0].id);
        }
      }
      setResumesLoading(false);
    }
    loadResumes();
  }, [supabase]);

  const handleGenerate = async () => {
    const selectedResume = resumes.find((r) => r.id === selectedResumeId);
    if (!selectedResume) {
      setError('Please select a resume first.');
      return;
    }

    setLoading(true);
    setError(null);
    setEmailText('');

    try {
      const response = await fetch('/api/applications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: selectedResume.content,
          jobTitle,
          companyName,
          tone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outreach email');
      }

      const data = await response.json();
      setEmailText(data.emailText);
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred during email generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (resumesLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="py-6 text-center border border-dashed border-neutral-250 dark:border-neutral-800 rounded-xl bg-neutral-50/50 dark:bg-neutral-950/20 p-4">
        <FileText className="w-8 h-8 text-neutral-400 mx-auto mb-2.5 opacity-85" />
        <h5 className="font-bold text-xs text-neutral-800 dark:text-neutral-200">No Resumes Found</h5>
        <p className="text-[11px] text-neutral-500 mt-1 max-w-xs mx-auto">
          You need to create a resume in the Resume Builder first to generate a tailored email matching your experience.
        </p>
        <Link
          href="/dashboard/resumes"
          className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 font-bold rounded-lg hover:bg-neutral-850 dark:hover:bg-neutral-200 text-xs active:scale-[0.98] transition-all"
        >
          Go to Resume Builder
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Resume Selector */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
            Select Base Resume
          </label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.title}
              </option>
            ))}
          </select>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
            Outreach Tone
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
          >
            <option value="Professional">Professional (Respectful & Structured)</option>
            <option value="Confident">Confident (Bold & Value-focused)</option>
            <option value="Enthusiastic">Enthusiastic (Warm & Passionate)</option>
            <option value="Casual">Casual (Friendly & Concise)</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            Drafting Email...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Recruiter Email
          </>
        )}
      </button>

      {/* Generated Email Content */}
      {emailText && (
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              Draft Outreach Copy
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 py-1 px-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-805 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Email
                </>
              )}
            </button>
          </div>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={12}
            className="w-full p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
