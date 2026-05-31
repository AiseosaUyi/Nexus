import type { Metadata } from 'next';
import { CheckCircle2, Circle } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Real-time status for all Nexus systems.',
};

const SYSTEMS = [
  { name: 'Web application', status: 'operational' as const },
  { name: 'API', status: 'operational' as const },
  { name: 'Authentication', status: 'operational' as const },
  { name: 'Real-time collaboration', status: 'operational' as const },
  { name: 'File storage', status: 'operational' as const },
  { name: 'Email delivery', status: 'operational' as const },
];

const UPTIME: [string, string][] = [
  ['Last 30 days', '99.98%'],
  ['Last 90 days', '99.96%'],
  ['Last 365 days', '99.94%'],
];

const INCIDENTS: { date: string; title: string; severity: 'minor' | 'major'; resolved: boolean; description: string }[] = [];

function StatusBadge({ status }: { status: 'operational' | 'degraded' | 'outage' }) {
  if (status === 'operational') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--nb-green)' }}>
        <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
        Operational
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--nb-yellow)' }}>
        <Circle className="w-4 h-4" strokeWidth={2} />
        Degraded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
      <Circle className="w-4 h-4" strokeWidth={2} />
      Outage
    </span>
  );
}

export default function StatusPage() {
  const allOperational = SYSTEMS.every((s) => s.status === 'operational');

  return (
    <div className="px-6">
      <section className="pt-20 pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="text-[13px] font-semibold tracking-[0.1em] uppercase text-accent mb-5">Status</div>
          <div className="flex items-start gap-5 mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 mt-1"
              style={{
                background: allOperational
                  ? 'color-mix(in oklab, var(--nb-green) 14%, transparent)'
                  : 'color-mix(in oklab, var(--accent) 14%, transparent)',
              }}
            >
              <CheckCircle2
                className="w-8 h-8"
                style={{ color: allOperational ? 'var(--nb-green)' : 'var(--accent)' }}
                strokeWidth={2}
              />
            </div>
            <div>
              <h1 className="font-display text-[clamp(28px,4vw,48px)] font-semibold tracking-[-0.035em] leading-[1.05]">
                {allOperational ? 'All systems operational' : 'Some systems affected'}
              </h1>
              <p className="text-[17px] text-muted mt-2">
                {allOperational
                  ? 'Everything is running normally. No incidents to report.'
                  : 'We are investigating issues with some systems. Check below for details.'}
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Systems */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(20px,2.4vw,28px)] font-semibold tracking-[-0.022em]">
            System status
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {SYSTEMS.map((sys, i) => (
              <div
                key={sys.name}
                className={`flex items-center justify-between px-6 py-4 ${i < SYSTEMS.length - 1 ? 'border-b border-border' : ''}`}
              >
                <span className="text-[15px] font-medium">{sys.name}</span>
                <StatusBadge status={sys.status} />
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Uptime */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(20px,2.4vw,28px)] font-semibold tracking-[-0.022em]">
            Uptime
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="grid sm:grid-cols-3 gap-[18px]">
            {UPTIME.map(([period, pct]) => (
              <div key={period} className="p-6 rounded-2xl border border-border bg-card text-center">
                <div
                  className="font-display text-[clamp(32px,4vw,48px)] font-semibold tracking-[-0.03em]"
                  style={{ color: 'var(--nb-green)' }}
                >
                  {pct}
                </div>
                <div className="text-[13.5px] text-muted mt-1">{period}</div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Incidents */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(20px,2.4vw,28px)] font-semibold tracking-[-0.022em]">
            Recent incidents
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          {INCIDENTS.length === 0 ? (
            <div className="flex items-center gap-4 p-7 rounded-2xl border border-border bg-card">
              <CheckCircle2 className="w-7 h-7 shrink-0" style={{ color: 'var(--nb-green)' }} strokeWidth={2} />
              <div>
                <div className="text-[15.5px] font-medium">No incidents in the last 90 days</div>
                <div className="text-[14px] text-muted mt-0.5">Nexus has been running smoothly.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {INCIDENTS.map((inc) => (
                <div key={inc.date} className="p-6 rounded-2xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-[15.5px] font-semibold">{inc.title}</h3>
                    <span className="text-[12px] text-muted shrink-0">{inc.date}</span>
                  </div>
                  <p className="text-[14px] text-muted leading-relaxed">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </RevealOnScroll>
      </section>

      <section className="pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <p className="text-[14px] text-muted">
            Subscribe to status updates:{' '}
            <a href="mailto:status@usenexus.app" className="text-accent hover:opacity-80 transition-opacity">
              status@usenexus.app
            </a>
          </p>
        </RevealOnScroll>
      </section>
    </div>
  );
}
