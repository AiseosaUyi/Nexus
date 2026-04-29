'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RequestAccessForm({ nodeId }: { nodeId: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('access_requests')
        .upsert(
          {
            node_id: nodeId,
            requester_email: email.toLowerCase().trim(),
            requester_name: name.trim() || null,
            status: 'pending',
          },
          { onConflict: 'node_id,requester_email' }
        );

      if (dbError) {
        setError('Something went wrong. Please try again.');
        console.error('[RequestAccess]', dbError);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/[0.04] px-6 py-5">
        <p className="text-[14px] text-green-400 font-medium mb-1">Request sent</p>
        <p className="text-[13px] text-muted">
          The page owner has been notified. You'll get access once they approve your request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2.5 text-[14px] bg-foreground/[0.04] border border-border rounded-lg text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
        required
        className="w-full px-4 py-2.5 text-[14px] bg-foreground/[0.04] border border-border rounded-lg text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
      />
      {error && <p className="text-[12px] text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-[14px] font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? 'Sending...' : 'Request access'}
      </button>
    </form>
  );
}
