'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthCard, AuthInput, ErrorMessage, LoadingButton } from '@/app/components/AuthComponents';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field validation errors
  const [validationErrors, setValidationErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const errors: typeof validationErrors = {};
    let isValid = true;

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

    setValidationErrors(errors);
    return isValid;
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during password update.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 transition-colors duration-200">
      <AuthCard
        title="Reset Password"
        subtitle="Please enter your new password below."
      >
        <ErrorMessage message={error || undefined} />

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-805 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-450"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Password updated successfully!
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Redirecting you to dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <AuthInput
              label="New Password"
              id="new-password-input"
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
              label="Confirm New Password"
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

            <LoadingButton loading={loading} type="submit">
              Update password
            </LoadingButton>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
