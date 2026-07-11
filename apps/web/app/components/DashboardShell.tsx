'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Menu, X, Sparkles, Send, Bot, MessageSquare } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  authProvider?: string;
}

export function DashboardShell({ children, userEmail, userName, authProvider }: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);

  React.useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
        if (profile) {
          setIsPremium(profile.is_premium);
        }
      }
    }
    loadProfile();
  }, [supabase]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'price_mock' }),
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      } else {
        alert('Stripe error: ' + (data.error || 'Failed to build checkout URL'));
      }
    } catch (err) {
      console.error(err);
      alert('Checkout failed.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/sign-in');
    router.refresh();
  };

  const displayName = userName || userEmail || 'User';

  // AI Live Agent Widget States
  const [chatOpen, setChatOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Array<{ role: 'user' | 'bot'; text: string }>>([
    { role: 'bot', text: 'Hello! How can I help you today? You can ask me to open pages (e.g. "what is in demand" to view market trends) or ask career questions.' }
  ]);
  const [inputVal, setInputVal] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || sending) return;
    const userMsg = inputVal.trim();
    setInputVal('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'bot', text: data.message || "I'm sorry, I couldn't process that." }]);

      if (data.action === 'navigate' && data.target) {
        setTimeout(() => {
          router.push(data.target);
          setChatOpen(false);
        }, 1500);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I encountered an error connecting to my server.' }]);
    } finally {
      setSending(false);
    }
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    async function syncSessionToken() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.access_token) {
        // Method 1: Write to DOM element using data attribute (always works regardless of visibility)
        const tokenEl = document.getElementById('jf-supabase-token-client');
        if (tokenEl) {
          tokenEl.setAttribute('data-token', session.access_token);
          tokenEl.textContent = session.access_token;
        }
        // Method 2: Broadcast via postMessage (content scripts listen for this)
        window.postMessage({ type: 'JF_SESSION_TOKEN', token: session.access_token }, '*');
        console.log('[Dashboard] Session token broadcasted to extension.');
      }
    }
    syncSessionToken();
    
    // Also listen to auth changes to update the token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        const tokenEl = document.getElementById('jf-supabase-token-client');
        if (tokenEl) {
          tokenEl.setAttribute('data-token', session.access_token);
          tokenEl.textContent = session.access_token;
        }
        window.postMessage({ type: 'JF_SESSION_TOKEN', token: session.access_token }, '*');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#1f493d] text-slate-100 flex flex-col transition-colors duration-200">
      <div className="flowty-bg-glow" />
      <header className="sticky top-0 z-40 bg-[#1f493d]/70 backdrop-blur-md border-b border-[#173a30] shadow-xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer">
              <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-lg object-contain bg-white dark:bg-neutral-800 p-0.5 border border-neutral-250 dark:border-neutral-700 shadow-xs" />
              <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                Job Finder Agent
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {/* Premium Status */}
              {!isPremium ? (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-650 text-white rounded-lg active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                  {upgrading ? 'Upgrading...' : 'Upgrade to Premium'}
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg tracking-wider uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  Premium
                </div>
              )}

              {/* User Identity */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center overflow-hidden">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200 max-w-[150px] truncate">
                    {displayName}
                  </span>
                  {authProvider && (
                    <span className="text-[10px] text-slate-500 capitalize">
                      Via {authProvider}
                    </span>
                  )}
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-350 hover:text-white hover:bg-slate-900 rounded-lg transition-all duration-150"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-250 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4 space-y-4 shadow-inner">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <div className="w-8 h-8 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center">
                <User className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {displayName}
                </span>
                {authProvider && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 capitalize">
                    Provider: {authProvider}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-[0.98] transition-all duration-150"
            >
              <LogOut className="w-4.5 h-4.5" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Content Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* AI Live Agent Floating Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 text-white rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>

        {/* Chat Drawer Window */}
        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] bg-neutral-950/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl shadow-[0_20px_50px_rgba(99,102,241,0.25)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-neutral-900 via-indigo-950 to-neutral-900 border-b border-indigo-500/20 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping border-2 border-neutral-950 opacity-75" />
                </div>
                <div>
                  <h3 className="font-bold text-sm bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">AI Career Agent</h3>
                  <span className="text-[10px] text-indigo-300 flex items-center gap-1">
                    Online
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setChatOpen(false)} className="hover:opacity-80 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950/50">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-md shadow-indigo-950/40'
                        : 'bg-neutral-900/90 border border-neutral-800 text-neutral-200 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-neutral-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-500" />
                    Agent is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 bg-neutral-900/60 flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask something or type 'what is in demand'..."
                className="flex-1 px-3 py-2 border border-neutral-800 rounded-xl bg-neutral-950 text-neutral-250 text-xs focus:outline-none focus:border-indigo-500 placeholder-neutral-500"
              />
              <button
                type="submit"
                disabled={sending || !inputVal.trim()}
                className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl disabled:opacity-50 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
      <div id="jf-supabase-token-client" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
    </div>
  );
}
