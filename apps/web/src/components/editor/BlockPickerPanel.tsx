'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  ChevronRight,
  Info,
  Quote,
  Code,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';

export interface BlockPickerPanelProps {
  onSelect: (apply: (editor: Editor) => void) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

interface BlockItem {
  title: string;
  shortcut: string;
  icon: React.ElementType;
  apply: (editor: Editor) => void;
}

const BLOCK_ITEMS: BlockItem[] = [
  {
    title: 'Text',
    shortcut: '',
    icon: Type,
    apply: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Heading 1',
    shortcut: '#',
    icon: Heading1,
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    shortcut: '##',
    icon: Heading2,
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    shortcut: '###',
    icon: Heading3,
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Heading 4',
    shortcut: '####',
    icon: Heading4,
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 4 }).run(),
  },
  {
    title: 'Bulleted list',
    shortcut: '-',
    icon: List,
    apply: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    shortcut: '1.',
    icon: ListOrdered,
    apply: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'To-do list',
    shortcut: '[]',
    icon: CheckSquare,
    apply: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Toggle list',
    shortcut: '>',
    icon: ChevronRight,
    apply: (editor) => editor.chain().focus().setNode('details').run(),
  },
  {
    title: 'Callout',
    shortcut: '',
    icon: Info,
    apply: (editor) => editor.chain().focus().toggleCallout().run(),
  },
  {
    title: 'Quote',
    shortcut: '"',
    icon: Quote,
    apply: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code',
    shortcut: '```',
    icon: Code,
    apply: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

export default function BlockPickerPanel({ onSelect, onClose, style }: BlockPickerPanelProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? BLOCK_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      )
    : BLOCK_ITEMS;

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Focus the search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) onSelect(item.apply);
        return;
      }
    },
    [filtered, activeIndex, onSelect, onClose]
  );

  return (
    <div
      ref={panelRef}
      data-block-picker
      style={style}
      className="w-[240px] bg-background border border-border rounded-xl shadow-popover p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-1.5 pb-1">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter blocks..."
          className="w-full bg-transparent text-[13px] text-foreground placeholder:text-foreground/30 focus:outline-none py-1 border-b border-border/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-[13px] text-foreground/40 italic">No results</div>
      ) : (
        <div className="flex flex-col mt-0.5">
          <div className="px-2 pt-1 pb-1 text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
            Basic blocks
          </div>
          {filtered.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            return (
              <button
                key={item.title}
                data-block-type={item.title}
                onClick={() => onSelect(item.apply)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center w-full text-left px-2 py-1.5 rounded-md transition-colors gap-2.5 ${
                  isActive
                    ? 'bg-accent/10 text-foreground'
                    : 'hover:bg-hover text-foreground/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'border-accent/30 bg-accent/10 text-accent'
                      : 'border-border bg-sidebar text-foreground/50'
                  }`}
                >
                  <Icon className="w-3 h-3" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium flex-1 truncate">{item.title}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-foreground/30 font-mono shrink-0">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
