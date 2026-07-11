'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { 
  Compass, Play, Calendar, ChevronRight, 
  Trash2, AlertCircle, ArrowLeft, Loader2, BookOpen, Send,
  Mic, MicOff
} from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: number;
  question: string;
  type: 'technical' | 'behavioral' | 'general';
}

interface AnswerFeedback {
  questionId: number;
  questionText: string;
  userAnswer: string;
  score: number;
  feedback: string;
  suggestedAnswer: string;
}

interface InterviewSession {
  id: string;
  job_title: string;
  job_description: string;
  questions: Question[];
  answers: AnswerFeedback[];
  overall_score: number | null;
  created_at: string;
  resume_id: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface Resume {
  id: string;
  title: string;
}

export default function InterviewCoachPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [startLoading, setStartLoading] = useState(false);

  // Active Session states
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Web Speech API is not supported in this browser. Please use Chrome or Safari.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setUserAnswer(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      // Load sessions
      const { data: sessionsData } = await supabase
        .from('interview_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionsData) {
        setSessions(sessionsData as InterviewSession[]);
      }

      // Load resumes
      const { data: resumesData } = await supabase
        .from('resumes')
        .select('id, title')
        .order('updated_at', { ascending: false });

      if (resumesData) {
        setResumes(resumesData);
        if (resumesData.length > 0) {
          setSelectedResumeId(resumesData[0].id);
        }
      }

      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      setError('Job title is required.');
      return;
    }

    setStartLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: selectedResumeId || null,
          jobTitle,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start session');
      }

      const data = await response.json();
      
      // Fetch full active session from DB (to keep schema aligned)
      const { data: fullSession } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', data.sessionId)
        .single();

      if (fullSession) {
        setActiveSession(fullSession as InterviewSession);
        setCurrentQuestionIndex(0);
        setUserAnswer('');
        setCurrentFeedback(null);
        setReviewMode(false);
        // Add to history list
        setSessions(prev => [fullSession as InterviewSession, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'Failed to start interview practice.');
    } finally {
      setStartLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession) return;
    const currentQuestion = activeSession.questions[currentQuestionIndex];
    
    setSubmittingAnswer(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          userAnswer: userAnswer.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate answer');
      }

      const feedbackData = await response.json();
      
      const newFeedbackItem: AnswerFeedback = {
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        userAnswer: userAnswer.trim(),
        score: feedbackData.score,
        feedback: feedbackData.feedback,
        suggestedAnswer: feedbackData.suggestedAnswer,
      };

      setCurrentFeedback(newFeedbackItem);

      // Update activeSession answers locally
      setActiveSession(prev => {
        if (!prev) return null;
        const answers = [...prev.answers.filter(a => a.questionId !== currentQuestion.id), newFeedbackItem];
        return {
          ...prev,
          answers,
          overall_score: feedbackData.isFinished 
            ? Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length)
            : prev.overall_score
        };
      });

    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'Failed to evaluate your response.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = () => {
    if (!activeSession) return;
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < activeSession.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setUserAnswer('');
      setCurrentFeedback(null);
    } else {
      // Completed! Switch to review mode
      setReviewMode(true);
      // Reload sessions list to update scores
      supabase
        .from('interview_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) setSessions(data as InterviewSession[]);
        });
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await supabase.from('interview_sessions').delete().eq('id', id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSession?.id === id) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleReviewSession = (session: InterviewSession) => {
    setActiveSession(session);
    setReviewMode(true);
  };

  if (loading) {
    return (
      <DashboardShell userEmail={userEmail}>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      </DashboardShell>
    );
  }

  // --- RENDERING ACTIVE SESSION / REVIEW MODE ---
  if (activeSession) {
    const totalQuestions = activeSession.questions.length;

    // Review mode showing total summaries
    if (reviewMode) {
      return (
        <DashboardShell userEmail={userEmail}>
          <div className="max-w-3xl mx-auto space-y-6">
            <button
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to History
            </button>

            {/* Completion Banner */}
            <div className="p-6 bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-transparent border border-purple-500/20 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  Practice Complete
                </span>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mt-2">
                  {activeSession.job_title} Simulator
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Practiced on {new Date(activeSession.created_at).toLocaleDateString()}
                </p>
              </div>

              {activeSession.overall_score !== null && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      Overall Score
                    </span>
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                      {activeSession.overall_score}%
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-purple-500 flex items-center justify-center font-bold text-xs">
                    🏆
                  </div>
                </div>
              )}
            </div>

            {/* Answer Feedbacks List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Question & Response Breakdown
              </h4>

              {activeSession.questions.map((q, idx) => {
                const answer = activeSession.answers.find(a => a.questionId === q.id);

                return (
                  <div
                    key={q.id}
                    className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          q.type === 'technical' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                          q.type === 'behavioral' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        }`}>
                          Question {idx + 1} • {q.type}
                        </span>
                        <h5 className="font-bold text-sm text-neutral-900 dark:text-white mt-2 leading-relaxed">
                          {q.question}
                        </h5>
                      </div>
                      {answer && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          answer.score >= 80 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                          answer.score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                          'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400'
                        }`}>
                          Score: {answer.score}%
                        </span>
                      )}
                    </div>

                    {answer ? (
                      <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                        {/* User Answer */}
                        <div>
                          <span className="block font-bold text-neutral-500 mb-1">Your Answer:</span>
                          <p className="text-neutral-800 dark:text-neutral-200 font-medium pl-3 border-l-2 border-neutral-300 dark:border-neutral-750 py-0.5">
                            {answer.userAnswer || 'No response provided.'}
                          </p>
                        </div>
                        {/* AI Feedback */}
                        <div>
                          <span className="block font-bold text-neutral-500 mb-1">AI Evaluation & Feedback:</span>
                          <p className="text-neutral-750 dark:text-neutral-350 leading-relaxed font-semibold">
                            {answer.feedback}
                          </p>
                        </div>
                        {/* Suggested Answer */}
                        <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/40">
                          <span className="block font-bold text-purple-650 dark:text-purple-400 mb-1">Suggested High-Scoring Response:</span>
                          <p className="text-neutral-700 dark:text-neutral-300 font-mono text-[11px] leading-relaxed">
                            {answer.suggestedAnswer}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">No answer submitted for this question.</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Back & Restart Actions */}
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setActiveSession(null);
                  setJobTitle('');
                  setJobDescription('');
                }}
                className="flex-1 py-3 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl text-xs active:scale-[0.98] transition-all text-center"
              >
                Start New Practice Session
              </button>
              <button
                onClick={() => {
                  const title = activeSession.job_title;
                  const desc = activeSession.job_description || '';
                  const resume = activeSession.resume_id || '';
                  setActiveSession(null);
                  setJobTitle(title);
                  setJobDescription(desc);
                  setSelectedResumeId(resume);
                }}
                className="flex-1 py-3 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-750 dark:text-neutral-300 font-bold rounded-xl text-xs active:scale-[0.98] transition-all text-center"
              >
                Practice This Role Again
              </button>
            </div>
          </div>
        </DashboardShell>
      );
    }

    // Active practice session runner
    const currentQuestion = activeSession.questions[currentQuestionIndex];

    return (
      <DashboardShell userEmail={userEmail}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                if (confirm('Cancel practice session? Progress will not be saved.')) {
                  setActiveSession(null);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Session
            </button>
            <span className="text-xs font-bold text-neutral-500">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-200 dark:bg-neutral-850 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Box */}
          <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs space-y-4">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              currentQuestion.type === 'technical' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
              currentQuestion.type === 'behavioral' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
              'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
            }`}>
              {currentQuestion.type} question
            </span>
            <h4 className="text-lg font-bold text-neutral-900 dark:text-white leading-relaxed">
              {currentQuestion.question}
            </h4>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Answer input area */}
          {!currentFeedback ? (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your response here... (Try to provide specific details or structure behavioral answers using the STAR method)"
                  rows={6}
                  disabled={submittingAnswer}
                  className="w-full p-4 pr-14 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none leading-relaxed"
                />
                <button
                  type="button"
                  onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
                  disabled={submittingAnswer}
                  className={`absolute right-4 bottom-4 p-2.5 rounded-full transition-all border ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-650 text-white border-red-500 animate-pulse'
                      : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-350 dark:border-neutral-800 text-neutral-550 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  }`}
                  title={isListening ? 'Stop recording' : 'Speak your answer'}
                >
                  {isListening ? <MicOff className="w-5.5 h-5.5" /> : <Mic className="w-5.5 h-5.5" />}
                </button>
              </div>
              <button
                onClick={handleSubmitAnswer}
                disabled={submittingAnswer || !userAnswer.trim()}
                className="w-full py-3 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
              >
                {submittingAnswer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                    Analyzing Response...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Answer
                  </>
                )}
              </button>
            </div>
          ) : (
            /* AI Answer Feedback Screen */
            <div className="space-y-5">
              <div className="p-6 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-805 rounded-2xl space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                    AI Evaluation
                  </span>
                  <span className={`text-sm font-extrabold px-3 py-1 rounded-xl border ${
                    currentFeedback.score >= 80 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' :
                    currentFeedback.score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    'bg-red-500/10 border-red-500/20 text-red-650 dark:text-red-400'
                  }`}>
                    Score: {currentFeedback.score}%
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="block font-bold text-neutral-500 mb-1">Feedback:</span>
                    <p className="text-neutral-750 dark:text-neutral-350 leading-relaxed font-semibold">
                      {currentFeedback.feedback}
                    </p>
                  </div>
                  <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="block font-bold text-purple-600 dark:text-purple-400 mb-1.5">
                      Suggested Answer:
                    </span>
                    <p className="text-neutral-700 dark:text-neutral-300 font-mono text-[11px] leading-relaxed">
                      {currentFeedback.suggestedAnswer}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                className="w-full py-3 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1 text-xs"
              >
                {currentQuestionIndex + 1 < totalQuestions ? (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  'View Practice Results'
                )}
              </button>
            </div>
          )}
        </div>
      </DashboardShell>
    );
  }

  // --- RENDERING HISTORIES & SETUP VIEW ---
  return (
    <DashboardShell userEmail={userEmail}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Setup Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-500" />
              Configure Interview Practice
            </h3>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Practicing mock interviews helps refine your experience delivery. Choose a resume and input a job description to generate highly aligned questions.
            </p>

            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4">
              {/* Resume selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Base Resume (Optional)
                </label>
                {resumes.length === 0 ? (
                  <div className="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-800">
                    No resumes found. <Link href="/dashboard/resumes" className="underline font-bold text-neutral-800 dark:text-white">Create one</Link> first to target questions to your skills.
                  </div>
                ) : (
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  >
                    <option value="">-- No Resume (General Practice) --</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Target Job Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Target Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-350 uppercase tracking-wider mb-1.5">
                  Job Description (Optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste details of the role here to generate target-focused questions."
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={startLoading}
                className="w-full py-2.5 bg-neutral-900 dark:bg-neutral-50 hover:bg-neutral-850 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
              >
                {startLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Start Simulator
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tutorials & Study Card */}
          <div className="p-6 bg-gradient-to-r from-purple-500/5 to-transparent border border-purple-500/10 rounded-2xl space-y-3 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Interview Tutorials
            </h3>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Study core technology concepts, cheatsheets, and common interview questions before starting your mock session.
            </p>
            <Link
              href="/dashboard/interview/tutorials"
              className="inline-flex items-center justify-center w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Study Preparation Guides
            </Link>
          </div>
        </div>

        {/* Right Side: History Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
              Practice Session History
            </h3>
            <span className="text-xs text-neutral-400 font-bold">{sessions.length} sessions completed</span>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleReviewSession(session)}
                className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-neutral-350 dark:hover:border-neutral-700 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {session.job_title}
                  </h4>
                  <div className="flex flex-wrap gap-3 text-[10px] text-neutral-500 mt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(session.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {session.questions?.length || 5} questions
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 dark:border-neutral-800">
                  {session.overall_score !== null ? (
                    <div className="text-right">
                      <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Score</span>
                      <span className={`text-base font-extrabold ${
                        session.overall_score >= 80 ? 'text-green-600 dark:text-green-400' :
                        session.overall_score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-500'
                      }`}>
                        {session.overall_score}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                  
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 rounded-xl transition"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-neutral-400 self-center hidden sm:block" />
                  </div>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="p-10 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20">
                <Compass className="w-8 h-8 text-neutral-400 mx-auto mb-2.5 opacity-85 animate-pulse" />
                <h5 className="font-bold text-xs text-neutral-800 dark:text-neutral-200">No sessions recorded yet</h5>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-xs mx-auto">
                  Start your first practice session above to prepare for your next job interview.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
