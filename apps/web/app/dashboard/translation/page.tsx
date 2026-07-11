'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/app/components/DashboardShell';
import { 
  Mic, MicOff, Languages, Copy, Check, Trash2, 
  Clock, AlertCircle, RefreshCw, Volume2, Loader2 
} from 'lucide-react';

interface TranslationLog {
  id: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

const LANGUAGES = [
  { code: 'az-AZ', label: 'Azerbaijani (az-AZ)' },
  { code: 'tr-TR', label: 'Turkish (tr-TR)' },
  { code: 'ru-RU', label: 'Russian (ru-RU)' },
  { code: 'es-ES', label: 'Spanish (es-ES)' },
  { code: 'de-DE', label: 'German (de-DE)' },
  { code: 'fr-FR', label: 'French (fr-FR)' },
  { code: 'en-US', label: 'English (en-US)' }
];

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

export default function TranslationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Translation states
  const [sourceLang, setSourceLang] = useState('az-AZ');
  const [targetLang, setTargetLang] = useState('en-US');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [translating, setTranslating] = useState(false);

  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [showExtensionHelp, setShowExtensionHelp] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/sign-in');
        return;
      }
      setUserEmail(user.email || '');

      // Load past logs
      const { data: logsData } = await supabase
        .from('translation_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsData) {
        setLogs(logsData as TranslationLog[]);
      }

      // Check SpeechRecognition support
      const SpeechRecognition = 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setBrowserSupported(false);
      }

      setLoading(false);
    }
    loadData();

    // Clean up recognition on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [supabase, router]);

  const startListening = () => {
    setError(null);
    setTranscript('');
    setTranslation('');

    try {
      const SpeechRecognition = 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || 
        (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sourceLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please enable microphone access in your browser settings.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
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
          setTranscript(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Small delay to ensure final transcript is processed
    setTimeout(async () => {
      if (!transcript.trim()) return;
      await translateSpeech(transcript);
    }, 800);
  };

  const translateSpeech = async (textToTranslate: string) => {
    setTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang: LANGUAGES.find(l => l.code === sourceLang)?.label || sourceLang,
          targetLang: LANGUAGES.find(l => l.code === targetLang)?.label || targetLang
        })
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      setTranslation(data.translatedText);

      // Save log to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: log, error: dbError } = await supabase
          .from('translation_logs')
          .insert({
            user_id: user.id,
            source_text: textToTranslate,
            translated_text: data.translatedText,
            source_lang: sourceLang,
            target_lang: targetLang
          })
          .select()
          .single();

        if (!dbError && log) {
          setLogs(prev => [log as TranslationLog, ...prev]);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? (err as Error).message : 'Failed to polish and translate speech.');
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this log?')) return;

    try {
      await supabase.from('translation_logs').delete().eq('id', id);
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete translation log', err);
    }
  };

  const handleTextToSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis not supported in this browser.');
    }
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

  return (
    <DashboardShell userEmail={userEmail}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Live Translation & Transcription</h2>
          <p className="text-sm text-neutral-500 mt-1">Practice speaking in your native tongue and get polished, interview-grade English translations.</p>
        </div>
        <button
          onClick={() => setShowExtensionHelp(!showExtensionHelp)}
          className="flex items-center gap-1.5 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-bold text-neutral-700 dark:text-neutral-350 hover:bg-neutral-100 dark:hover:bg-neutral-805 transition-all cursor-pointer"
        >
          <Languages className="w-4 h-4 text-purple-500" />
          {showExtensionHelp ? 'Hide Extension Guide' : 'Install Chrome Helper'}
        </button>
      </div>

      {showExtensionHelp && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-transparent border border-purple-500/20 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-purple-650 dark:text-purple-400">✦ LinkedIn & Highlight-to-Translate Chrome Extension</h3>
          <p className="text-xs text-neutral-550 dark:text-neutral-400 leading-relaxed max-w-3xl">
            We built a custom Chrome Extension helper that integrates with LinkedIn to sync job descriptions, suggest outreach replies, and translate selected webpage text right on the spot!
          </p>
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-neutral-800 dark:text-white">How to Install in Chrome:</h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-neutral-600 dark:text-neutral-400 font-medium">
              <li>Open <strong>chrome://extensions/</strong> in your Google Chrome browser.</li>
              <li>Toggle <strong>Developer mode</strong> (top-right corner) to ON.</li>
              <li>Click the <strong>Load unpacked</strong> button (top-left corner).</li>
              <li>Select the extension folder inside this project directory: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px]">/Users/apple/Documents/apps/AI Career Agent/apps/extension</code></li>
            </ol>
          </div>
          <div className="pt-2 text-xs border-t border-neutral-200/50 dark:border-neutral-800/30">
            <h4 className="font-bold text-neutral-850 dark:text-white">✦ Inline Selection Translation Feature:</h4>
            <p className="text-neutral-500 leading-relaxed mt-1 font-medium">
              Once the extension is installed, go to any webpage (like LinkedIn). Highlight any English sentence or requirement with your mouse, and a small <strong>&quot;✦ Translate&quot;</strong> trigger will float right above it. Click it to view the professional translation popup inline instantly!
            </p>
          </div>
        </div>
      )}

      {!browserSupported && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-2xl text-xs text-yellow-750 dark:text-yellow-400 font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>
            <strong>Warning:</strong> Web Speech API is not fully supported in this browser. Please use Google Chrome, Safari, or Microsoft Edge for real-time speech-to-text.
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl text-xs text-red-650 dark:text-red-400 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Recording Workspace */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-xs gap-4">
            
            {/* Language selectors */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">From</label>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label.split(' ')[0]}</option>
                  ))}
                </select>
              </div>

              <Languages className="w-4 h-4 text-neutral-400 mt-4 shrink-0" />

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">To</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rec Buttons */}
            <div className="flex gap-3 w-full sm:w-auto">
              {!isListening ? (
                <button
                  onClick={startListening}
                  disabled={!browserSupported}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2.5 bg-purple-650 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all text-xs disabled:opacity-50"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl active:scale-[0.98] transition-all text-xs animate-pulse"
                >
                  <MicOff className="w-4 h-4" />
                  Stop & Translate
                </button>
              )}
              
              <button
                onClick={() => {
                  setTranscript('');
                  setTranslation('');
                  setError(null);
                }}
                className="p-2.5 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-805 rounded-xl transition text-neutral-500 dark:text-neutral-400"
                title="Clear Boxes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Transcript Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Raw transcript box */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col min-h-[350px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Raw Transcription
                </span>
                {transcript && (
                  <button
                    onClick={() => handleCopyText(transcript, setCopiedTranscript)}
                    className="flex items-center gap-1 py-1 px-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[9px] font-bold text-neutral-550 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  >
                    {copiedTranscript ? (
                      <>
                        <Check className="w-3 h-3 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {transcript ? (
                  <p className="text-sm text-neutral-800 dark:text-neutral-100 leading-relaxed font-semibold">
                    {transcript}
                  </p>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">
                    {isListening ? 'Listening to speech... Speak clearly into your mic.' : 'No speech recorded yet.'}
                  </div>
                )}
              </div>
            </div>

            {/* AI Refined Translation box */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col min-h-[350px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                  Polished Translation
                </span>
                <div className="flex gap-1.5">
                  {translation && (
                    <>
                      <button
                        onClick={() => handleTextToSpeech(translation)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        title="Speak Out Loud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyText(translation, setCopiedTranslation)}
                        className="flex items-center gap-1 py-1 px-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[9px] font-bold text-neutral-550 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                      >
                        {copiedTranslation ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {translating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-xs text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    Polishing speech to interview-grade English...
                  </div>
                ) : translation ? (
                  <p className="text-sm text-neutral-850 dark:text-neutral-100 leading-relaxed font-mono">
                    {translation}
                  </p>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">
                    Translated output will appear here.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Sidebar: Past Logs Drawer */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
            Saved Translations
          </h3>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto">
            {logs.map(log => {
              const date = new Date(log.created_at).toLocaleDateString();
              const fromLang = LANGUAGES.find(l => l.code === log.source_lang)?.label.split(' ')[0] || log.source_lang;
              const toLang = LANGUAGES.find(l => l.code === log.target_lang)?.label.split(' ')[0] || log.target_lang;

              return (
                <div
                  key={log.id}
                  onClick={() => {
                    setTranscript(log.source_text);
                    setTranslation(log.translated_text);
                    setSourceLang(log.source_lang);
                    setTargetLang(log.target_lang);
                  }}
                  className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-350 dark:hover:border-neutral-700 transition shadow-xs hover:shadow-sm cursor-pointer relative group"
                >
                  <div className="flex justify-between items-center text-[9px] text-neutral-400 font-bold mb-2">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {date}
                    </span>
                    <span>{fromLang} ➔ {toLang}</span>
                  </div>

                  <p className="text-[11px] text-neutral-800 dark:text-neutral-200 font-medium truncate">
                    {log.source_text}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 truncate italic">
                    {log.translated_text}
                  </p>

                  <button
                    onClick={(e) => handleDeleteLog(log.id, e)}
                    className="absolute top-2 right-2 p-1 bg-neutral-50 hover:bg-red-50 hover:text-red-500 dark:bg-neutral-950 dark:hover:bg-red-950/20 rounded-md transition opacity-0 group-hover:opacity-100"
                    title="Delete Log"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div className="p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-950/20 text-xs text-neutral-450 italic">
                No past logs recorded
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
