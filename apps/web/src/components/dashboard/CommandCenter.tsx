'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox, ShieldAlert, Gauge, ExternalLink, Check, X, Sparkles, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { decideOpportunity } from '@/app/(dashboard)/w/[workspace_slug]/command-actions';
import type { Opportunity, PlatformHealth, CommandActionLog } from '@nexus/api/schema';

interface Props {
  businessId: string;
  workspaceSlug: string;
  initialOpportunities: Opportunity[];
  initialHealth: PlatformHealth[];
  initialLog: CommandActionLog[];
}

const healthColor = (v: number) =>
  v >= 70 ? 'bg-emerald-500' : v >= 40 ? 'bg-amber-500' : 'bg-accent';

export default function CommandCenter({
  workspaceSlug, initialOpportunities, initialHealth, initialLog,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const drafted = useMemo(
    () => initialOpportunities.filter((o) => o.status === 'drafted'),
    [initialOpportunities],
  );
  const quarantined = useMemo(
    () => initialOpportunities.filter((o) => o.status === 'quarantined'),
    [initialOpportunities],
  );

  const decide = (id: string, decision: 'approve' | 'reject') => {
    setBusyId(id);
    startTransition(async () => {
      await decideOpportunity(id, decision);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-4xl mx-auto px-8 md:px-16 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cta text-cta-foreground grid place-items-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
            <p className="text-sm text-muted">Your freelance hustle, drafted and waiting for a yes.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 my-8">
          <Kpi icon={Inbox} label="Drafts to approve" value={drafted.length} />
          <Kpi icon={ShieldAlert} label="Quarantined" value={quarantined.length} tone="accent" />
          <Kpi icon={Gauge} label="Platforms tracked" value={initialHealth.length} />
        </div>

        {/* Platform health */}
        <Section title="Platform health" icon={Gauge}>
          <div className="space-y-2">
            {initialHealth.length === 0 && <Empty>No platforms yet. Run a check to populate.</Empty>}
            {initialHealth.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-sidebar/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="w-24 font-semibold text-foreground">{p.platform}</span>
                  <div className="flex-1 h-2 rounded-full bg-background overflow-hidden">
                    <div className={cn('h-full rounded-full', healthColor(p.health_score))}
                      style={{ width: `${p.health_score}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm text-muted">{p.health_score}</span>
                </div>
                {p.top_fix && (
                  <p className="text-xs text-muted mt-2 pl-1">Next: {p.top_fix}</p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Approval queue */}
        <Section title="Approval queue — replies & proposals" icon={Inbox}>
          {drafted.length === 0 && <Empty>Nothing waiting. The next check will fill this.</Empty>}
          <div className="space-y-3">
            {drafted.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-sidebar/50 p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{o.platform}</span>
                    <Tag>{o.type}</Tag>
                    <Tag>fit {o.fit_score}</Tag>
                  </div>
                  {o.source_url && (
                    <a href={o.source_url} target="_blank" rel="noreferrer"
                      className="text-muted hover:text-foreground"><ExternalLink className="w-4 h-4" /></a>
                  )}
                </div>
                {o.contact && <p className="text-xs text-muted">{o.contact}</p>}
                {o.message && <p className="text-sm text-muted mt-1 line-clamp-2">{o.message}</p>}
                <div className="mt-3 rounded-xl bg-background border border-border p-3 text-sm text-foreground whitespace-pre-wrap">
                  {o.draft_reply || '(no draft yet)'}
                </div>
                <div className="flex gap-2 mt-3">
                  <button disabled={pending && busyId === o.id} onClick={() => decide(o.id, 'approve')}
                    className="flex-1 rounded-xl bg-cta text-cta-foreground font-semibold py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button disabled={pending && busyId === o.id} onClick={() => decide(o.id, 'reject')}
                    className="flex-1 rounded-xl border border-border text-foreground font-semibold py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Quarantine */}
        <Section title="Quarantined — possible scams" icon={ShieldAlert}>
          {quarantined.length === 0 && <Empty>Nothing flagged. 🎉</Empty>}
          <div className="space-y-3">
            {quarantined.map((o) => (
              <div key={o.id} className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{o.platform}</span>
                    <Tag tone="accent">scam {o.scam_score}</Tag>
                  </div>
                  {o.source_url && (
                    <a href={o.source_url} target="_blank" rel="noreferrer"
                      className="text-muted hover:text-foreground"><ExternalLink className="w-4 h-4" /></a>
                  )}
                </div>
                {o.message && <p className="text-sm text-muted line-clamp-3">{o.message}</p>}
                <div className="flex gap-2 mt-3">
                  <button disabled={pending && busyId === o.id} onClick={() => decide(o.id, 'reject')}
                    className="flex-1 rounded-xl border border-border text-foreground font-semibold py-2.5 disabled:opacity-50">
                    Confirm scam
                  </button>
                  <button disabled={pending && busyId === o.id} onClick={() => decide(o.id, 'approve')}
                    className="flex-1 rounded-xl bg-cta text-cta-foreground font-semibold py-2.5 disabled:opacity-50">
                    It&apos;s real — approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Activity */}
        <Section title="Recent activity" icon={Activity}>
          {initialLog.length === 0 && <Empty>No activity yet.</Empty>}
          <div className="space-y-1">
            {initialLog.slice(0, 12).map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm px-1 py-1.5">
                <span className="w-16 text-muted text-xs">{l.kind}</span>
                <span className="text-foreground">{l.platform ?? '—'}</span>
                <span className="text-muted truncate">{l.detail}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }:
  { icon: any; label: string; value: number; tone?: 'accent' }) {
  return (
    <div className="rounded-2xl border border-border bg-sidebar/50 p-5 text-center">
      <Icon className={cn('w-5 h-5 mx-auto mb-2', tone === 'accent' ? 'text-accent' : 'text-muted')} />
      <div className="text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }:
  { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'accent' }) {
  return (
    <span className={cn('text-[11px] px-2 py-0.5 rounded-full border',
      tone === 'accent' ? 'border-accent/40 text-accent' : 'border-border text-muted')}>
      {children}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted py-2">{children}</p>;
}
