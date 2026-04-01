'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { signIn } from '../actions';
import { LogIn, AlertCircle } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted">
          Your knowledge base is waiting for you.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm animate-in shake-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{decodeURIComponent(error)}</p>
        </div>
      )}

      <form action={signIn} className="space-y-4">
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

        <div className="space-y-1">
          <div className="flex items-center justify-between ml-1">
            <label htmlFor="password" className="text-[13px] font-bold text-muted uppercase tracking-wider">
              Password
            </label>
            <Link href="/forgot-password" title="Coming soon!" className="text-[11px] text-muted hover:text-white font-bold transition-colors">
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Sign In
        </button>
      </form>

      <p className="text-center text-sm text-muted pt-2 font-display">
        Don't have an account?{' '}
        <Link href="/signup" className="text-white font-bold hover:underline transition-colors">
          Create Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm mx-auto h-64" />}>
      <LoginForm />
    </Suspense>
  );
}
