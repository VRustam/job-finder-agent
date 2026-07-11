'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthCard, AuthInput, ErrorMessage, LoadingButton } from '@/app/components/AuthComponents';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      <AuthCard
        title="Forgot Password"
        subtitle="No worries, we'll send you instructions to reset your password."
      >
        <ErrorMessage message={error || undefined} />

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-805 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-neutral-800 dark:text-neutral-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-350 font-medium">
              We sent a password reset link to <span className="font-bold text-neutral-900 dark:text-neutral-100">{email}</span>.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Please check your inbox (and spam folder) to complete the process.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center py-2 px-4 border border-neutral-350 dark:border-neutral-700 rounded-lg text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-850"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <AuthInput
              label="Email Address"
              id="email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
            />

            <LoadingButton loading={loading} type="submit">
              Send reset instructions
            </LoadingButton>

            <div className="text-center text-sm pt-2">
              <Link
                href="/auth/sign-in"
                className="font-bold text-neutral-900 dark:text-white hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
