'use client';

/* ────────────────────────────────────────────────────────────────────────────
   DEV-ONLY VISUAL PREVIEW · /preview
   A no-backend mock of the Nexus dashboard in the warm-calm theme (token-based,
   so it follows light/dark). Mirrors the real dashboard's chrome. Sample data
   only — safe to delete.
   ──────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import {
  Search, Home, Calendar as CalIcon, Bell, Folder, FileText, ChevronDown,
  ChevronLeft, ChevronRight, Plus, Settings, Share2, MessageSquare, MoreHorizontal, Check, Sparkles,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const TREE = [
  { icon: FileText, name: 'Product Roadmap', lvl: 0 },
  { icon: Folder, name: 'Marketing', lvl: 0 },
  { icon: FileText, name: 'Launch Plan', lvl: 1 },
  { icon: FileText, name: 'Brand Voice', lvl: 1 },
  { icon: Folder, name: 'Engineering', lvl: 0 },
  { icon: FileText, name: 'System Architecture', lvl: 1, active: true },
  { icon: FileText, name: 'API Documentation', lvl: 1 },
  { icon: CalIcon, name: 'Content Calendar', lvl: 0 },
];

export default function DashboardPreview() {
  const [view, setView] = useState<'doc' | 'calendar'>('doc');

  return (
    <div className="fixed inset-0 flex bg-background text-foreground overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[266px] shrink-0 border-r border-border bg-sidebar hidden md:flex flex-col p-3.5">
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border border-border shadow-sm">
          <span className="w-[26px] h-[26px] rounded-lg bg-accent text-white text-[13px] font-bold flex items-center justify-center">A</span>
          <span className="text-[14px] font-semibold flex-1 text-left">Acme Inc</span>
          <ChevronDown className="w-4 h-4 text-muted" />
        </button>

        <div className="flex items-center gap-2.5 mt-3.5 px-3 py-2 rounded-lg text-[13.5px] text-muted" style={{ background: 'color-mix(in oklab, var(--foreground) 4%, transparent)' }}>
          <Search className="w-[15px] h-[15px]" /> Search
          <span className="ml-auto text-[11px] border border-border rounded px-1.5 py-px">⌘K</span>
        </div>

        <nav className="mt-3.5 flex flex-col gap-0.5">
          {[{ i: Home, l: 'Dashboard' }, { i: CalIcon, l: 'Calendar', on: () => setView('calendar') }, { i: Bell, l: 'Updates', b: 3 }].map((n) => (
            <button key={n.l} onClick={n.on} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium text-muted hover:text-foreground hover:bg-hover transition-colors">
              <n.i className="w-4 h-4" strokeWidth={1.9} />{n.l}
              {n.b && <span className="ml-auto w-[18px] h-[18px] rounded-md bg-accent text-white text-[10px] font-bold flex items-center justify-center">{n.b}</span>}
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-between mt-5 mb-2 px-3">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted/70 font-bold">Pages</span>
          <button className="w-5 h-5 rounded-md flex items-center justify-center text-muted hover:bg-hover"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex flex-col gap-px overflow-hidden flex-1">
          {TREE.map((n, i) => (
            <button key={i} onClick={() => setView('doc')} className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] text-left ${n.active ? 'text-foreground font-medium' : 'text-muted'} ${n.lvl === 0 ? 'font-medium text-foreground' : ''}`} style={{ marginLeft: n.lvl * 16, background: n.active ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : undefined }}>
              <n.icon className={`w-4 h-4 shrink-0 ${n.active || n.lvl === 0 ? 'text-accent' : ''}`} strokeWidth={1.9} />
              <span className="truncate">{n.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 pt-2 mt-2 border-t border-border">
          <span className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: 'var(--nb-green)' }}>JD</span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold leading-tight">Jamie Doe</div>
            <div className="text-[11px] text-muted">Admin</div>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-5">
          <div className="flex items-center gap-2 text-[13.5px] font-medium min-w-0">
            <span className="text-muted truncate">Engineering</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted/60 shrink-0" />
            <span className="truncate">System Architecture</span>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(['doc', 'calendar'] as const).map((v, i) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${view === v ? 'bg-cta text-cta-foreground' : 'hover:bg-hover'} ${i === 0 ? 'border-r border-border' : ''}`}>
                  {v === 'doc' ? 'Document' : 'Calendar'}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex">
              {['A', 'M', 'K'].map((a, i) => (
                <span key={a} className="w-7 h-7 rounded-full border-2 border-background text-white text-[11px] font-bold flex items-center justify-center" style={{ background: ['var(--accent)', 'var(--nb-green)', 'var(--nb-yellow)'][i], marginLeft: i ? -8 : 0 }}>{a}</span>
              ))}
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cta text-cta-foreground text-[12.5px] font-medium"><Share2 className="w-3.5 h-3.5" />Share</button>
            <button className="w-8 h-8 border border-border rounded-lg bg-card flex items-center justify-center"><MessageSquare className="w-4 h-4" /></button>
            <button className="w-8 h-8 border border-border rounded-lg bg-card flex items-center justify-center"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {view === 'doc' ? <DocView /> : <CalendarView />}
        </div>
      </main>

      <div className="fixed bottom-4 right-4 text-[11px] font-medium text-muted border border-border bg-card rounded-full px-3 py-1.5 shadow-sm z-50">
        Preview · sample data
      </div>
    </div>
  );
}

function DocView() {
  const [tasks, setTasks] = useState([true, true, false, false]);
  return (
    <div className="flex">
      <div className="flex-1 px-6 sm:px-12 py-11">
        <div className="max-w-[720px] mx-auto">
          <h1 className="font-display text-[40px] font-semibold tracking-[-0.03em] mb-2.5">System Architecture</h1>
          <div className="flex items-center gap-2.5 text-[12.5px] text-muted mb-7">
            Edited 2 minutes ago <span className="w-1 h-1 rounded-full bg-muted/50" /> 3 collaborators <span className="w-1 h-1 rounded-full bg-muted/50" /> 142 blocks
          </div>
          <p className="text-[16.5px] leading-[1.72] text-foreground/85 mb-4">Nexus is designed as a block-based knowledge system. Every document is composed of ordered blocks, and every object in a workspace lives inside one hierarchical tree.</p>
          <div className="flex gap-3 border border-border rounded-r-xl px-4 py-4 my-5" style={{ borderLeftWidth: 3, borderLeftColor: 'var(--accent)', background: 'color-mix(in oklab, var(--accent) 7%, transparent)' }}>
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-accent" />
            <p className="text-[15px] text-foreground/80 leading-relaxed"><b className="text-foreground">Core principle.</b> Everything is a node. Documents are block containers, folders are tree nodes, and a calendar entry is simply another node — one consistent model at any depth.</p>
          </div>
          <h2 className="font-display text-[23px] font-semibold tracking-tight mt-8 mb-3">The core entities</h2>
          <ul className="flex flex-col gap-2.5 mb-5">
            {['Account — a person who signs in to Nexus.', 'Business — a workspace that isolates a team’s data.', 'Node — a folder, document, or calendar item.', 'Block — the ordered content unit inside a document.'].map((t) => (
              <li key={t} className="flex gap-3 text-[16px] text-foreground/85 leading-relaxed"><span className="w-[7px] h-[7px] rounded-sm bg-accent mt-[9px] shrink-0" />{t}</li>
            ))}
          </ul>
          <h2 className="font-display text-[23px] font-semibold tracking-tight mt-8 mb-3">Launch checklist</h2>
          <div className="flex flex-col gap-2.5 mb-7">
            {['Define the node schema & indexes', 'Build the block editor on Tiptap', 'Wire real-time subscriptions', 'Ship the content calendar'].map((t, i) => (
              <button key={t} onClick={() => setTasks((p) => p.map((v, idx) => (idx === i ? !v : v)))} className="flex items-center gap-3 text-[16px] text-left">
                <span className={`w-[19px] h-[19px] rounded-md border flex items-center justify-center shrink-0 ${tasks[i] ? 'border-transparent text-white' : 'border-border text-transparent'}`} style={{ background: tasks[i] ? 'var(--nb-green)' : 'transparent' }}>
                  <Check className="w-3 h-3" strokeWidth={3.5} />
                </span>
                <span className={tasks[i] ? 'line-through text-muted' : 'text-foreground/85'}>{t}</span>
              </button>
            ))}
          </div>
          <h2 className="font-display text-[23px] font-semibold tracking-tight mt-8 mb-3">Node shape</h2>
          <pre className="rounded-xl border border-border px-5 py-4 text-[13.5px] leading-[1.7] overflow-hidden font-mono" style={{ background: 'color-mix(in oklab, var(--foreground) 5%, transparent)' }}>
{`type Node = {
  id: string;
  type: 'folder' | 'document' | 'calendar';
  parent_id: string | null;
  title: string;
}`}
          </pre>
        </div>
      </div>

      {/* comments rail */}
      <aside className="w-[300px] shrink-0 border-l border-border bg-sidebar p-5 hidden xl:block">
        <h4 className="text-[12px] uppercase tracking-[0.1em] text-muted/70 font-bold mb-4">Comments</h4>
        {[
          { i: 'MR', c: 'var(--nb-green)', n: 'Mara Reyes', t: '2m', m: 'Love how clean the node model is. Should calendar entries support recurring dates in v1?' },
          { i: 'KO', c: 'var(--accent)', n: 'Kai Owens', t: 'now', m: 'Pushed the realtime branch — cursors are syncing under 30ms locally.' },
        ].map((cm) => (
          <div key={cm.i} className="bg-card border border-border rounded-xl p-3.5 mb-3 shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: cm.c }}>{cm.i}</span>
              <span className="text-[13px] font-semibold">{cm.n}</span>
              <span className="text-[11px] text-muted ml-auto">{cm.t}</span>
            </div>
            <p className="text-[13.5px] text-foreground/80 leading-snug">{cm.m}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// sample entries live on April 2026 (month index 3)
const SAMPLE_ENTRIES: Record<string, { c: string; l: string; dark?: boolean }[]> = {
  '2026-3-2': [{ c: 'var(--accent)', l: 'Sprint review', dark: true }],
  '2026-3-7': [{ c: 'var(--nb-green)', l: 'API v2 spec', dark: true }],
  '2026-3-10': [{ c: 'var(--nb-yellow)', l: 'v2.1 release' }],
  '2026-3-15': [{ c: 'var(--accent)', l: 'Team sync', dark: true }, { c: 'var(--nb-yellow)', l: 'Newsletter' }],
  '2026-3-21': [{ c: 'var(--nb-green)', l: 'Launch plan', dark: true }],
  '2026-3-24': [{ c: 'var(--nb-yellow)', l: 'Brand review' }],
};

function CalendarView() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3); // 0-indexed → April
  const todayY = 2026, todayM = 3, todayD = 15; // mock "today"

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const navigate = (dir: -1 | 1) => {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  };
  const goToday = () => { setYear(todayY); setMonth(todayM); };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* sub-header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <button onClick={() => navigate(-1)} aria-label="Previous month" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-muted hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => navigate(1)} aria-label="Next month" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-hover text-muted hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h1 className="text-base font-bold">{MONTHS[month]} <span className="text-muted font-medium">{year}</span></h1>
          <span className="text-[11px] uppercase tracking-[0.1em] text-accent font-bold">Content Calendar</span>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 text-[13px] font-medium border border-border rounded-lg hover:bg-hover text-muted hover:text-foreground transition-colors">Today</button>
      </div>
      {/* grid fills remaining space, edge to edge */}
      <div className="flex-1 flex flex-col overflow-auto custom-scrollbar">
        <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-background z-10">
          {DAYS.map((d) => <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted/60">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
          {cells.map((d, i) => {
            const isToday = d === todayD && month === todayM && year === todayY;
            const items = d ? SAMPLE_ENTRIES[`${year}-${month}-${d}`] ?? [] : [];
            return (
              <div key={i} className={`group border-r border-b border-border p-2 flex flex-col gap-1 min-h-[118px] ${d ? 'hover:bg-hover' : 'bg-foreground/[0.015]'}`}>
                {d && (
                  <div className="flex items-center justify-between">
                    <span className={`text-[13px] font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none ${isToday ? 'bg-cta text-cta-foreground' : 'text-muted'}`}>{d}</span>
                    <button className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover text-muted transition-all"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {items.map((e, j) => (
                  <div key={j} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: e.c, color: e.dark ? '#fff' : '#241f18' }}>{e.l}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
