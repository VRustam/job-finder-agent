'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { ArrowLeft, Loader2, Save, Printer, Copy, Check } from 'lucide-react';

export default function CoverLetterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching cover letter:', error);
        router.push('/dashboard/cover-letters');
        return;
      }

      setTitle(data.title);
      setContent(data.content);
      setLoading(false);
    }
    loadData();
  }, [id, supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cover_letters')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      alert('Cover letter saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save cover letter.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardShell userEmail={userEmail}>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userEmail={userEmail}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

      {/* Navigation and Actions Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden animate-fade-in">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cover-letters"
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-bold bg-transparent border-b border-transparent hover:border-neutral-350 focus:border-neutral-900 dark:focus:border-white focus:outline-none px-1 py-0.5 text-neutral-900 dark:text-white w-72 md:w-96"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-neutral-350 dark:border-neutral-750 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Text
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-neutral-350 dark:border-neutral-750 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition cursor-pointer text-neutral-700 dark:text-neutral-300"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-850 dark:hover:bg-neutral-200 active:scale-[0.98] transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Letter'}
          </button>
        </div>
      </div>

      {/* Editor & Document Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
        {/* Left Side: Plain Text Editor */}
        <div className="lg:col-span-6 print:hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-extrabold text-neutral-850 dark:text-neutral-200 mb-4 uppercase tracking-wider">Letter Editor</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            className="w-full p-4 border border-neutral-300 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-950 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-neutral-900 dark:text-white leading-relaxed font-sans"
          />
        </div>

        {/* Right Side: Print Preview Sheet */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 overflow-x-auto print:block">
          <div className="bg-neutral-100 dark:bg-neutral-900/40 p-4 sm:p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-center min-h-[640px] print:bg-white print:border-none print:shadow-none print:p-0 transition-all duration-300">
            <div
              id="print-area"
              className="w-[210mm] min-h-[297mm] p-[20mm] bg-white text-black shadow-lg mx-auto print:shadow-none print:p-0 select-text transition-all duration-300 font-serif leading-relaxed text-sm whitespace-pre-wrap"
              style={{ boxSizing: 'border-box' }}
            >
              {content || 'Your Cover Letter content will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
