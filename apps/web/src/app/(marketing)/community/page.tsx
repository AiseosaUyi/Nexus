'use client';

import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

// ─── Brand SVG marks ──────────────────────────────────────────────────────────
function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.079.11 18.1.127 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
type Channel = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  cta: string;
  href: string;
  tag?: string;
};

const CHANNELS: Channel[] = [
  {
    icon: DiscordMark,
    name: 'Discord',
    desc: 'Ask questions, share setups, and talk directly to the team. Most active channel for getting help quickly.',
    cta: 'Join Discord',
    href: '#',
    tag: 'Most active',
  },
  {
    icon: GitHubMark,
    name: 'GitHub',
    desc: 'Browse the public roadmap, report bugs, and follow along as we build. Issue tracker is public.',
    cta: 'View on GitHub',
    href: '#',
  },
  {
    icon: XMark,
    name: 'Twitter / X',
    desc: 'Announcements, feature drops, and the occasional hot take on knowledge management.',
    cta: 'Follow @usenexus',
    href: '#',
  },
  {
    icon: ({ className }) => <Mail className={className} strokeWidth={1.7} />,
    name: 'Newsletter',
    desc: "Monthly updates on what we shipped, what we learned, and what's next. Never more than once a month.",
    cta: 'Subscribe',
    href: '#',
  },
];

const WAYS: { title: string; body: string }[] = [
  {
    title: 'Report bugs',
    body: 'Found something broken? Open a GitHub issue or drop a message in #bug-reports on Discord. Include your browser, steps to reproduce, and what you expected.',
  },
  {
    title: 'Request features',
    body: 'Have an idea? Start a discussion on Discord or GitHub. The most requested, well-reasoned ideas end up on the roadmap. We read everything.',
  },
  {
    title: 'Share your setup',
    body: 'Show us how you use Nexus — your workspace structure, your workflow, how you onboarded your team. We feature community setups and they help everyone.',
  },
  {
    title: 'Spread the word',
    body: "The single most helpful thing you can do is tell a colleague who's suffering through a sprawling Notion or broken Google Drive. Word of mouth is how we grow.",
  },
];

export default function CommunityPage() {
  return (
    <div className="px-6">
      {/* Hero */}
      <section className="pt-20 pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="text-[13px] font-semibold tracking-[0.1em] uppercase text-accent mb-5">Community</div>
          <h1 className="font-display text-[clamp(34px,5vw,60px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-6">
            You&apos;re building this too.
          </h1>
          <p className="text-[19px] text-muted leading-relaxed max-w-[52ch]">
            Nexus is a small team and a product that wants to be shaped by the people who use it. Come talk to us — ask questions, share ideas, tell us what&apos;s broken.
          </p>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Channels */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-10">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Where we hang out
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 gap-[18px]">
          {CHANNELS.map(({ icon: Icon, name, desc, cta, href, tag }, i) => (
            <RevealOnScroll key={name} delay={i * 60}>
              <div className="relative p-7 rounded-2xl border border-border bg-card h-full flex flex-col">
                {tag && (
                  <span
                    className="absolute top-4 right-4 text-[10.5px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full"
                    style={{
                      background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
                      color: 'var(--accent)',
                      border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
                    }}
                  >
                    {tag}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl border border-border bg-background flex items-center justify-center text-accent mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[18px] font-semibold tracking-tight mb-2">{name}</h3>
                <p className="text-[14.5px] text-muted leading-relaxed flex-1 mb-5">{desc}</p>
                <a
                  href={href}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:opacity-80 transition-opacity"
                >
                  {cta} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
                </a>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Ways to contribute */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-10">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Ways to get involved
          </h2>
          <p className="text-[16px] text-muted mt-3 max-w-[52ch]">
            You don&apos;t have to write code to make Nexus better.
          </p>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 gap-[18px]">
          {WAYS.map(({ title, body }, i) => (
            <RevealOnScroll key={title} delay={i * 60}>
              <div className="flex gap-5 p-6 rounded-2xl border border-border bg-card h-full">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[13px] mt-0.5"
                  style={{
                    background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold tracking-tight mb-2">{title}</h3>
                  <p className="text-[14px] text-muted leading-relaxed">{body}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Direct contact */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em] mb-4">
                Talk to the founders
              </h2>
              <p className="text-[16px] text-muted leading-relaxed mb-5">
                We&apos;re a small team and we mean it when we say we want to hear from you. Not a support ticket queue — an actual conversation. Email us and one of the founders will reply.
              </p>
              <a
                href="mailto:hello@usenexus.app"
                className="inline-flex items-center gap-2 text-[16px] font-medium text-accent hover:opacity-80 transition-opacity"
              >
                hello@usenexus.app <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
              </a>
            </div>
            <div className="p-7 rounded-2xl border border-border bg-card space-y-4">
              {[
                { label: 'General', email: 'hello@usenexus.app' },
                { label: 'Support', email: 'support@usenexus.app' },
                { label: 'Security', email: 'security@usenexus.app' },
                { label: 'Press', email: 'press@usenexus.app' },
              ].map(({ label, email }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[13.5px] text-muted">{label}</span>
                  <a href={`mailto:${email}`} className="text-[13.5px] font-medium text-accent hover:opacity-80 transition-opacity">
                    {email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <RevealOnScroll className="max-w-[1120px] mx-auto">
          <div className="text-center rounded-3xl border border-border bg-gradient-to-b from-card to-sidebar px-8 py-16 relative overflow-hidden">
            <div
              className="absolute left-1/2 -top-2/5 w-[500px] h-[300px] -translate-x-1/2 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent), transparent 65%)',
                filter: 'blur(30px)',
              }}
            />
            <h2 className="relative font-display text-[clamp(24px,3.2vw,40px)] font-semibold tracking-[-0.03em] mb-4">
              Not a user yet?
            </h2>
            <p className="relative text-[16.5px] text-muted max-w-[40ch] mx-auto mb-7">
              Join the community from inside the product. Your first workspace is free.
            </p>
            <Link
              href="/signup"
              className="nb-press relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium bg-cta text-cta-foreground"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
