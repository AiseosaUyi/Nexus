'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Pencil, Layers, Users, Download, Calendar, Lock,
  Check, Folder, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

// ─── Scroll Reveal ──────────────────────────────────────────────────────────────
function RevealOnScroll({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Character illustrations ──────────────────────────────────────────────────────
function CharacterSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
      <symbol id="c-peek" viewBox="0 0 140 96" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="33" cy="74" rx="11" ry="8" fill="#b14e2c" /><ellipse cx="107" cy="74" rx="11" ry="8" fill="#b14e2c" />
        <circle cx="70" cy="42" r="27" fill="#fcf9f2" /><path d="M44 40 Q46 14 70 15 Q94 14 96 40" fill="#2b251c" stroke="none" />
        <circle cx="60" cy="44" r="2.8" fill="#2b251c" stroke="none" /><circle cx="80" cy="44" r="2.8" fill="#2b251c" stroke="none" />
        <path d="M54 37 Q60 34 65 37" /><path d="M75 37 Q80 34 86 37" /><path d="M60 55 Q70 64 80 55" />
        <circle cx="52" cy="53" r="4.5" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="88" cy="53" r="4.5" fill="#b14e2c" opacity=".22" stroke="none" />
      </symbol>
      <symbol id="c-wave" viewBox="0 0 120 168" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 108 L50 150" /><path d="M68 108 L70 150" /><ellipse cx="48" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" /><ellipse cx="72" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" />
        <path d="M40 60 Q60 54 80 60 L74 108 Q60 114 46 108 Z" fill="#5e7152" />
        <path d="M44 66 L33 96" /><circle cx="32" cy="99" r="5" fill="#fcf9f2" /><path d="M76 64 L98 38" /><circle cx="100" cy="35" r="5.5" fill="#fcf9f2" />
        <path d="M107 29 q4 -3 7 -1" opacity=".45" /><path d="M105 22 q5 -4 10 -2" opacity=".35" />
        <circle cx="60" cy="34" r="22" fill="#fcf9f2" /><path d="M39 32 Q41 10 60 11 Q79 10 81 32" fill="#2b251c" stroke="none" />
        <circle cx="53" cy="35" r="2.6" fill="#2b251c" stroke="none" /><circle cx="67" cy="35" r="2.6" fill="#2b251c" stroke="none" /><path d="M54 44 Q60 50 66 44" />
        <circle cx="47" cy="42" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="73" cy="42" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
      </symbol>
      <symbol id="c-jump" viewBox="0 0 140 150" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M38 138 q10 6 22 4" opacity=".4" /><path d="M80 142 q10 -2 20 -8" opacity=".4" />
        <path d="M58 96 L46 116 L52 132" /><path d="M82 96 L96 114 L92 132" /><ellipse cx="52" cy="134" rx="8" ry="4.5" fill="#2b251c" stroke="none" /><ellipse cx="92" cy="134" rx="8" ry="4.5" fill="#2b251c" stroke="none" />
        <path d="M50 54 Q70 48 90 54 L84 98 Q70 104 56 98 Z" fill="#b14e2c" />
        <path d="M55 60 L37 34" /><circle cx="35" cy="31" r="5" fill="#fcf9f2" /><path d="M85 60 L103 34" /><circle cx="105" cy="31" r="5" fill="#fcf9f2" />
        <circle cx="70" cy="34" r="21" fill="#fcf9f2" /><path d="M51 32 Q53 11 70 12 Q87 11 89 32" fill="#2b251c" stroke="none" />
        <circle cx="63" cy="33" r="2.6" fill="#2b251c" stroke="none" /><circle cx="77" cy="33" r="2.6" fill="#2b251c" stroke="none" />
        <path d="M64 41 Q70 50 76 41 Z" fill="#2b251c" stroke="none" />
        <circle cx="57" cy="41" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="83" cy="41" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
      </symbol>
      <symbol id="c-write" viewBox="0 0 150 162" stroke="#2b251c" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 110 L56 150" /><path d="M74 110 L78 150" /><ellipse cx="54" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" /><ellipse cx="80" cy="152" rx="9" ry="5" fill="#2b251c" stroke="none" />
        <path d="M46 62 Q66 56 86 62 L80 110 Q66 116 52 110 Z" fill="#5e7152" />
        <rect x="98" y="30" width="15" height="64" rx="4" fill="#c08a3e" /><path d="M98 94 L105.5 110 L113 94 Z" fill="#fcf9f2" /><path d="M103 104 L105.5 110 L108 104 Z" fill="#2b251c" stroke="none" /><rect x="98" y="24" width="15" height="8" rx="3" fill="#b14e2c" />
        <path d="M52 70 L84 80" /><circle cx="86" cy="81" r="5" fill="#fcf9f2" /><path d="M82 64 L100 72" /><circle cx="103" cy="73" r="5" fill="#fcf9f2" />
        <circle cx="64" cy="38" r="22" fill="#fcf9f2" /><path d="M44 36 Q46 14 64 15 Q82 14 84 36" fill="#2b251c" stroke="none" />
        <circle cx="60" cy="40" r="2.6" fill="#2b251c" stroke="none" /><circle cx="74" cy="40" r="2.6" fill="#2b251c" stroke="none" /><path d="M58 48 Q64 53 70 48" />
        <circle cx="53" cy="46" r="4" fill="#b14e2c" opacity=".22" stroke="none" /><circle cx="79" cy="46" r="4" fill="#b14e2c" opacity=".22" stroke="none" />
      </symbol>
    </defs></svg>
  );
}
const charBob = { animation: 'c-bob 4.2s ease-in-out infinite' } as const;
const charBob2 = { animation: 'c-bob 5s ease-in-out infinite' } as const;
const charWig = { animation: 'c-wig 4s ease-in-out infinite', transformOrigin: 'bottom center' } as const;

// ─── Nav ────────────────────────────────────────────────────────────────────────
function Nav() {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('businesses').select('slug').limit(1).single().then(({ data }) => { if (data) setWorkspaceSlug(data.slug); });
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${stuck ? 'bg-background/80 backdrop-blur-xl border-b border-border' : 'border-b border-transparent'}`}>
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-[19px] tracking-tight">
          <span className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-bold">N</span>
          Nexus
        </Link>
        <div className="hidden md:flex items-center gap-1 text-[14px]">
          {[['Features', '#features'], ['How it works', '#tree'], ['Pricing', '#pricing']].map(([l, h]) => (
            <a key={h} href={h} className="px-3.5 py-2 rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {workspaceSlug ? (
            <Link href={`/w/${workspaceSlug}/dashboard`} className="nb-press px-4 py-2 rounded-xl text-[14px] font-medium bg-cta text-cta-foreground">Workspace</Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block px-3 py-2 text-[14px] text-muted hover:text-foreground transition-colors">Sign in</Link>
              <Link href="/signup" className="nb-press px-4 py-2 rounded-xl text-[14px] font-medium bg-cta text-cta-foreground">Start free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────────
function Shot({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="relative max-w-[1000px] mx-auto rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} className="block w-full h-auto" />
    </div>
  );
}
function FeatureCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="group p-7 rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center text-accent mb-5 transition-colors group-hover:bg-accent group-hover:text-white group-hover:border-accent">
        <Icon className="w-[21px] h-[21px]" strokeWidth={1.9} />
      </div>
      <h3 className="text-[18.5px] font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-[14.5px] text-muted leading-relaxed">{children}</p>
    </div>
  );
}
function Tick({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-[15.5px] text-muted">
      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in oklab, var(--nb-green) 22%, transparent)', color: 'var(--nb-green)' }}>
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <CharacterSprite />
      <Nav />

      {/* HERO */}
      <section className="px-6 pt-28 sm:pt-36 pb-14 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="hero-stagger-1 text-[12.5px] font-semibold tracking-[0.16em] uppercase text-accent mb-7">Block-based knowledge workspace</div>
          <h1 className="hero-stagger-2 font-display text-[clamp(44px,7vw,84px)] leading-[1.0] font-semibold tracking-[-0.04em] max-w-[15ch] mx-auto mb-7">
            A calm home for{' '}
            <span className="relative whitespace-nowrap">everything
              <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute left-0 right-0 -bottom-2 w-full h-[0.22em] text-accent overflow-visible"><path d="M2 8 C 50 2, 150 2, 198 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
            </span> you know.
          </h1>
          <p className="hero-stagger-3 text-[clamp(17px,1.7vw,21px)] text-muted max-w-[52ch] mx-auto leading-relaxed mb-10">
            Nexus brings your notes, documents, and plans into one quiet, organized workspace. Nested as deep as you like, shared with your team, and never lost again.
          </p>
          <div className="hero-stagger-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="nb-press inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium bg-cta text-cta-foreground">Start free <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/login" className="nb-press inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-[15px] font-medium border border-border bg-card hover:border-foreground transition-colors">Sign in</Link>
          </div>
          <p className="hero-stagger-5 mt-5 text-[13.5px] text-muted">Free for your first workspace · No credit card required</p>

          <div className="hero-stagger-5 relative mt-16">
            <Shot src="/shots/app-doc.png" alt="Nexus — a document open in the workspace, with the page tree, live collaborators and comments" eager />
            <svg aria-hidden="true" className="hidden lg:block absolute pointer-events-none z-[6] drop-shadow-lg" style={{ width: 120, top: -46, right: '6%', ...charBob }}><use href="#c-peek" /></svg>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <div className="px-6 pt-16 pb-2 text-center">
        <p className="text-[12px] tracking-[0.14em] uppercase text-muted/80 font-semibold mb-7">Trusted by thoughtful teams</p>
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 opacity-70 text-[18px] font-semibold tracking-tight text-muted">
          {['Northwind', 'Vector', 'Foundry', 'Lumen', 'Halcyon', 'Cobalt'].map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="px-6 py-28">
        <div className="max-w-[1120px] mx-auto">
          <RevealOnScroll className="text-center max-w-[62ch] mx-auto">
            <div className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-accent mb-4">The product</div>
            <h2 className="font-display text-[clamp(30px,4.3vw,50px)] font-semibold tracking-[-0.034em] leading-[1.06]">Less software. More like a well-kept study.</h2>
            <p className="text-[18.5px] text-muted mt-4 leading-relaxed">Everything you need to think clearly — and nothing that gets in the way.</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] mt-14">
            <RevealOnScroll><FeatureCard icon={Pencil} title="Write in blocks">A focused editor built from blocks — text, media, tasks, code, tables. Reorder by dragging; add anything with a keystroke.</FeatureCard></RevealOnScroll>
            <RevealOnScroll delay={80}><FeatureCard icon={Layers} title="Nest forever">Folders, documents and calendars are all nodes in one tree. Organize as deeply as your thinking goes.</FeatureCard></RevealOnScroll>
            <RevealOnScroll delay={160}>
              <div className="relative">
                <FeatureCard icon={Users} title="Edit together">Live cursors and instant updates. Collaborate in real time, calmly, without a single collision.</FeatureCard>
                <svg aria-hidden="true" className="hidden lg:block absolute pointer-events-none z-[6] drop-shadow-lg" style={{ width: 70, top: -37, right: 16, ...charBob2 }}><use href="#c-peek" /></svg>
              </div>
            </RevealOnScroll>
            <RevealOnScroll><FeatureCard icon={Download} title="Bring it over">Import from Notion with a single URL. Your pages arrive as clean, native Nexus blocks.</FeatureCard></RevealOnScroll>
            <RevealOnScroll delay={80}><FeatureCard icon={Calendar} title="Plan over time">Attach any page to a date. Content, releases, and prep — all on one gentle timeline.</FeatureCard></RevealOnScroll>
            <RevealOnScroll delay={160}><FeatureCard icon={Lock} title="Calm control">Admin, editor, viewer. Clear roles per workspace, so everyone always knows where they stand.</FeatureCard></RevealOnScroll>
          </div>
        </div>
      </section>

      {/* CALENDAR SHOWCASE */}
      <section className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto">
          <RevealOnScroll className="text-center max-w-[62ch] mx-auto">
            <div className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-accent mb-4">Plan visually</div>
            <h2 className="font-display text-[clamp(30px,4.3vw,50px)] font-semibold tracking-[-0.034em] leading-[1.06]">Your calendar, in the same calm space.</h2>
            <p className="text-[18.5px] text-muted mt-4 leading-relaxed">Attach any page to a date and see the whole month at a glance — content, releases, and prep on one timeline.</p>
          </RevealOnScroll>
          <RevealOnScroll className="mt-12"><Shot src="/shots/app-calendar.png" alt="Nexus — the content calendar showing a month of scheduled pages" /></RevealOnScroll>
        </div>
      </section>

      {/* ONE TREE */}
      <section id="tree" className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto grid lg:grid-cols-[1fr_1.05fr] gap-16 items-center">
          <RevealOnScroll>
            <div className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-accent mb-4">One tree</div>
            <h3 className="font-display text-[clamp(26px,3.2vw,38px)] font-semibold tracking-[-0.028em] leading-[1.1] mb-4">Everything has a place.</h3>
            <p className="text-[16.5px] text-muted leading-relaxed mb-6 max-w-[46ch]">No more guessing whether something is a “page” or a “file.” In Nexus it&apos;s all one tree — so you can nest, move, and find anything without friction.</p>
            <ul className="flex flex-col gap-3">
              <Tick>Nested pages and folders</Tick><Tick>Drag-and-drop reordering</Tick>
              <Tick>Search across everything</Tick><Tick>A calendar entry is just another node</Tick>
            </ul>
          </RevealOnScroll>
          <RevealOnScroll delay={120}>
            <div className="relative rounded-2xl border border-border bg-card p-7 shadow-lg">
              <svg aria-hidden="true" className="hidden lg:block absolute pointer-events-none z-[6] drop-shadow-lg" style={{ width: 92, bottom: -14, left: -56, ...charWig }}><use href="#c-write" /></svg>
              {[
                { icon: Folder, name: 'Acme Inc', lvl: 0, hot: false },
                { icon: Folder, name: 'Marketing', lvl: 1, hot: false },
                { icon: FileText, name: 'Launch Plan', lvl: 2, hot: false },
                { icon: FileText, name: 'Brand Voice', lvl: 2, hot: false },
                { icon: Folder, name: 'Engineering', lvl: 1, hot: false },
                { icon: FileText, name: 'System Architecture', lvl: 2, hot: true },
                { icon: Calendar, name: 'Content Calendar', lvl: 1, hot: false },
              ].map((n, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14.5px] ${n.hot ? 'bg-sidebar text-foreground font-medium' : 'text-muted'} ${n.lvl === 0 ? 'font-semibold text-foreground' : ''}`} style={{ marginLeft: n.lvl * 22 }}>
                  <n.icon className={`w-4 h-4 shrink-0 ${n.hot || n.lvl === 0 ? 'text-accent' : ''}`} strokeWidth={1.9} />
                  {n.name}
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* STATEMENT + METRICS */}
      <section className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto relative">
          <svg aria-hidden="true" className="hidden lg:block absolute pointer-events-none z-[6] drop-shadow-lg" style={{ width: 104, top: -30, right: '1%', ...charBob }}><use href="#c-jump" /></svg>
          <RevealOnScroll className="text-center max-w-[900px] mx-auto">
            <p className="font-display text-[clamp(24px,3.3vw,40px)] leading-[1.32] font-medium tracking-[-0.022em]">A workspace should feel less like software and <span className="text-accent">more like a well-kept library</span> — calm, ordered, and impossible to lose your place in.</p>
          </RevealOnScroll>
          <RevealOnScroll className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-2xl overflow-hidden mt-16">
            {[['10k+', 'blocks per document'], ['<30ms', 'real-time sync'], ['99.99%', 'uptime']].map(([n, l]) => (
              <div key={l} className="bg-background py-9 px-8 text-center"><div className="font-display text-[clamp(34px,4.2vw,50px)] font-semibold tracking-[-0.03em]">{n}</div><div className="text-[14px] text-muted mt-2">{l}</div></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto">
          <RevealOnScroll className="text-center max-w-[62ch] mx-auto">
            <div className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-accent mb-4">How it works</div>
            <h2 className="font-display text-[clamp(30px,4.3vw,50px)] font-semibold tracking-[-0.034em] leading-[1.06]">From blank page to second brain.</h2>
          </RevealOnScroll>
          <RevealOnScroll className="grid md:grid-cols-3 mt-14 border-t border-border">
            {[
              ['STEP 01', 'Create a workspace', 'Spin one up in seconds. Invite your team and set roles.'],
              ['STEP 02', 'Capture everything', 'Write docs, nest folders, import from Notion. Every idea becomes a node you can find again.'],
              ['STEP 03', 'Plan & ship', 'Attach pages to a calendar and collaborate in real time as your knowledge compounds.'],
            ].map(([n, t, d], i) => (
              <div key={i} className={`py-8 pr-8 ${i < 2 ? 'border-r border-border' : ''}`}>
                <div className="text-[13px] font-semibold text-accent tabular-nums">{n}</div>
                <h3 className="text-[20px] font-semibold tracking-tight mt-4 mb-2">{t}</h3>
                <p className="text-[15px] text-muted leading-relaxed max-w-[34ch]">{d}</p>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* QUOTE */}
      <section className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto relative">
          <svg aria-hidden="true" className="hidden lg:block absolute pointer-events-none z-[6] drop-shadow-lg" style={{ width: 90, bottom: -24, left: '3%', ...charBob2 }}><use href="#c-wave" /></svg>
          <RevealOnScroll className="text-center max-w-[840px] mx-auto">
            <p className="font-display text-[clamp(23px,3.1vw,34px)] leading-[1.36] font-medium tracking-[-0.02em]">“It&apos;s the first tool that feels calm. Everything has a home, nothing gets lost, and the whole team just knows where to look.”</p>
            <div className="mt-8 flex items-center justify-center gap-3.5 text-[14.5px] text-muted">
              <span className="w-11 h-11 rounded-full bg-accent text-white flex items-center justify-center font-bold">SR</span>
              <div className="text-left"><b className="text-foreground font-semibold">Sara Reyes</b><br />Head of Product, Northwind</div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-28">
        <div className="max-w-[1120px] mx-auto">
          <RevealOnScroll className="text-center max-w-[62ch] mx-auto">
            <div className="text-[12.5px] font-semibold tracking-[0.14em] uppercase text-accent mb-4">Pricing</div>
            <h2 className="font-display text-[clamp(30px,4.3vw,50px)] font-semibold tracking-[-0.034em] leading-[1.06]">Simple plans that grow with you.</h2>
          </RevealOnScroll>
          <div className="grid lg:grid-cols-3 gap-[18px] mt-14 max-w-[400px] lg:max-w-none mx-auto">
            {[
              { t: 'Personal', a: '$0', s: ' / forever', d: 'Your first workspace and solo thinking.', f: ['Unlimited pages & blocks', 'Infinite nesting', 'Content calendar'], cta: 'Get started', feat: false },
              { t: 'Team', a: '$12', s: ' / user / mo', d: 'For teams building a shared brain.', f: ['Everything in Personal', 'Real-time collaboration', 'Roles & permissions', 'Notion import'], cta: 'Start free trial', feat: true },
              { t: 'Enterprise', a: 'Custom', s: '', d: 'For organizations with scale & security needs.', f: ['SSO & SAML', 'Audit logs', 'Dedicated support'], cta: 'Contact sales', feat: false },
            ].map((p) => (
              <RevealOnScroll key={p.t}>
                <div className={`relative h-full flex flex-col rounded-2xl bg-card p-8 transition-all hover:-translate-y-1 ${p.feat ? 'border-[1.5px] border-accent shadow-lg' : 'border border-border'}`}>
                  {p.feat && <span className="absolute -top-3 left-8 text-[11px] font-bold uppercase tracking-wide text-white bg-accent px-3 py-1 rounded-full">Most popular</span>}
                  <div className="text-[14px] font-semibold text-muted">{p.t}</div>
                  <div className="font-display text-[44px] font-semibold tracking-[-0.03em] mt-3.5 mb-0.5">{p.a}<span className="text-[14px] text-muted font-normal">{p.s}</span></div>
                  <div className="text-[13.5px] text-muted mb-6 leading-snug">{p.d}</div>
                  <ul className="flex flex-col gap-3 text-[14px] text-muted mb-7 flex-1">
                    {p.f.map((x) => <li key={x} className="flex items-center gap-2.5"><Check className="w-[15px] h-[15px] shrink-0" style={{ color: 'var(--nb-green)' }} strokeWidth={3} />{x}</li>)}
                  </ul>
                  <Link href="/signup" className={`text-center text-[14.5px] font-medium py-3 rounded-xl transition-colors ${p.feat ? 'bg-cta text-cta-foreground' : 'border border-border hover:bg-hover'}`}>{p.cta}</Link>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-28">
        <RevealOnScroll className="max-w-[1120px] mx-auto">
          <div className="relative overflow-hidden text-center rounded-3xl border border-border bg-gradient-to-b from-card to-sidebar px-8 py-20 shadow-lg">
            <div className="absolute left-1/2 -top-2/5 w-[600px] h-[400px] -translate-x-1/2 pointer-events-none" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent), transparent 65%)', filter: 'blur(30px)' }} />
            <h2 className="relative font-display text-[clamp(30px,4.3vw,50px)] font-semibold tracking-[-0.034em] mb-4">Give your thinking a calm place to live.</h2>
            <p className="relative text-[18px] text-muted max-w-[44ch] mx-auto mb-8">Join the teams who finally stopped losing their best ideas. Your first workspace is free.</p>
            <Link href="/signup" className="nb-press relative inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[15px] font-medium bg-cta text-cta-foreground">Start free <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* FOOTER */}
      <footer className="px-6 pt-16 pb-12 border-t border-border bg-sidebar">
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-[1.7fr_1fr_1fr_1fr] gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 font-semibold text-[16px] tracking-tight"><span className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-[11px] font-bold">N</span>Nexus</div>
              <p className="text-[14.5px] text-muted max-w-[30ch] mt-3.5 leading-relaxed">A calm home for everything you know. Write, organize, and plan — all in one place.</p>
            </div>
            {[['Product', ['Features', 'Pricing', 'How it works', 'Changelog']], ['Company', ['About', 'Blog', 'Careers', 'Contact']], ['Resources', ['Docs', 'API', 'Community', 'Status']]].map(([h, items]) => (
              <div key={h as string}>
                <h4 className="text-[12px] tracking-[0.1em] uppercase text-muted/80 font-semibold mb-4">{h as string}</h4>
                {(items as string[]).map((x) => <a key={x} href="#" className="block text-[14.5px] text-muted hover:text-accent transition-colors mb-2.5">{x}</a>)}
              </div>
            ))}
          </div>
          <div className="mt-14 pt-7 border-t border-border flex justify-between flex-wrap gap-3 text-[13px] text-muted">
            <span>© {new Date().getFullYear()} Nexus, Inc. All rights reserved.</span>
            <span>Privacy · Terms</span>
          </div>
        </div>
      </footer>
    </>
  );
}
