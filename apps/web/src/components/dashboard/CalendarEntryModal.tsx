'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  AlignLeft,
  Tag,
  Hash,
  CheckSquare,
  Link as LinkIcon,
  AtSign,
  Phone,
  Plus,
  ChevronDown,
  Loader2,
  ArrowUpRight,
  Users,
  FileText,
  Zap,
  ArrowRight,
  Clock,
  User,
  Expand,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import dynamic from 'next/dynamic';
import {
  createCalendarEntry,
  updateCalendarEntry,
} from '@/app/(dashboard)/w/[workspace_slug]/actions';
import type { CalendarEntryWithNode } from './ContentCalendar';

const MiniEditor = dynamic(() => import('@/components/editor/MiniEditor'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  date: string; // 'YYYY-MM-DD' pre-selected date for creation
  entry: CalendarEntryWithNode | null; // null = create, non-null = edit
  businessId: string;
  workspaceSlug: string;
  onClose: () => void;
  onCreated: (entry: CalendarEntryWithNode) => void;
  onUpdated: (entry: CalendarEntryWithNode) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft',     dot: 'bg-foreground/30', bg: 'bg-foreground/[0.08]', text: 'text-foreground/60' },
  { value: 'scheduled', label: 'Scheduled', dot: 'bg-blue-400',      bg: 'bg-blue-500/15',       text: 'text-blue-400' },
  { value: 'published', label: 'Published', dot: 'bg-green-400',     bg: 'bg-green-500/15',      text: 'text-green-400' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-red-400',       bg: 'bg-red-500/15',        text: 'text-red-400' },
];

const PROPERTY_TYPES = [
  { type: 'text',        Icon: AlignLeft,  label: 'Text' },
  { type: 'number',      Icon: Hash,       label: 'Number' },
  { type: 'select',      Icon: Tag,        label: 'Select' },
  { type: 'multiselect', Icon: AlignLeft,  label: 'Multi-select' },
  { type: 'status',      Icon: CheckSquare,label: 'Status' },
  { type: 'date',        Icon: Calendar,   label: 'Date' },
  { type: 'person',      Icon: Users,      label: 'Person' },
  { type: 'files',       Icon: FileText,   label: 'Files & media' },
  { type: 'checkbox',    Icon: CheckSquare,label: 'Checkbox' },
  { type: 'url',         Icon: LinkIcon,   label: 'URL' },
  { type: 'email',       Icon: AtSign,     label: 'Email' },
  { type: 'phone',       Icon: Phone,      label: 'Phone' },
  { type: 'formula',     Icon: Zap,        label: 'Formula' },
  { type: 'relation',    Icon: ArrowRight, label: 'Relation' },
  { type: 'rollup',      Icon: ArrowRight, label: 'Rollup' },
  { type: 'created_time',Icon: Clock,      label: 'Created time' },
  { type: 'created_by',  Icon: User,       label: 'Created by' },
  { type: 'edited_time', Icon: Clock,      label: 'Last edited time' },
  { type: 'edited_by',   Icon: User,       label: 'Last edited by' },
];

const SUGGESTED_PROPS = [
  { key: 'visuals_needed', type: 'checkbox', label: 'Visuals needed', defaultValue: false },
  { key: 'posted',         type: 'checkbox', label: 'Posted',         defaultValue: false },
  { key: 'post_url',       type: 'url',      label: 'Post URL',       defaultValue: '' },
  { key: 'email',          type: 'email',    label: 'Email',          defaultValue: '' },
  { key: 'phone',          type: 'phone',    label: 'Phone number',   defaultValue: '' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarEntryModal({
  isOpen,
  date,
  entry,
  businessId,
  workspaceSlug,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const router = useRouter();
  const isEditMode = !!entry;

  const [title, setTitle]           = useState(entry?.node?.title ?? '');
  const [selectedDate, setSelectedDate] = useState(entry?.publish_date ?? date);
  const [status, setStatus]         = useState<string>(entry?.status ?? 'draft');
  const [platform, setPlatform]     = useState(entry?.platform ?? '');
  const [notes, setNotes]           = useState(entry?.notes ?? '');
  const [properties, setProperties] = useState<Record<string, any>>(entry?.properties ?? {});
  const [showStatusMenu, setShowStatusMenu]       = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [propertySearch, setPropertySearch]       = useState('');
  const [isSubmitting, startTransition]           = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleRef  = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync when entry/date changes
  useEffect(() => {
    setTitle(entry?.node?.title ?? '');
    setSelectedDate(entry?.publish_date ?? date);
    setStatus(entry?.status ?? 'draft');
    setPlatform(entry?.platform ?? '');
    setNotes(entry?.notes ?? '');
    setProperties(entry?.properties ?? {});
    setError(null);
  }, [entry, date]);

  // Focus title on open
  useEffect(() => {
    if (isOpen) setTimeout(() => titleRef.current?.focus(), 60);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Save status effect
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const triggerSaveIndicator = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  // Keyboard shortcut for Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditMode) {
          triggerSaveIndicator();
          // The debounced save will handle the actual DB update if changes exist
        }
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditMode]);

  // Outside click for menus
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusMenu(false);
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) { setShowPropertyPicker(false); setPropertySearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Auto-save in edit mode
  const debouncedSave = useDebouncedCallback(async (updates: any) => {
    if (!entry) return;
    triggerSaveIndicator();
    const result = await updateCalendarEntry(entry.id, updates);
    if (result.data) onUpdated(result.data as CalendarEntryWithNode);
  }, 800);

  // ── Handlers ──

  const handleCreate = (openFullPage = false) => {
    startTransition(async () => {
      const result = await createCalendarEntry({
        business_id: businessId,
        title: title.trim() || 'New Page',
        publish_date: selectedDate,
        status: status as any,
        platform: platform.trim() || null,
        notes: notes.trim() || null,
        properties,
      });

      if (result.data) {
        onCreated(result.data as CalendarEntryWithNode);
        onClose();
        if (openFullPage && result.data.node_id) {
          router.push(`/w/${workspaceSlug}/n/${result.data.node_id}`);
        }
      } else if (result.error) {
        setError(result.error);
      }
    });
  };

  const update = (field: string, val: any) => {
    if (isEditMode) debouncedSave({ [field]: val });
  };

  const handlePropChange = (key: string, value: any) => {
    const updated = { ...properties, [key]: { ...properties[key], value } };
    setProperties(updated);
    if (isEditMode) debouncedSave({ properties: updated });
  };

  const handleAddProp = (type: string, label: string, defaultValue: any = '') => {
    const key = `${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const updated = { ...properties, [key]: { type, label, value: defaultValue } };
    setProperties(updated);
    if (isEditMode) debouncedSave({ properties: updated });
    setShowPropertyPicker(false);
    setPropertySearch('');
  };

  const handleRemoveProp = (key: string) => {
    const updated = { ...properties };
    delete updated[key];
    setProperties(updated);
    if (isEditMode) debouncedSave({ properties: updated });
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  const filteredSuggested = SUGGESTED_PROPS.filter(
    (p) =>
      p.label.toLowerCase().includes(propertySearch.toLowerCase()) &&
      !Object.values(properties).some((cp: any) => cp.label === p.label)
  );
  const filteredTypes = PROPERTY_TYPES.filter((p) =>
    p.label.toLowerCase().includes(propertySearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            {isEditMode && entry ? (
              <Link
                href={`/w/${workspaceSlug}/n/${entry.node_id}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-muted hover:text-foreground hover:bg-hover transition-colors group"
                onClick={onClose}
                title="Open as full page"
              >
                <Expand className="w-3.5 h-3.5" />
                <span>Open full page</span>
              </Link>
            ) : (
              <span className="text-[12px] text-muted/60">New calendar entry</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
            {isEditMode && saveStatus !== 'idle' && (
              <span className="flex items-center gap-1 text-[11px] text-foreground/40 font-normal animate-in fade-in duration-300">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3 text-green-500/60" />
                    Saved
                  </>
                )}
              </span>
            )}
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted" />}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Title */}
          <div className="px-8 pt-8 pb-5">
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                update('title', v.trim() || 'New Page');
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isEditMode) {
                  e.preventDefault();
                  handleCreate(false);
                }
              }}
              placeholder="New page"
              rows={1}
              className="w-full bg-transparent text-4xl font-bold resize-none outline-none leading-tight placeholder:text-foreground/20 text-foreground overflow-hidden"
              style={{ minHeight: '1.25em' }}
            />
            {error && (
              <div className="mt-4 px-2 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-[12px] animate-in fade-in slide-in-from-top-1">
                <X className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Properties */}
          <div className="px-6 pb-2">
            <div className="space-y-0.5">

              {/* Date */}
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Calendar className="w-4 h-4 text-muted" />
                  <span className="text-[13px] text-muted">Date</span>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    update('publish_date', e.target.value);
                  }}
                  className="bg-transparent text-[13px] text-foreground outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>

              {/* Status */}
              <div
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors relative"
                ref={statusRef}
              >
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', currentStatus.dot)} />
                  <span className="text-[13px] text-muted">Status</span>
                </div>
                <button
                  onClick={() => setShowStatusMenu((p) => !p)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium cursor-pointer',
                    currentStatus.bg, currentStatus.text
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', currentStatus.dot)} />
                  {currentStatus.label}
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>
                {showStatusMenu && (
                  <div className="absolute left-36 top-full mt-1 z-[110] bg-background border border-border rounded-xl shadow-popover p-1 w-40 animate-in fade-in zoom-in-95 duration-100">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setStatus(s.value);
                          update('status', s.value);
                          setShowStatusMenu(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors',
                          status === s.value ? 'bg-hover' : 'hover:bg-hover'
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                        <span className={s.text}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform / Tags */}
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors">
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Tag className="w-4 h-4 text-muted" />
                  <span className="text-[13px] text-muted">Tags</span>
                </div>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    update('platform', e.target.value || null);
                  }}
                  placeholder="Empty"
                  className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/40 outline-none"
                />
              </div>

              {/* Custom properties */}
              {Object.entries(properties).map(([key, prop]: [string, any]) => {
                const typeConfig = PROPERTY_TYPES.find((t) => t.type === prop.type);
                const Icon = typeConfig?.Icon ?? AlignLeft;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row"
                  >
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      <Icon className="w-4 h-4 text-muted" />
                      <span className="text-[13px] text-muted truncate">{prop.label}</span>
                    </div>
                    {prop.type === 'checkbox' ? (
                      <button
                        onClick={() => handlePropChange(key, !prop.value)}
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0',
                          prop.value ? 'bg-cta border-cta text-white' : 'border-border hover:border-foreground/30'
                        )}
                      >
                        {prop.value && <span className="text-[9px] font-black leading-none">✓</span>}
                      </button>
                    ) : (
                      <input
                        type={prop.type === 'number' ? 'number' : 'text'}
                        value={prop.value ?? ''}
                        onChange={(e) => handlePropChange(key, e.target.value)}
                        placeholder="Empty"
                        className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/40 outline-none min-w-0"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveProp(key)}
                      className="opacity-0 group-hover/row:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10 text-muted hover:text-red-400 transition-all cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add a property */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowPropertyPicker((p) => !p)}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add a property
                </button>

                {showPropertyPicker && (
                  <div className="absolute left-0 top-full mt-1 z-[110] w-[260px] bg-background border border-border rounded-xl shadow-popover animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-border">
                      <input
                        autoFocus
                        type="text"
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        placeholder="Property name"
                        className="w-full bg-sidebar/50 border border-border rounded-lg px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted outline-none focus:border-cta/40 transition-colors"
                      />
                    </div>
                    <div className="p-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                      {filteredSuggested.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                            Suggested
                          </div>
                          {filteredSuggested.map((p) => {
                            const cfg = PROPERTY_TYPES.find((t) => t.type === p.type);
                            const Icon = cfg?.Icon ?? AlignLeft;
                            return (
                              <button
                                key={p.key}
                                onClick={() => handleAddProp(p.type, p.label, p.defaultValue)}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] hover:bg-hover text-foreground/80 cursor-pointer transition-colors"
                              >
                                <Icon className="w-3.5 h-3.5 text-muted" />
                                {p.label}
                              </button>
                            );
                          })}
                          <div className="h-px bg-border my-1" />
                        </>
                      )}
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                        Type
                      </div>
                      {filteredTypes.map((t) => {
                        const label = propertySearch.trim() || t.label;
                        return (
                          <button
                            key={t.type}
                            onClick={() => handleAddProp(t.type, label, t.type === 'checkbox' ? false : '')}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] hover:bg-hover text-foreground/80 cursor-pointer transition-colors"
                          >
                            <t.Icon className="w-3.5 h-3.5 text-muted" />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mx-6 my-2" />

          {/* Rich editor area */}
          <div className="px-8 py-4 flex-1">
            <MiniEditor
              content={notes || ''}
              placeholder={
                isEditMode
                  ? "Add notes or content… Type '/' for commands"
                  : "Type '/' for commands, or add notes below."
              }
              onChange={(text) => {
                setNotes(text);
                update('notes', text || null);
              }}
            />
          </div>
        </div>

        {/* Footer (creation mode only) */}
        {!isEditMode && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/50 shrink-0">
            <button
              onClick={() => handleCreate(true)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-muted hover:text-foreground hover:bg-hover rounded-lg transition-colors cursor-pointer"
              title="Create and open as full page"
            >
              <Expand className="w-3.5 h-3.5" />
              Open as page
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] font-medium text-muted hover:text-foreground hover:bg-hover rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreate(false)}
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold transition-all',
                  isSubmitting
                    ? 'bg-cta/50 text-white cursor-not-allowed'
                    : 'bg-white text-black hover:bg-white/90 shadow-sm cursor-pointer'
                )}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
