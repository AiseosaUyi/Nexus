'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Image as ImageIcon, 
  MessageSquare,
  MoreHorizontal,
  Share2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarStack from '@/components/editor/AvatarStack';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedCallback } from 'use-debounce';

interface PageHeaderProps {
  initialTitle: string;
  initialIcon?: string | null;
  nodeId: string;
  workspaceSlug: string;
}

const EMOJIS = ['📄', '📝', '📓', '📚', '💡', '🚀', '🎯', '🎨', '🧠', '🛠️', '📅', '✅', '⭐', '🔥', '🌍', '🏠'];

export default function PageHeader({ initialTitle, initialIcon, nodeId, workspaceSlug }: PageHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState(initialIcon || null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const supabase = createClient();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Sync title to database
  const debouncedUpdate = useDebouncedCallback(async (newTitle: string, newIcon: string | null) => {
    await supabase
      .from('nodes')
      .update({ title: newTitle, icon: newIcon })
      .eq('id', nodeId);
  }, 1000);

  const handleTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.innerText;
    setTitle(newTitle);
    debouncedUpdate(newTitle, icon);
  };

  const handleIconSelect = (emoji: string) => {
    setIcon(emoji);
    setIsIconPickerOpen(false);
    debouncedUpdate(title, emoji);
  };

  const removeIcon = () => {
    setIcon(null);
    debouncedUpdate(title, null);
  };

  return (
    <div className="w-full flex flex-col group/header pb-8 animate-in fade-in duration-300">
      {/* Controls Bar (Breadcrumbs & Actions) */}
      <div className="w-full h-12 flex items-center justify-between px-4 text-foreground/60 text-[13px] font-medium border-b border-border/5 mb-8">
        <div className="flex items-center gap-2">
          <span className="hover:text-foreground cursor-pointer transition-colors">Workspace</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-30" />
          <span className="text-foreground/90 font-bold truncate max-w-[200px]">{title || "Untitled"}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 hover:text-foreground cursor-pointer transition-colors text-foreground/60">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span>Edited 2m ago</span>
          </div>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-foreground transition-colors cursor-pointer">
            <Share2 className="w-3.5 h-3.5 opacity-80" />
            <span>Share</span>
          </button>
          <button className="p-1 hover:bg-hover rounded transition-colors cursor-pointer text-foreground/80">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto px-12 md:px-24 flex flex-col">
        {/* Buttons appearing on hover (or persistent if icon missing) */}
        {!icon && (
          <div className="flex items-center gap-4 opacity-0 group-hover/header:opacity-100 transition-opacity mb-4 -ml-1">
            <button 
              onClick={() => setIsIconPickerOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer"
            >
              <Smile className="w-4 h-4" /> Add icon
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer">
              <ImageIcon className="w-4 h-4" /> Add cover
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 text-muted hover:bg-hover rounded transition-all text-[14px] font-medium cursor-pointer">
              <MessageSquare className="w-4 h-4" /> Add comment
            </button>
          </div>
        )}

        {/* Big Icon Area */}
        {icon && (
          <div className="relative w-fit group/icon mb-4 -ml-2">
            <button 
              onClick={() => setIsIconPickerOpen(true)}
              className="text-7xl hover:bg-hover/40 rounded-xl p-2 transition-colors cursor-pointer"
            >
              {icon}
            </button>
            <button 
              onClick={removeIcon}
              className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-1 opacity-0 group-hover/icon:opacity-100 transition-opacity hover:text-red-500 shadow-sm cursor-pointer"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Icon Picker Popover */}
        {isIconPickerOpen && (
          <div className="absolute z-50 mt-20 bg-background border border-border rounded-xl shadow-popover p-2 animate-in zoom-in-95 duration-150">
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS.map(e => (
                <button 
                  key={e}
                  onClick={() => handleIconSelect(e)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-hover rounded transition-colors text-xl cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editable Title */}
        <h1 
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleChange}
          data-placeholder="Untitled"
          className="text-5xl font-black font-display tracking-tight leading-tight text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 break-words"
        >
          {initialTitle === "Untitled" ? "" : initialTitle}
        </h1>

        {/* Collaboration Presence */}
        <div className="mt-8 flex items-center gap-3">
          <AvatarStack nodeId={nodeId} />
           <span className="h-4 w-px bg-border/20" />
           <div className="flex items-center gap-2 text-[12px] text-muted/60 font-medium">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             Active users
           </div>
        </div>
      </div>
    </div>
  );
}
