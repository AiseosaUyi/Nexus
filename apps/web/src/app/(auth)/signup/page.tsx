'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { signUp } from '../actions';
import { Mail, AlertCircle, ArrowRight } from 'lucide-react';

function SignupForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black font-display tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted">
          Join Nexus and start building your knowledge base.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm animate-in shake-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{decodeURIComponent(error)}</p>
        </div>
      )}

      {message ? (
        <div className="p-6 rounded-xl bg-accent/5 border border-accent/20 text-center space-y-4 animate-in zoom-in-95 duration-500">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-foreground">Verify your email</h3>
            <p className="text-sm text-muted leading-relaxed">
              {decodeURIComponent(message)}
            </p>
          </div>
          <Link href="/login">
            <button className="w-full mt-2 py-2 text-sm font-bold text-foreground hover:underline flex items-center justify-center gap-1 cursor-pointer">
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      ) : (
        <form action={signUp} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="full_name" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              placeholder="Alex Johnson"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
            />
          </div>

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
            <label htmlFor="password" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Create Account
          </button>
        </form>
      )}

      {!message && (
        <p className="text-center text-sm text-muted pt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground font-bold hover:underline transition-colors">
            Sign In
          </Link>
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm mx-auto h-64" />}>
      <SignupForm />
    </Suspense>
  );
}
