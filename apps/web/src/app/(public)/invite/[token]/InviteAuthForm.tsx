'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAndAcceptInvite } from '@/app/(auth)/actions';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';

interface InviteAuthFormProps {
  token: string;
  email: string;
  businessName: string;
  isExisting: boolean;
}

export default function InviteAuthForm({
  token,
  email,
  businessName,
  isExisting,
}: InviteAuthFormProps) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('token', token);
    formData.append('is_existing', isExisting.toString());
    if (!isExisting && fullName) formData.append('full_name', fullName);

    try {
      const result = await authenticateAndAcceptInvite(formData);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.success && result.businessSlug) {
        router.push(`/w/${result.businessSlug}/dashboard?joined=true`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm animate-in shake-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isExisting && (
          <div className="space-y-1 text-left">
            <label
              htmlFor="full_name"
              className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider"
            >
              Your Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
              <input
                id="full_name"
                type="text"
                required
                autoFocus
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-1 text-left">
          <label
            htmlFor="password"
            className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider"
          >
            {isExisting ? 'Password' : 'Set Password'}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
            <input
              id="password"
              type="password"
              required
              autoFocus={isExisting}
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
            />
          </div>
          {!isExisting && (
            <p className="text-[11px] text-muted/70 ml-1">At least 6 characters.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || (!isExisting && !fullName)}
          className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isExisting ? (
            `Sign in & join ${businessName}`
          ) : (
            `Create account & join ${businessName}`
          )}
        </button>
      </form>
    </div>
  );
}
