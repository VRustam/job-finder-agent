'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthCard, AuthInput, SocialButton, ErrorMessage, LoadingButton } from '@/app/components/AuthComponents';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read errors or messages from callback redirects
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'auth-callback-failed') {
      setError('Authentication callback failed. Please try signing in again.');
    } else if (errorParam) {
      setError(errorParam);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Email not confirmed') || signInError.message.includes('Email confirmation')) {
          setError('Please verify your email before logging in. Check your inbox for a confirmation link.');
        } else {
          setError(signInError.message);
        }
      } else {
        const nextPath = searchParams.get('next') ?? '/dashboard';
        router.push(nextPath);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
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
    } catch (err: any) {
      setError(err?.message || 'An unexpected OAuth error occurred.');
    }
  };

  return (
    <AuthCard title="Sign in to your account" subtitle="Welcome back! Please enter your details.">
      <ErrorMessage message={error || undefined} />

      <form onSubmit={handleSignIn} className="space-y-4">
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

        <AuthInput
          label="Password"
          id="password-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end text-xs mb-2">
          <Link
            href="/auth/forgot-password"
            className="font-semibold text-neutral-600 dark:text-neutral-350 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <LoadingButton loading={loading} type="submit">
          Sign in
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
        Don&apos;t have an account?{' '}
        <Link href="/auth/sign-up" className="font-bold text-neutral-900 dark:text-white hover:underline">
          Sign up
          </Link>
      </p>
    </AuthCard>
  );
}

export default function SignInPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      <Suspense fallback={
        <div className="w-full max-w-md p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[400px]">
          <svg
            className="animate-spin h-8 w-8 text-neutral-800 dark:text-neutral-100"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
