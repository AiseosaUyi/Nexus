import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    "Join the Nexus team. We're a small, focused team building a better way for teams to think together.",
};

const OPENINGS: {
  title: string;
  team: string;
  location: string;
  type: string;
  desc: string;
}[] = [
  {
    title: 'Product Engineer',
    team: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    desc: 'Own features end-to-end — from the database query to the pixel on screen. We write TypeScript, React, and SQL. You care deeply about the craft and even more about the person using what you build.',
  },
  {
    title: 'Designer',
    team: 'Design',
    location: 'Remote',
    type: 'Full-time',
    desc: 'Shape how Nexus looks, feels, and communicates. This spans product UI, marketing, and the editorial voice. You think in systems and have strong opinions about when to break them.',
  },
  {
    title: 'Growth',
    team: 'Growth',
    location: 'Remote',
    type: 'Full-time',
    desc: 'Help more teams find Nexus. You understand the knowledge management space, can write clearly, and know how to build sustainable acquisition loops — not just one-off campaigns.',
  },
];

const VALUES = [
  {
    title: 'Small on purpose',
    body: "We stay small so everyone's work matters. There are no layers here. You'll talk directly to founders, ship directly to users, and see the results of your work immediately.",
  },
  {
    title: 'Remote-first',
    body: "We work async by default and meet when it's genuinely useful. Good writing matters. You'll have the context you need to make decisions without waiting for a meeting.",
  },
  {
    title: 'Thoughtful, not fast',
    body: "We'd rather spend an extra week getting something right than ship something we're not proud of. Quality is a habit, not a sprint.",
  },
  {
    title: 'Ownership without politics',
    body: "You'll own real things. No committees, no approvals for every decision. We hire people we trust and get out of their way.",
  },
];

export default function CareersPage() {
  return (
    <div className="px-6">
      {/* Hero */}
      <section className="pt-20 pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <h1 className="font-display text-[clamp(34px,5vw,62px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-6">
            Build something that matters.
          </h1>
          <p className="text-[19px] text-muted leading-relaxed max-w-[52ch] mb-8">
            We're a small team with big ambitions. If you want your work to have a direct impact on how teams think and share knowledge, this is the right place.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[14.5px] text-muted">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" strokeWidth={1.8} /> Fully remote</span>
            <span className="opacity-30">·</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" strokeWidth={1.8} /> {OPENINGS.length} open roles</span>
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Values */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-10">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            How we work
          </h2>
        </RevealOnScroll>
        <div className="grid md:grid-cols-2 gap-[18px]">
          {VALUES.map(({ title, body }, i) => (
            <RevealOnScroll key={title} delay={i * 55}>
              <div className="p-6 rounded-2xl border border-border bg-card h-full">
                <h3 className="text-[16.5px] font-semibold tracking-tight mb-2">{title}</h3>
                <p className="text-[14px] text-muted leading-relaxed">{body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Open roles */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-10">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Open roles
          </h2>
        </RevealOnScroll>
        <div className="space-y-3">
          {OPENINGS.map((role, i) => (
            <RevealOnScroll key={role.title} delay={i * 60}>
              <a
                href={`mailto:jobs@usenexus.app?subject=${encodeURIComponent(`Application: ${role.title}`)}`}
                className="group flex items-start justify-between gap-6 p-6 rounded-2xl border border-border bg-card hover:border-accent/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-[17px] font-semibold tracking-tight group-hover:text-accent transition-colors">
                      {role.title}
                    </span>
                    <span className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border border-border text-muted">
                      {role.team}
                    </span>
                  </div>
                  <p className="text-[14px] text-muted leading-relaxed max-w-[60ch]">{role.desc}</p>
                  <div className="flex items-center gap-4 mt-3 text-[13px] text-muted">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />{role.location}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" strokeWidth={1.8} />{role.type}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-[14px] font-medium text-accent mt-1">
                  Apply <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                </div>
              </a>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Speculative applications */}
      <section className="py-16 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="p-8 rounded-2xl border border-dashed border-border bg-card/60 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h3 className="text-[18px] font-semibold tracking-tight mb-2">
                Don&apos;t see your role?
              </h3>
              <p className="text-[14.5px] text-muted leading-relaxed max-w-[52ch]">
                We hire for attitude and ability as much as a specific job description. If you think you&apos;d be a great fit and can explain why, we want to hear from you.
              </p>
            </div>
            <a
              href="mailto:jobs@usenexus.app"
              className="nb-press inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14.5px] font-medium bg-cta text-cta-foreground whitespace-nowrap"
            >
              Send a note <ArrowRight className="w-4 h-4" />
            </a>
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
              Try the product first
            </h2>
            <p className="relative text-[16.5px] text-muted max-w-[42ch] mx-auto mb-7">
              We think you should use Nexus before you interview. Your first workspace is free.
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
