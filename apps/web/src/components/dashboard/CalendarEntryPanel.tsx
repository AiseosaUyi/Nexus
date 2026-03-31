'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  AlignLeft,
  Tag,
  Hash,
  Type,
  CheckSquare,
  Link as LinkIcon,
  AtSign,
  Phone,
  Trash2,
  Plus,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useDebouncedCallback } from 'use-debounce';
import type { CalendarEntryWithNode } from './ContentCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  entry: CalendarEntryWithNode;
  workspaceSlug: string;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft',     dot: 'bg-foreground/30', bg: 'bg-foreground/[0.08]', text: 'text-foreground/60' },
  { value: 'scheduled', label: 'Scheduled', dot: 'bg-blue-400',      bg: 'bg-blue-500/15',       text: 'text-blue-400' },
  { value: 'published', label: 'Published', dot: 'bg-green-400',     bg: 'bg-green-500/15',      text: 'text-green-400' },
  { value: 'cancelled', label: 'Cancelled', dot: 'bg-red-400',       bg: 'bg-red-500/15',        text: 'text-red-400' },
];

const PROPERTY_TYPES = [
  { type: 'text',     Icon: AlignLeft,   label: 'Text' },
  { type: 'number',   Icon: Hash,        label: 'Number' },
  { type: 'select',   Icon: Tag,         label: 'Select' },
  { type: 'checkbox', Icon: CheckSquare, label: 'Checkbox' },
  { type: 'url',      Icon: LinkIcon,    label: 'URL' },
  { type: 'email',    Icon: AtSign,      label: 'Email' },
  { type: 'phone',    Icon: Phone,       label: 'Phone' },
];

const SUGGESTED_PROPS = [
  { key: 'visuals_needed', type: 'checkbox', label: 'Visuals needed', defaultValue: false },
  { key: 'posted',         type: 'checkbox', label: 'Posted',         defaultValue: false },
  { key: 'post_url',       type: 'url',      label: 'Post URL',       defaultValue: '' },
  { key: 'email',          type: 'email',    label: 'Email',          defaultValue: '' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarEntryPanel({
  entry,
  workspaceSlug,
  onClose,
  onUpdate,
  onDelete,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const currentStatus =
    STATUS_OPTIONS.find((s) => s.value === entry.status) ?? STATUS_OPTIONS[0];
  const customProps = entry.properties ?? {};

  // Close pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPropertyPicker(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const debouncedUpdate = useDebouncedCallback((updates: any) => {
    startTransition(() => onUpdate(entry.id, updates));
  }, 600);

  const handlePropChange = (key: string, value: any) => {
    const updated = { ...customProps, [key]: { ...customProps[key], value } };
    startTransition(() => onUpdate(entry.id, { properties: updated }));
  };

  const handleAddProp = (type: string, label: string, defaultValue: any = '') => {
    const key = `${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const updated = { ...customProps, [key]: { type, label, value: defaultValue } };
    startTransition(() => onUpdate(entry.id, { properties: updated }));
    setShowPropertyPicker(false);
    setPropertySearch('');
  };

  const handleRemoveProp = (key: string) => {
    const updated = { ...customProps };
    delete updated[key];
    startTransition(() => onUpdate(entry.id, { properties: updated }));
  };

  const filteredSuggested = SUGGESTED_PROPS.filter(
    (p) =>
      p.label.toLowerCase().includes(propertySearch.toLowerCase()) &&
      !Object.values(customProps).some((cp: any) => cp.label === p.label)
  );
  const filteredTypes = PROPERTY_TYPES.filter((p) =>
    p.label.toLowerCase().includes(propertySearch.toLowerCase())
  );

  return (
    <div className="w-[380px] h-full border-l border-border bg-background flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <Link
          href={`/w/${workspaceSlug}/n/${entry.node_id}`}
          className="flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground transition-colors group"
        >
          <ExternalLink className="w-3.5 h-3.5 group-hover:text-cta transition-colors" />
          Open full page
        </Link>
        <div className="flex items-center gap-0.5">
          {isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted mr-1" />
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-[13px] text-red-400 font-semibold mb-1">
            Delete this calendar entry?
          </p>
          <p className="text-[11px] text-muted mb-3">
            The page won't be deleted — only removed from the calendar.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => startTransition(() => onDelete(entry.id))}
              className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-[12px] font-bold cursor-pointer hover:bg-red-600 transition-colors"
            >
              Delete entry
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 border border-border rounded-lg text-[12px] text-muted hover:bg-hover cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Title */}
        <div className="px-6 pt-6 pb-5">
          <div className="text-3xl mb-2 leading-none">{entry.node?.icon ?? '📄'}</div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {entry.node?.title || 'Untitled'}
          </h1>
        </div>

        {/* Properties */}
        <div className="px-3 pb-4">
          <div className="space-y-0.5">

            {/* Date */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-muted" />
                <span className="text-[13px] text-muted">Date</span>
              </div>
              <input
                type="date"
                defaultValue={entry.publish_date}
                onChange={(e) => debouncedUpdate({ publish_date: e.target.value })}
                className="flex-1 bg-transparent text-[13px] text-foreground outline-none cursor-pointer [color-scheme:dark] min-w-0"
              />
            </div>

            {/* Status */}
            <div
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row relative"
              ref={statusRef}
            >
              <div className="flex items-center gap-2 w-32 shrink-0">
                <div
                  className={cn('w-3.5 h-3.5 flex items-center justify-center')}
                >
                  <div className={cn('w-2 h-2 rounded-full', currentStatus.dot)} />
                </div>
                <span className="text-[13px] text-muted">Status</span>
              </div>
              <button
                onClick={() => setShowStatusMenu((p) => !p)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium cursor-pointer',
                  currentStatus.bg,
                  currentStatus.text
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', currentStatus.dot)} />
                {currentStatus.label}
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>
              {showStatusMenu && (
                <div className="absolute left-32 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-popover p-1 w-40 animate-in fade-in zoom-in-95 duration-100">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        startTransition(() => onUpdate(entry.id, { status: s.value }));
                        setShowStatusMenu(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors',
                        entry.status === s.value ? 'bg-hover' : 'hover:bg-hover'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                      <span className={s.text}>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Platform */}
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <Tag className="w-3.5 h-3.5 text-muted" />
                <span className="text-[13px] text-muted">Platform</span>
              </div>
              <input
                type="text"
                defaultValue={entry.platform ?? ''}
                onChange={(e) => debouncedUpdate({ platform: e.target.value || null })}
                placeholder="e.g. Instagram, Twitter"
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/40 outline-none min-w-0"
              />
            </div>

            {/* Notes */}
            <div className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row">
              <div className="flex items-center gap-2 w-32 shrink-0 pt-0.5">
                <AlignLeft className="w-3.5 h-3.5 text-muted" />
                <span className="text-[13px] text-muted">Notes</span>
              </div>
              <textarea
                defaultValue={entry.notes ?? ''}
                onChange={(e) => debouncedUpdate({ notes: e.target.value || null })}
                placeholder="Add a note…"
                rows={2}
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted/40 outline-none resize-none min-w-0"
              />
            </div>

            {/* Custom properties */}
            {Object.entries(customProps).map(([key, prop]: [string, any]) => {
              const typeConfig = PROPERTY_TYPES.find((t) => t.type === prop.type);
              const Icon = typeConfig?.Icon ?? AlignLeft;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-hover transition-colors group/row"
                >
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted" />
                    <span className="text-[13px] text-muted truncate">{prop.label}</span>
                  </div>
                  {prop.type === 'checkbox' ? (
                    <button
                      onClick={() => handlePropChange(key, !prop.value)}
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors',
                        prop.value
                          ? 'bg-cta border-cta text-white'
                          : 'border-border hover:border-foreground/30'
                      )}
                    >
                      {prop.value && <span className="text-[9px] font-black leading-none">✓</span>}
                    </button>
                  ) : (
                    <input
                      type={prop.type === 'number' ? 'number' : 'text'}
                      defaultValue={prop.value ?? ''}
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

            {/* Add property */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowPropertyPicker((p) => !p)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add a property
              </button>

              {showPropertyPicker && (
                <div className="absolute left-0 top-full mt-1 z-50 w-[260px] bg-background border border-border rounded-xl shadow-popover animate-in fade-in zoom-in-95 duration-100">
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
                  <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredSuggested.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                          Suggested
                        </div>
                        {filteredSuggested.map((p) => {
                          const typeConfig = PROPERTY_TYPES.find((t) => t.type === p.type);
                          const Icon = typeConfig?.Icon ?? AlignLeft;
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
                          onClick={() =>
                            handleAddProp(
                              t.type,
                              label,
                              t.type === 'checkbox' ? false : ''
                            )
                          }
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
        <div className="h-px bg-border/50 mx-4" />

        {/* Open full page */}
        <div className="px-4 py-4">
          <Link
            href={`/w/${workspaceSlug}/n/${entry.node_id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border hover:border-foreground/20 hover:bg-hover text-[13px] font-medium text-muted hover:text-foreground transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open full page
          </Link>
        </div>
      </div>
    </div>
  );
}
