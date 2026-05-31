import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';


export const metadata: Metadata = {
  title: 'About',
  description:
    "Nexus is built by a small team that kept losing important work to scattered tools. We're building the calm, structured workspace we always wanted.",
};

const TEAM: { name: string; role: string; bio: string; photo: string }[] = [
  {
    name: 'Ayo Reeves',
    role: 'Co-founder & CEO',
    bio: 'Previously led product at an enterprise SaaS company. Spent three years watching teams fail to maintain their knowledge bases.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop&crop=face',
  },
  {
    name: 'Priya Iyer',
    role: 'Co-founder & CPO',
    bio: 'Designed and shipped knowledge tools at two companies. Believes the right interface can change the way people think.',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=face',
  },
  {
    name: 'Marcus Olin',
    role: 'Co-founder & CTO',
    bio: 'Built distributed systems and real-time collaboration infrastructure. Obsessed with making complex things feel simple.',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop&crop=face',
  },
];

const VALUES = [
  {
    label: 'Calm, not cluttered',
    body: 'Every decision starts with: does this make the workspace quieter or noisier? We add features only when the absence of them causes real problems.',
  },
  {
    label: 'Structure earns trust',
    body: 'A workspace you trust is one with a place for everything. We believe good information architecture is a product feature, not a user responsibility.',
  },
  {
    label: 'Honest about where we are',
    body: "We're an early product. We say what works, what doesn't, and what's on the roadmap — without marketing language that papers over the gaps.",
  },
  {
    label: 'Built for the long run',
    body: 'Your knowledge compounds over years. Nexus is designed to be the workspace that grows with you, not one you outgrow in eighteen months.',
  },
];

export default function AboutPage() {
  return (
    <div className="px-6">
      {/* Hero */}
      <section className="pt-20 pb-16 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="max-w-[700px]">
            <h1 className="font-display text-[clamp(38px,5.5vw,66px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-7">
              We're building the workspace<br className="hidden sm:block" /> we always wanted.
            </h1>
            <p className="text-[19px] text-muted leading-relaxed max-w-[54ch]">
              Nexus started because we kept having the same frustrating experience: important knowledge scattered across tools, decisions buried in Slack, documentation that nobody trusted. We built the workspace that fixes this.
            </p>
          </div>
        </RevealOnScroll>
      </section>

      {/* Divider */}
      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Story */}
      <section className="py-20 max-w-[1120px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-start">
          <RevealOnScroll>
            <h2 className="font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.028em] leading-[1.1]">
              The problem we kept hitting
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={80}>
            <div className="space-y-5 text-[16.5px] text-muted leading-relaxed">
              <p>
                In every company we've worked at or talked to, the knowledge problem looks the same. There's a Google Drive full of docs that nobody maintains. A Notion that started clean and turned into a maze. A Slack graveyard where decisions go to die. A new hire who spends their first three weeks just trying to understand what already exists.
              </p>
              <p>
                The tools aren't bad. But they were designed for individuals, then stretched to fit teams. They collect information; they don't organize it. They store knowledge; they don't surface it when you need it.
              </p>
              <p>
                We spent a long time talking to teams about what they actually needed. The answer was always some version of the same thing: <strong className="text-foreground font-medium">a workspace that feels like it's working with you, not against you.</strong> One that stays organized as it grows. One you can trust to have the answer.
              </p>
              <p>
                That's what we're building. It's early. There's a lot still ahead. But the foundation — a calm, structured, infinitely-nestable workspace — is solid. And the teams using it every day are telling us it's already making a difference.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Values */}
      <section className="py-20 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-14">
          <h2 className="font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.028em]">
            What we believe
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 gap-[18px]">
          {VALUES.map(({ label, body }, i) => (
            <RevealOnScroll key={label} delay={i * 60}>
              <div className="p-7 rounded-2xl border border-border bg-card h-full">
                <h3 className="text-[18px] font-semibold tracking-tight mb-3">{label}</h3>
                <p className="text-[14.5px] text-muted leading-relaxed">{body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Team */}
      <section className="py-20 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-14">
          <h2 className="font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.028em]">
            The team
          </h2>
          <p className="text-[16.5px] text-muted mt-3 max-w-[52ch]">
            Small enough to move fast. Experienced enough to know what matters.
          </p>
        </RevealOnScroll>
        <div className="grid md:grid-cols-3 gap-[18px]">
          {TEAM.map(({ name, role, bio, photo }, i) => (
            <RevealOnScroll key={name} delay={i * 70}>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Headshot */}
                <div className="relative h-[200px] overflow-hidden bg-sidebar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt={name} className="w-full h-full object-cover object-top" />
                </div>
                {/* Info */}
                <div className="p-6">
                  <div className="text-[17px] font-semibold tracking-tight">{name}</div>
                  <div className="text-[13.5px] text-accent font-medium mt-0.5 mb-3">{role}</div>
                  <p className="text-[14px] text-muted leading-relaxed">{bio}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <RevealOnScroll className="mt-8" delay={210}>
          <div className="p-7 rounded-2xl border border-dashed border-border bg-card/50 text-center">
            <div className="text-[16px] font-medium mb-1">We're hiring</div>
            <p className="text-[14.5px] text-muted mb-4">
              Looking for thoughtful engineers and designers who care about how information is organized.
            </p>
            <a
              href="mailto:jobs@usenexus.app"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-accent hover:text-accent/80 transition-colors"
            >
              jobs@usenexus.app <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </RevealOnScroll>
      </section>

      {/* Divider */}
      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* CTA */}
      <section className="py-20">
        <RevealOnScroll className="max-w-[1120px] mx-auto">
          <div className="text-center rounded-3xl border border-border bg-gradient-to-b from-card to-sidebar px-8 py-20 relative overflow-hidden">
            <div
              className="absolute left-1/2 -top-2/5 w-[600px] h-[400px] -translate-x-1/2 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent), transparent 65%)',
                filter: 'blur(30px)',
              }}
            />
            <h2 className="relative font-display text-[clamp(26px,3.6vw,44px)] font-semibold tracking-[-0.03em] mb-4">
              Try it yourself
            </h2>
            <p className="relative text-[17px] text-muted max-w-[42ch] mx-auto mb-8">
              Your first workspace is free. No credit card, no time limit.
            </p>
            <Link
              href="/signup"
              className="nb-press relative inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-medium bg-cta text-cta-foreground"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
