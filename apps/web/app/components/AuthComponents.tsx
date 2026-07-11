'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

// --- AuthCard Component ---
interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <>
      <style>{`
        @keyframes authSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-card-glow {
          animation: authSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.15);
        }
      `}</style>
      <div className="w-full max-w-md p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl auth-card-glow transition-all duration-300">
        <div className="text-center mb-8">
          {/* Decorative Logo Icon */}
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4 rotate-3 hover:rotate-12 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2.5 text-sm text-neutral-500 dark:text-neutral-450 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </>
  );
}

// --- AuthInput Component ---
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, className = '', id, ...props }: AuthInputProps) {
  return (
    <div className="mb-5">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={id}
        className={`w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border ${
          error
            ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500'
            : 'border-neutral-250 dark:border-neutral-800 focus:ring-indigo-500/10 focus:border-indigo-650'
        } rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-4 transition-all duration-250 text-sm ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// --- AuthButton (Primary Button) Component ---
interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AuthButton({ children, className = '', ...props }: AuthButtonProps) {
  return (
    <button
      className={`w-full py-3.5 px-4 bg-gradient-to-r from-indigo-650 via-purple-650 to-indigo-700 text-white font-bold rounded-xl hover:opacity-95 active:scale-[0.98] transition-all duration-150 shadow-md shadow-indigo-950/10 cursor-pointer text-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// --- LoadingButton Component ---
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ loading, children, className = '', ...props }: LoadingButtonProps) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`w-full py-3.5 px-4 bg-gradient-to-r from-indigo-650 via-purple-650 to-indigo-700 text-white font-bold rounded-xl hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-150 flex items-center justify-center shadow-md shadow-indigo-950/10 cursor-pointer text-sm ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </button>
  );
}

// --- SocialButton (Google / Apple SSO) Component ---
interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: 'google' | 'apple';
  onClick: () => void;
}

export function SocialButton({ provider, onClick, className = '', ...props }: SocialButtonProps) {
  const isGoogle = provider === 'google';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white dark:bg-neutral-805 border border-neutral-300 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:scale-[0.98] transition-all duration-150 cursor-pointer ${className}`}
      {...props}
    >
      {isGoogle ? (
        // Google SVG Icon
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      ) : (
        // Apple SVG Icon
        <svg className="w-4 h-4 fill-current text-neutral-900 dark:text-neutral-50" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.95.99-3.09-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.36z" />
        </svg>
      )}
      <span>{isGoogle ? 'Google' : 'Apple'}</span>
    </button>
  );
}

// --- ErrorMessage Component ---
interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-650 dark:text-red-400 font-bold leading-relaxed">
      {message}
    </div>
  );
}
