'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { ResumeContent } from './ResumePreview';

interface ResumeAIOptimizerProps {
  resumeContent: ResumeContent;
}

interface OptimizationResult {
  score: number;
  missingKeywords: string[];
  suggestedRewrites: {
    original: string;
    suggested: string;
    rationale: string;
  }[];
}

export function ResumeAIOptimizer({ resumeContent }: ResumeAIOptimizerProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: resumeContent,
          jobDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to query optimization API');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during optimization.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-red-650 dark:text-red-400 border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col h-[780px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          AI Resume Optimizer
        </h3>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Job Description Input */}
        <div className="mb-4 flex flex-col flex-1 min-h-[150px]">
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
            Target Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description you are targeting here..."
            className="flex-1 w-full p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-500/20 resize-none min-h-[120px]"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-600 dark:text-red-400 font-semibold">
            {error}
          </div>
        )}

        <button
          onClick={handleOptimize}
          disabled={loading}
          className="w-full py-3 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 mb-6"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing Resume...
            </>
          ) : (
            <>
              <Sparkles className="w-4.5 h-4.5" />
              Optimize Against Job Description
            </>
          )}
        </button>

        {/* Results Panel */}
        <div className="flex-1 overflow-y-auto pr-1">
          {result ? (
            <div className="space-y-6">
              {/* Score card */}
              <div className={`p-4 border rounded-xl flex items-center justify-between ${getScoreColor(result.score)}`}>
                <div>
                  <h4 className="text-sm font-bold">ATS Match Score</h4>
                  <p className="text-[10px] opacity-80 mt-0.5">Based on keyword density & relevance</p>
                </div>
                <div className="text-3xl font-black">{result.score}%</div>
              </div>

              {/* Missing keywords */}
              <div>
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                  Suggested Keywords to Add
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.length > 0 ? (
                    result.missingKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold px-2.5 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 rounded-md"
                      >
                        +{kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" /> No missing keywords found!
                    </span>
                  )}
                </div>
              </div>

              {/* Suggested Bullet Points */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                  Bullet Point Rewrites
                </h4>
                {result.suggestedRewrites.map((rewrite, idx) => (
                  <div key={idx} className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-neutral-400">Original:</span>
                      <p className="text-neutral-500 line-through mt-0.5">{rewrite.original}</p>
                    </div>
                    <div>
                      <span className="font-bold text-green-600 dark:text-green-400">Suggested:</span>
                      <p className="text-neutral-800 dark:text-neutral-100 font-medium mt-0.5">{rewrite.suggested}</p>
                    </div>
                    <div className="pt-1.5 border-t border-neutral-200/50 dark:border-neutral-800/50 flex items-start gap-1 text-[10px] text-neutral-500">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{rewrite.rationale}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400/80 p-4">
                <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-medium">
                  Paste a job description and click optimize to receive keyword matching results and rewrite suggestions.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
