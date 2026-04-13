'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { resetPassword } from '../actions';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const success = searchParams.get('success');

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
          Reset password
        </h1>
        <p className="text-sm text-muted">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{decodeURIComponent(error)}</p>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{decodeURIComponent(success)}</p>
        </div>
      )}

      <form action={resetPassword} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Send Reset Link
        </button>
      </form>

      <p className="text-center text-sm text-muted pt-2">
        <Link href="/login" className="inline-flex items-center gap-1 text-white font-bold hover:underline transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm mx-auto h-64" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
