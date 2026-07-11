'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthCard, AuthInput, SocialButton, ErrorMessage, LoadingButton } from '@/app/components/AuthComponents';

export default function SignUpPage() {
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field validation errors
  const [validationErrors, setValidationErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
      isValid = false;
    }

    if (!email) {
      errors.email = 'Email address is required.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required.';
      isValid = false;
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
      isValid = false;
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    if (!acceptTerms) {
      errors.acceptTerms = 'You must accept the terms and privacy policy.';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError((err as Error).message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err) {
      setError((err as Error).message || 'An unexpected OAuth error occurred.');
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
        <AuthCard title="Verify your email">
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-neutral-800 dark:text-neutral-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
              </svg>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-350 font-medium">
              We sent a verification link to <span className="font-bold text-neutral-900 dark:text-neutral-100">{email}</span>.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Check your email to verify your account.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center py-2 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-850"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      <AuthCard title="Create your account" subtitle="Join Job Finder Agent and start automating your search.">
        <ErrorMessage message={error || undefined} />

        <form onSubmit={handleSignUp} className="space-y-4">
          <AuthInput
            label="Full Name"
            id="fullname-input"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={validationErrors.fullName}
            disabled={loading}
            required
            autoComplete="name"
          />

          <AuthInput
            label="Email Address"
            id="email-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={validationErrors.email}
            disabled={loading}
            required
            autoComplete="email"
          />

          <AuthInput
            label="Password"
            id="password-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={validationErrors.password}
            disabled={loading}
            required
            autoComplete="new-password"
          />

          <AuthInput
            label="Confirm Password"
            id="confirm-password-input"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={validationErrors.confirmPassword}
            disabled={loading}
            required
            autoComplete="new-password"
          />

          <div className="flex flex-col space-y-1 mb-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                disabled={loading}
                className="mt-1 h-4.5 w-4.5 rounded border-neutral-300 dark:border-neutral-850 text-neutral-900 dark:text-neutral-100 focus:ring-neutral-500/20"
                required
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-450 leading-normal">
                I accept the{' '}
                <Link href="/terms" className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold text-neutral-800 dark:text-neutral-200 hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {validationErrors.acceptTerms && (
              <p className="text-xs font-medium text-red-650 dark:text-red-400">
                {validationErrors.acceptTerms}
              </p>
            )}
          </div>

          <LoadingButton loading={loading} type="submit">
            Create account
          </LoadingButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-xs font-semibold uppercase">
            <span className="bg-white dark:bg-neutral-900 px-3 text-neutral-450 dark:text-neutral-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SocialButton provider="google" onClick={() => handleSocialSignIn('google')} />
          <SocialButton provider="apple" onClick={() => handleSocialSignIn('apple')} />
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-450">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-bold text-neutral-900 dark:text-white hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
