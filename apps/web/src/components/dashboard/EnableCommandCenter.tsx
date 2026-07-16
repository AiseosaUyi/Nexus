'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ShieldCheck, Inbox, Gauge } from 'lucide-react';
import { enableCommandCenter } from '@/app/(dashboard)/w/[workspace_slug]/command-actions';

export default function EnableCommandCenter({
  businessId, businessName,
}: { businessId: string; businessName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const enable = () => {
    setError(null);
    startTransition(async () => {
      const res = await enableCommandCenter(businessId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-xl mx-auto px-8 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-cta text-cta-foreground grid place-items-center mx-auto mb-5">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-muted mt-2">
          Turn <span className="font-semibold text-foreground">{businessName}</span> into a
          freelance hub: track inbound gigs and outbound content across Behance, Dribbble, Upwork,
          Contra, Fiverr, Twitter and LinkedIn — drafted and scored, waiting for your approval.
        </p>

        <div className="grid grid-cols-3 gap-3 my-8 text-left">
          <Feature icon={Inbox} title="Approval queue" desc="Replies & proposals drafted for you." />
          <Feature icon={ShieldCheck} title="Scam filter" desc="Sketchy DMs auto-quarantined." />
          <Feature icon={Gauge} title="Health scores" desc="Know the next fix per platform." />
        </div>

        <button
          onClick={enable}
          disabled={pending}
          className="rounded-xl bg-cta text-cta-foreground font-semibold px-6 py-3 disabled:opacity-50"
        >
          {pending ? 'Enabling…' : `Enable for ${businessName}`}
        </button>
        {error && <p className="text-accent text-sm mt-3">{error}</p>}
        <p className="text-xs text-muted mt-4">
          Only workspace admins can enable this. It stays private to this workspace.
        </p>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }:
  { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-sidebar/50 p-4">
      <Icon className="w-5 h-5 text-muted mb-2" />
      <div className="font-semibold text-foreground text-sm">{title}</div>
      <div className="text-xs text-muted mt-1">{desc}</div>
    </div>
  );
}
