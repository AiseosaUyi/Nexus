'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Outfit } from 'next/font/google';
import {
  ArrowRight,
  Pen,
  CalendarDays,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

// ─── Scroll Reveal ──────────────────────────────────────────────────────────────

function RevealOnScroll({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Check if user is logged in and has a workspace
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('businesses')
          .select('slug')
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) setWorkspaceSlug(data.slug);
          });
      }
    });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-foreground rounded-lg flex items-center justify-center">
            <span className="text-background text-xs font-bold">N</span>
          </div>
          <span className={`${display.className} text-foreground font-semibold text-[15px]`}>
            Nexus
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] text-muted">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pages" className="hover:text-foreground transition-colors">
            Pages
          </a>
          <a href="#calendar" className="hover:text-foreground transition-colors">
            Calendar
          </a>
        </div>

        <div className="flex items-center gap-3">
          {workspaceSlug ? (
            <Link
              href={`/w/${workspaceSlug}/dashboard`}
              className="px-4 py-2 text-[13px] font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              Workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] text-muted hover:text-foreground transition-colors hidden sm:block"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-[13px] font-semibold bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Editor Mock ────────────────────────────────────────────────────────────────

function EditorMock() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/50">
      {/* Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-[#0f0f0f]">
        <div className="flex gap-1.5">
          <div className="w-[10px] h-[10px] rounded-full bg-white/[0.08]" />
          <div className="w-[10px] h-[10px] rounded-full bg-white/[0.08]" />
          <div className="w-[10px] h-[10px] rounded-full bg-white/[0.08]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-12 py-1 rounded-md bg-white/[0.04] text-[10px] text-white/30">
            nexus.app/w/acme/n/getting-started
          </div>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex min-h-[300px]">
        {/* Sidebar */}
        <div className="w-52 border-r border-white/[0.05] bg-[#111111] p-3 hidden sm:block">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
            <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-accent">A</span>
            </div>
            <span className="text-[11px] font-semibold text-white/70">Acme Inc</span>
          </div>
          <div className="text-[9px] font-semibold text-white/25 uppercase tracking-widest mb-2 px-2">
            Pages
          </div>
          {[
            { icon: '\u{1F4C4}', name: 'Getting Started', active: true },
            { icon: '\u{1F4C4}', name: 'Product Roadmap', active: false },
            { icon: '\u{1F4C1}', name: 'Engineering', active: false },
            { icon: '\u{1F4C4}', name: 'API Docs', indent: true },
            { icon: '\u{1F4C4}', name: 'Architecture', indent: true },
            { icon: '\u{1F4C1}', name: 'Marketing', active: false },
            { icon: '\u{1F4C5}', name: 'Content Calendar', active: false },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-2 py-[5px] rounded-md text-[11px] cursor-default ${
                item.active
                  ? 'bg-white/[0.07] text-white/90'
                  : 'text-white/40'
              } ${item.indent ? 'ml-4' : ''}`}
            >
              <span className="text-[10px]">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 p-8">
          <div className="max-w-lg">
            <h1 className={`${display.className} text-[22px] font-bold text-white/90 mb-1`}>
              Getting Started
            </h1>
            <p className="text-[13px] text-white/40 leading-relaxed mb-5">
              Welcome to your workspace. Nexus is a calm place to write, structure ideas, and keep everything organized.
            </p>
            <h2 className={`${display.className} text-[15px] font-semibold text-white/70 mb-2`}>
              Quick Start
            </h2>
            <div className="space-y-1.5 mb-5">
              {[
                'Create pages from the sidebar',
                'Write with a distraction-free editor',
                'Organize pages into folders',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px] text-white/40">
                  <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-white/20 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <h2 className={`${display.className} text-[15px] font-semibold text-white/70 mb-2`}>
              Next Steps
            </h2>
            <div className="space-y-1">
              {[
                { done: true, text: 'Create your first page' },
                { done: true, text: 'Invite a team member' },
                { done: false, text: 'Set up your content calendar' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[13px]">
                  <div
                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                      item.done
                        ? 'bg-accent border-accent'
                        : 'border-white/15 bg-transparent'
                    }`}
                  >
                    {item.done && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={item.done ? 'text-white/30 line-through' : 'text-white/50'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Mock ──────────────────────────────────────────────────────────────

function CalendarMock() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = [
    [null, null, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24, 25, 26],
    [27, 28, 29, 30, null, null, null],
  ];
  const entries = new Set([2, 7, 10, 15, 21, 24]);
  const labels: Record<number, string> = {
    2: 'Sprint review',
    10: 'v2.1 release',
    15: 'Team sync',
    24: 'Launch plan',
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05] bg-[#0f0f0f]">
        <span className={`${display.className} text-[14px] font-semibold text-white/80`}>
          April 2026
        </span>
        <div className="flex gap-1">
          <button className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 text-xs transition-colors">
            &#8249;
          </button>
          <button className="w-7 h-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 text-xs transition-colors">
            &#8250;
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 mb-1">
          {days.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-white/25 py-1.5">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((date, di) => (
              <div
                key={di}
                className={`relative text-center py-3 text-[12px] rounded-lg ${
                  date === 15
                    ? 'bg-accent/10 text-accent font-medium'
                    : date
                      ? 'text-white/50'
                      : ''
                }`}
              >
                {date}
                {date !== null && entries.has(date) && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
                {date !== null && labels[date] && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-[-2px] text-[7px] text-accent/60 whitespace-nowrap hidden lg:block">
                    {labels[date]}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page Tree Mock ─────────────────────────────────────────────────────────────

function PageTreeMock() {
  const items = [
    { icon: '\u{1F4C4}', name: 'Product Roadmap', level: 0 },
    { icon: '\u{1F4C4}', name: 'Q2 Goals', level: 1 },
    { icon: '\u{1F4C4}', name: 'Feature Specs', level: 1 },
    { icon: '\u{1F4C1}', name: 'Engineering', level: 0 },
    { icon: '\u{1F4C4}', name: 'API Documentation', level: 1 },
    { icon: '\u{1F4C4}', name: 'System Architecture', level: 1 },
    { icon: '\u{1F4C4}', name: 'Deploy Guide', level: 1 },
    { icon: '\u{1F4C1}', name: 'Marketing', level: 0 },
    { icon: '\u{1F4C4}', name: 'Launch Plan', level: 1 },
    { icon: '\u{1F4C4}', name: 'Brand Guidelines', level: 1 },
    { icon: '\u{1F4C1}', name: 'Research', level: 0 },
    { icon: '\u{1F4C4}', name: 'User Interviews', level: 1 },
    { icon: '\u{1F4C4}', name: 'Competitive Analysis', level: 1 },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141414] overflow-hidden shadow-2xl shadow-black/50 p-5">
      <div className="text-[9px] font-semibold text-white/25 uppercase tracking-widest mb-3 px-1">
        All Pages
      </div>
      <div className="space-y-[2px]">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[12px] transition-colors ${
              i === 0 ? 'bg-white/[0.05] text-white/80' : 'text-white/40'
            }`}
            style={{ paddingLeft: item.level > 0 ? `${item.level * 16 + 10}px` : undefined }}
          >
            <span className="text-[11px]">{item.icon}</span>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative p-6 rounded-xl border border-white/[0.06] bg-[#141414] hover:border-accent/20 transition-all duration-300 h-full">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-accent/[0.08] flex items-center justify-center mb-4 group-hover:bg-accent/[0.12] transition-colors">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <h3 className={`${display.className} text-[15px] font-semibold text-foreground mb-1.5`}>
          {title}
        </h3>
        <p className="text-[13px] text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Check Item ─────────────────────────────────────────────────────────────────

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[14px] text-muted">
      <div className="w-5 h-5 rounded-full bg-accent/[0.08] flex items-center justify-center shrink-0">
        <svg
          className="w-3 h-3 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {children}
    </div>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-8 sm:pt-40 sm:pb-12 px-6 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        {/* Gradient orb */}
        <div className="absolute top-[-200px] left-1/2 w-[900px] h-[600px] rounded-full bg-accent/[0.08] blur-[120px] animate-glow-drift" />
        {/* Fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-stagger-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-[12px] text-muted mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now available — start for free
          </div>

          {/* Headline */}
          <h1
            className={`${display.className} hero-stagger-2 text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem] font-extrabold tracking-[-0.02em] leading-[1.08] mb-6`}
          >
            Your workspace for
            <br />
            <span className="text-accent">documents</span> and planning
          </h1>

          {/* Subtitle */}
          <p className="hero-stagger-3 text-[17px] sm:text-lg text-muted max-w-xl mx-auto leading-relaxed mb-10">
            Write, organize, and plan in one clean workspace.
            <br className="hidden sm:block" />
            Documents, pages, and a calendar — without the complexity.
          </p>

          {/* CTAs */}
          <div className="hero-stagger-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3 bg-foreground text-background text-[14px] font-semibold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3 border border-white/[0.1] text-foreground text-[14px] font-medium rounded-lg hover:bg-white/[0.04] transition-all text-center"
            >
              Sign In
            </Link>
          </div>

          {/* Product screenshot */}
          <div className="hero-stagger-5 mt-16 sm:mt-20 relative">
            <div className="absolute -inset-6 bg-gradient-to-b from-accent/[0.03] via-transparent to-transparent rounded-3xl blur-xl" />
            <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/50">
              <img
                src="/hero-dashboard.png"
                alt="Nexus workspace dashboard"
                className="w-full h-auto block"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-10 left-[15%] right-[15%] h-20 bg-accent/[0.05] blur-3xl rounded-full" />
          </div>
        </div>
      </section>

      {/* ── Calm Place ───────────────────────────────────────────────────── */}
      <section className="py-28 sm:py-32 px-6">
        <RevealOnScroll className="max-w-2xl mx-auto text-center">
          <h2
            className={`${display.className} text-3xl sm:text-[2.5rem] font-bold tracking-[-0.02em] leading-tight mb-6`}
          >
            A calm place to think and work
          </h2>
          <p className="text-[16px] sm:text-[17px] text-muted leading-relaxed">
            Nexus gives you a simple environment to write, structure ideas, and keep
            everything organized. Create pages for anything — notes, plans, research, or
            documentation — and keep them connected in a workspace that grows with your
            work.
          </p>
        </RevealOnScroll>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-14">
              <h2
                className={`${display.className} text-2xl sm:text-3xl font-bold tracking-[-0.01em] mb-3`}
              >
                Everything you need, nothing you don&apos;t
              </h2>
              <p className="text-[15px] text-muted">
                Three tools. One workspace. Zero complexity.
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RevealOnScroll delay={0}>
              <FeatureCard
                icon={Pen}
                title="Write naturally"
                description="A clean editor designed for focus. Headings, lists, tasks, code blocks — everything you need to write well."
              />
            </RevealOnScroll>
            <RevealOnScroll delay={100}>
              <FeatureCard
                icon={Layers}
                title="Organize as pages"
                description="Every piece of work lives as a page. Nest them, group them, search them. Your workspace grows with you."
              />
            </RevealOnScroll>
            <RevealOnScroll delay={200}>
              <FeatureCard
                icon={CalendarDays}
                title="Plan on a calendar"
                description="Attach pages to dates. Content planning, release notes, meeting prep — all visible on a timeline."
              />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ── Feature: Write ───────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <RevealOnScroll>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/[0.08] text-accent text-[11px] font-semibold uppercase tracking-wider mb-5">
                  <Pen className="w-3 h-3" />
                  Editor
                </div>
                <h2
                  className={`${display.className} text-3xl sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-tight mb-5`}
                >
                  Write naturally
                </h2>
                <p className="text-[15px] text-muted leading-relaxed mb-7">
                  A clean editor designed for focus. Write long-form documents, draft ideas,
                  or capture quick notes — all in the same space.
                </p>
                <div className="space-y-3">
                  <CheckItem>Headings and rich text formatting</CheckItem>
                  <CheckItem>Bullet and numbered lists</CheckItem>
                  <CheckItem>Task lists and toggles</CheckItem>
                  <CheckItem>Code blocks and tables</CheckItem>
                </div>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={150}>
              <EditorMock />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ── Feature: Pages ───────────────────────────────────────────────── */}
      <section id="pages" className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <RevealOnScroll delay={150} className="order-2 lg:order-1">
              <PageTreeMock />
            </RevealOnScroll>
            <RevealOnScroll className="order-1 lg:order-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/[0.08] text-accent text-[11px] font-semibold uppercase tracking-wider mb-5">
                  <Layers className="w-3 h-3" />
                  Pages
                </div>
                <h2
                  className={`${display.className} text-3xl sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-tight mb-5`}
                >
                  Organize everything as pages
                </h2>
                <p className="text-[15px] text-muted leading-relaxed mb-7">
                  Every piece of work in Nexus lives as a page. Pages can contain anything
                  — notes, documentation, plans, or ideas. Your workspace grows naturally
                  as pages connect and evolve over time.
                </p>
                <div className="space-y-3">
                  <CheckItem>Nested pages and folders</CheckItem>
                  <CheckItem>Drag-and-drop reordering</CheckItem>
                  <CheckItem>Quick search across all pages</CheckItem>
                  <CheckItem>Team sharing and collaboration</CheckItem>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ── Feature: Calendar ────────────────────────────────────────────── */}
      <section id="calendar" className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <RevealOnScroll>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/[0.08] text-accent text-[11px] font-semibold uppercase tracking-wider mb-5">
                  <CalendarDays className="w-3 h-3" />
                  Calendar
                </div>
                <h2
                  className={`${display.className} text-3xl sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-tight mb-5`}
                >
                  Plan work on a calendar
                </h2>
                <p className="text-[15px] text-muted leading-relaxed mb-7">
                  Sometimes work needs a timeline. Nexus includes a built-in calendar that
                  lets you organize pages by date. Each calendar entry is a full page where
                  you can write and organize details.
                </p>
                <div className="space-y-3">
                  <CheckItem>Content planning</CheckItem>
                  <CheckItem>Release notes</CheckItem>
                  <CheckItem>Meeting preparation</CheckItem>
                  <CheckItem>Daily work planning</CheckItem>
                </div>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={150}>
              <CalendarMock />
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ── Structured ───────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <RevealOnScroll className="max-w-3xl mx-auto text-center">
          <h2
            className={`${display.className} text-3xl sm:text-[2.5rem] font-bold tracking-[-0.02em] leading-tight mb-6`}
          >
            Designed for clarity
          </h2>
          <p className="text-[16px] text-muted leading-relaxed mb-14 max-w-xl mx-auto">
            Many productivity tools try to do everything. Nexus focuses on the essentials
            — nothing more than what you actually need.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Pen, label: 'Writing documents', desc: 'A focused editor for any kind of content' },
              { icon: Layers, label: 'Organizing pages', desc: 'Nest, group, and connect your work' },
              { icon: CalendarDays, label: 'Planning over time', desc: 'Attach pages to dates on a calendar' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <RevealOnScroll key={label} delay={i * 100}>
                <div className="p-6 rounded-xl border border-white/[0.06] bg-[#141414] text-center">
                  <div className="w-11 h-11 rounded-lg bg-accent/[0.08] flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <p className={`${display.className} text-[14px] font-semibold text-foreground mb-1`}>
                    {label}
                  </p>
                  <p className="text-[12px] text-muted">{desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 sm:py-36 px-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-accent/[0.05] blur-[100px]" />

        <RevealOnScroll className="relative max-w-2xl mx-auto text-center">
          <h2
            className={`${display.className} text-3xl sm:text-[2.5rem] font-bold tracking-[-0.02em] leading-tight mb-5`}
          >
            Start building your workspace
          </h2>
          <p className="text-[16px] text-muted leading-relaxed mb-10 max-w-lg mx-auto">
            Create pages, write documents, and plan your work in a clean environment
            built for focus.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-foreground text-background text-[14px] font-semibold rounded-lg hover:opacity-90 transition-all group"
          >
            Get Started — it&apos;s free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </RevealOnScroll>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-foreground rounded-md flex items-center justify-center">
                  <span className="text-background text-[9px] font-bold">N</span>
                </div>
                <span className={`${display.className} text-foreground font-semibold text-[14px]`}>
                  Nexus
                </span>
              </div>
              <p className="text-[12px] text-muted/60 leading-relaxed">
                Documents. Pages. Planning.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-4">
                Product
              </h4>
              <div className="space-y-2.5">
                {['Features', 'Calendar', 'Pages'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="block text-[13px] text-muted hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-4">
                Company
              </h4>
              <div className="space-y-2.5">
                {['About', 'Contact'].map((item) => (
                  <a
                    key={item}
                    href="#"
                    className="block text-[13px] text-muted hover:text-foreground transition-colors"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-4">
                Get Started
              </h4>
              <div className="space-y-2.5">
                <Link
                  href="/login"
                  className="block text-[13px] text-muted hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="block text-[13px] text-accent hover:text-accent/80 transition-colors font-medium"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-white/[0.04] text-center text-[11px] text-white/20">
            &copy; {new Date().getFullYear()} Nexus. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
