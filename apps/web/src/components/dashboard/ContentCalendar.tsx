'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCalendarEntries,
  deleteCalendarEntry,
} from '@/app/(dashboard)/w/[workspace_slug]/actions';
import CalendarEntryModal from './CalendarEntryModal';
import { Teamspace } from '@nexus/api/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEntryWithNode {
  id: string;
  node_id: string;
  business_id: string;
  publish_date: string; // 'YYYY-MM-DD'
  platform: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'cancelled';
  notes: string | null;
  properties: Record<string, any>;
  node: { id: string; title: string; icon: string | null; type: string } | null;
}

interface Props {
  businessId: string;
  workspaceSlug: string;
  teamspaces: Teamspace[];
  initialEntries: CalendarEntryWithNode[];
  initialYear: number;
  initialMonth: number; // 1-12
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  draft:     { label: 'Draft',     dot: 'bg-foreground/30', bg: 'bg-foreground/[0.08]', text: 'text-foreground/50' },
  scheduled: { label: 'Scheduled', dot: 'bg-blue-400',      bg: 'bg-blue-500/15',       text: 'text-blue-400' },
  published: { label: 'Published', dot: 'bg-green-400',     bg: 'bg-green-500/15',      text: 'text-green-400' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-400',       bg: 'bg-red-500/15',        text: 'text-red-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentCalendar({
  businessId,
  workspaceSlug,
  teamspaces,
  initialEntries,
  initialYear,
  initialMonth,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [entries, setEntries] = useState<CalendarEntryWithNode[]>(initialEntries);
  const [isLoading, startTransition] = useTransition();
  // Modal state — null date means closed
  const [modalDate, setModalDate]   = useState<string | null>(null);
  const [modalEntry, setModalEntry] = useState<CalendarEntryWithNode | null>(null);

  // ── Calendar math ──
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Build grid cells: null for padding, number for day
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getDateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const entriesForDate = (day: number) =>
    entries.filter((e) => e.publish_date === getDateStr(day));

  // ── Navigation ──
  const navigate = useCallback(
    (dir: -1 | 1) => {
      let m = month + dir;
      let y = year;
      if (m > 12) { m = 1; y++; }
      if (m < 1)  { m = 12; y--; }
      setMonth(m);
      setYear(y);
      startTransition(async () => {
        const { data } = await getCalendarEntries(businessId, y, m);
        setEntries(data ?? []);
      });
    },
    [month, year, businessId]
  );

  const goToToday = useCallback(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = t.getMonth() + 1;
    setYear(y);
    setMonth(m);
    startTransition(async () => {
      const { data } = await getCalendarEntries(businessId, y, m);
      setEntries(data ?? []);
    });
  }, [businessId]);

  // ── Modal helpers ──
  const openCreate = useCallback((dateStr: string) => {
    setModalDate(dateStr);
    setModalEntry(null);
  }, []);

  const openEdit = useCallback((entry: CalendarEntryWithNode) => {
    setModalDate(entry.publish_date);
    setModalEntry(entry);
  }, []);

  const closeModal = useCallback(() => {
    setModalDate(null);
    setModalEntry(null);
  }, []);

  const handleEntryCreated = useCallback((entry: CalendarEntryWithNode) => {
    setEntries((prev) => [...prev, entry]);
  }, []);

  const handleEntryUpdated = useCallback((updated: CalendarEntryWithNode) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setModalEntry(updated);
  }, []);

  const handleDeleteEntry = useCallback(async (id: string) => {
    await deleteCalendarEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    closeModal();
  }, [closeModal]);

  // ── Render ──
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Main calendar area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => navigate(-1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h1 className="text-base font-bold text-foreground">
              {MONTH_NAMES[month - 1]}{' '}
              <span className="text-foreground/50 font-medium">{year}</span>
            </h1>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-cta/30 border-t-cta rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-[13px] font-medium border border-border rounded-lg hover:bg-hover text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col overflow-auto custom-scrollbar">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border sticky top-0 bg-background z-10">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-foreground/30"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
            {cells.map((day, idx) => {
              const dateStr = day ? getDateStr(day) : '';
              const isToday = dateStr === todayStr;
              const dayEntries = day ? entriesForDate(day) : [];

              return (
                <div
                  key={idx}
                  className={cn(
                    'border-r border-b border-border p-1.5 flex flex-col gap-1 min-h-[130px]',
                    !day && 'bg-foreground/[0.01]',
                    day && 'hover:bg-foreground/[0.02] group/cell'
                  )}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-[13px] font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors leading-none',
                            isToday
                              ? 'bg-cta text-cta-foreground'
                              : 'text-foreground/55 group-hover/cell:text-foreground'
                          )}
                        >
                          {day}
                        </span>
                        {/* "+" — opens creation modal */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreate(dateStr);
                          }}
                          title="Add an item"
                          className="opacity-0 group-hover/cell:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-hover text-foreground/70 hover:text-foreground transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Entry cards — click to edit in modal */}
                      <div className="flex flex-col gap-0.5 flex-1">
                        {dayEntries.map((entry) => {
                          const s = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.draft;
                          const title = entry.node?.title || 'New Page';

                          return (
                            <button
                              key={entry.id}
                              onClick={() => openEdit(entry)}
                              className="w-full text-left px-2 py-1.5 rounded-md bg-foreground/[0.06] hover:bg-foreground/[0.1] border border-border/30 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {entry.node?.icon && (
                                  <span className="text-[11px] leading-none">{entry.node.icon}</span>
                                )}
                                <span className="text-[12px] font-medium text-foreground truncate">
                                  {title}
                                </span>
                              </div>
                              {entry.platform && (
                                <div className="text-[10px] text-muted mb-0.5 truncate">{entry.platform}</div>
                              )}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                                  s.bg, s.text
                                )}
                              >
                                <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                                {s.label}
                              </span>
                              {entry.properties &&
                                Object.entries(entry.properties)
                                  .filter(([, p]: [string, any]) => p.type === 'checkbox')
                                  .slice(0, 2)
                                  .map(([key, prop]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-1 mt-0.5">
                                      <span
                                        className={cn(
                                          'w-3 h-3 rounded-sm border flex items-center justify-center text-[8px]',
                                          prop.value ? 'bg-cta/20 border-cta/40 text-cta' : 'border-border'
                                        )}
                                      >
                                        {prop.value ? '✓' : ''}
                                      </span>
                                      <span className="text-[10px] text-muted">{prop.label}</span>
                                    </div>
                                  ))}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Creation / edit modal ── */}
      <CalendarEntryModal
        isOpen={modalDate !== null}
        date={modalDate ?? ''}
        entry={modalEntry}
        businessId={businessId}
        workspaceSlug={workspaceSlug}
        onClose={closeModal}
        onCreated={handleEntryCreated}
        onUpdated={handleEntryUpdated}
      />
    </div>
  );
}
