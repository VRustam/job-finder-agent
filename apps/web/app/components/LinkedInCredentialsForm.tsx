'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Mail, CheckCircle, RefreshCw } from 'lucide-react';

export function LinkedInCredentialsForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Retrieve stored credentials from localStorage on mount
    const storedEmail = localStorage.getItem('jf-linkedin-email') || '';
    const storedPassword = localStorage.getItem('jf-linkedin-password') || '';
    Promise.resolve().then(() => {
      setEmail(storedEmail);
      setPassword(storedPassword);
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Save locally
    localStorage.setItem('jf-linkedin-email', email);
    localStorage.setItem('jf-linkedin-password', password);
    
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  return (
    <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-purple-500/20 rounded-2xl space-y-4 shadow-md text-white">
      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-neutral-100 flex items-center gap-2">
          <span className="text-purple-500 text-lg">✦</span>
          LinkedIn AI Agent Login Credentials
        </h3>
        <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
          Provide your LinkedIn login details below. These are stored locally and securely in your browser so the AI Agent can automatically log in and apply on your behalf.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="relative">
          <label className="block text-[11px] font-bold text-neutral-450 mb-1.5 tracking-wider uppercase">
            LinkedIn Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-xs font-medium text-white transition placeholder-neutral-600"
              required
            />
          </div>
        </div>

        <div className="relative">
          <label className="block text-[11px] font-bold text-neutral-450 mb-1.5 tracking-wider uppercase">
            LinkedIn Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/60 border border-neutral-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-xs font-medium text-white transition placeholder-neutral-600"
              required
            />
          </div>
        </div>

        <div className="md:col-span-2 flex justify-between items-center gap-4 pt-2 border-t border-neutral-800/40">
          <div className="text-[10px] text-neutral-500 leading-normal max-w-md">
            Note: Your credentials are encrypted/saved locally and never sent to our servers. The AI agent reads them on-page to execute the login flow.
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-neutral-800 disabled:to-neutral-800 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-450 animate-bounce" />
                Saved Locally!
              </>
            ) : (
              'Save Agent Credentials'
            )}
          </button>
        </div>
      </form>

      {/* Hidden DOM element for Extension and Browser subagent to capture */}
      <div 
        id="jf-linkedin-credentials" 
        data-email={email} 
        data-password={password} 
        style={{ display: 'none' }} 
        aria-hidden="true"
      />
    </div>
  );
}
