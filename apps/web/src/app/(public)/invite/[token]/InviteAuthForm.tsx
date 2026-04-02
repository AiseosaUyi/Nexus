'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authenticateAndAcceptInvite } from '@/app/(auth)/actions';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface InviteAuthFormProps {
  token: string;
  businessName: string;
}

export default function InviteAuthForm({ token, businessName }: InviteAuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'email' | 'auth'>('email');
  const [isExisting, setIsExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if user exists via RPC
      const { data: exists, error: checkError } = await supabase.rpc('check_user_exists', { p_email: email });
      
      if (checkError) throw checkError;

      setIsExisting(!!exists);
      setStep('auth');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('token', token);
    formData.append('is_existing', isExisting.toString());
    if (fullName) formData.append('full_name', fullName);

    try {
      const result = await authenticateAndAcceptInvite(formData);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.success && result.businessSlug) {
        // Successful join!
        router.push(`/w/${result.businessSlug}/dashboard?joined=true`);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm animate-in shake-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={handleIdentify} className="space-y-4">
          <div className="space-y-1 text-left">
            <label htmlFor="email" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAuthAndJoin} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-left -mt-2 mb-4">
            <button 
              type="button" 
              onClick={() => setStep('email')}
              className="text-[11px] font-bold text-accent hover:underline mb-1"
            >
              ← Use a different email
            </button>
            <p className="text-sm text-foreground font-medium">{email}</p>
          </div>

          {!isExisting && (
            <div className="space-y-1 text-left animate-in fade-in duration-500">
              <label htmlFor="full_name" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                <input
                  id="full_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1 text-left">
            <label htmlFor="password" className="text-[13px] font-bold text-muted ml-1 uppercase tracking-wider">
              {isExisting ? 'Password' : 'Set Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              isExisting ? `Sign In & Join ${businessName}` : `Create Account & Join ${businessName}`
            )}
          </button>
        </form>
      )}
    </div>
  );
}
