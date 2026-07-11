'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { ResumeForm } from '@/app/components/ResumeForm';
import { ResumePreview, ResumeContent } from '@/app/components/ResumePreview';
import { ResumeAIOptimizer } from '@/app/components/ResumeAIOptimizer';
import { ArrowLeft, Loader2, Edit3, Eye, Sparkles, Printer } from 'lucide-react';

export default function ResumeEditPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const id = params.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // Tab view: 'edit' | 'preview' | 'ai'
  const [activePane, setActivePane] = useState<'edit' | 'preview' | 'ai'>('edit');

  // AI Generation states
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const handleAutoGenerate = async () => {
    if (!generatePrompt.trim()) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatePrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      setContent(data);
      if (data.personal?.name) {
        setTitle(`${data.personal.name} Resume`);
      }
      setShowGenerator(false);
      setGeneratePrompt('');
      alert('Resume auto-generated successfully! Click Save Changes to store it.');
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? (err as Error).message : 'Failed to auto-generate resume. Make sure GEMINI_API_KEY is configured.';
      alert(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    async function loadResume() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching resume:', error);
        router.push('/dashboard/resumes');
        return;
      }

      setTitle(data.title);
      setContent(data.content as ResumeContent);
      setLoading(false);
    }

    loadResume();
  }, [id, supabase, router]);

  const [scale, setScale] = useState(0.5);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateScale = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.getBoundingClientRect().width;
      // Subtract padding (e.g. 1.5rem / 24px on each side = 48px)
      const padding = window.innerWidth < 640 ? 16 : 32;
      const availableWidth = width - padding;
      const targetWidth = 794; // Width of 210mm A4 page
      const nextScale = Math.min(availableWidth / targetWidth, 1);
      setScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    // Also use ResizeObserver for more precise updates on panel toggle/render
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        updateScale();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateScale);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && activePane === 'preview') {
        setActivePane('edit');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activePane]);

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('resumes')
        .update({
          title,
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving resume:', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !content) {
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
      {/* Editor top navigation bar */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/resumes"
            className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resume Name"
              className="text-xl font-bold bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-neutral-900 dark:focus:border-white focus:outline-none px-1 py-0.5 text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* View togglers and export actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
              showGenerator
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent'
                : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 text-neutral-700 dark:text-neutral-300 animate-pulse'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Auto-Builder
          </button>

          <div className="flex bg-neutral-200/50 dark:bg-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setActivePane('edit')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activePane === 'edit'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-550 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editor
            </button>
            <button
              onClick={() => setActivePane('preview')}
              className={`lg:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activePane === 'preview'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-550 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => setActivePane('ai')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activePane === 'ai'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-550 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Optimizer
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>

      {/* AI Auto Generator Banner */}
      {showGenerator && (
        <div className="mb-6 p-5 bg-gradient-to-r from-neutral-900 to-neutral-850 dark:from-neutral-900 dark:to-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-md print:hidden transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <h4 className="font-bold text-sm">AI Resume Auto-Builder</h4>
          </div>
          <p className="text-xs text-neutral-300 dark:text-neutral-400 mb-4 font-medium leading-relaxed">
            Describe the role and experience level you want to target (e.g. &quot;Full Stack Developer resume with 3 years of React/Node.js experience&quot;). Gemini will automatically fill out contact info, experience bullet points, education, projects, and skills.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="e.g. Senior Frontend Architect with 6 years experience in Vue and Tailwind..."
              className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-500/20"
            />
            <button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="px-5 py-2.5 bg-white text-neutral-900 font-bold rounded-xl hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 text-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-neutral-900" />
                  Generate Resume
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Editor Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block items-start">
        {/* Left Side: Editor Form */}
        <div className={`lg:col-span-7 print:hidden animate-fade-in ${activePane === 'edit' ? 'block' : 'hidden'}`}>
          <ResumeForm
            initialContent={content}
            onChange={setContent}
            onSave={handleSave}
            saving={saving}
          />
        </div>

        {/* Left Side: AI Optimizer Form */}
        <div className={`lg:col-span-7 print:hidden animate-fade-in ${activePane === 'ai' ? 'block' : 'hidden'}`}>
          <ResumeAIOptimizer resumeContent={content} />
        </div>

        {/* Right Side: Resume Preview Sheet */}
        <div 
          ref={containerRef}
          className={`lg:col-span-5 lg:sticky lg:top-24 print:block ${activePane === 'preview' ? 'block' : 'hidden lg:block'} w-full`}
        >
          <div 
            className="bg-neutral-100 dark:bg-neutral-900/40 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-start justify-center print:bg-white print:border-none print:shadow-none print:p-0 transition-all duration-300 overflow-hidden"
            style={{
              height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `calc(${1123 * scale}px + 2rem)` : 'auto',
              minHeight: '700px',
            }}
          >
            <div 
              className="origin-top transition-all duration-200 print:transform-none"
              style={{
                transform: `scale(${scale})`,
                width: '794px',
                minWidth: '794px',
              }}
            >
              <ResumePreview content={content} />
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
