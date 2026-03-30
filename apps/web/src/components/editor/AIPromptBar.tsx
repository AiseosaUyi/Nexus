'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIPromptBarProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIPromptBar({ editor, isOpen, onClose }: AIPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPrompt('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);

    // Get context: the surrounding text for better AI quality
    const { from } = editor.state.selection;
    const start = Math.max(0, from - 500);
    const context = editor.state.doc.textBetween(start, from, '\n');

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          customPrompt: prompt,
          context,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      // Insert a newline before the AI content if cursor isn't at the start
      if (from > 0) {
        editor.commands.insertContent('\n');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        editor.commands.insertContent(chunk);
      }
    } catch (err) {
      console.error('[AI Prompt] Error:', err);
    } finally {
      setIsLoading(false);
      onClose();
    }
  }, [prompt, editor, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative bg-background/80 backdrop-blur-md rounded-xl shadow-popover border border-accent/20 overflow-hidden ring-1 ring-accent/5">
        {/* Accent line at top */}
        <div className="h-[1px] w-full bg-accent/30" />
        
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-accent shrink-0">
            <Sparkles className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-[13px] font-bold font-display uppercase tracking-wider">Nexus AI</span>
          </div>

          <div className="w-px h-4 bg-border" />

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nexus AI to write, edit, or transform..."
            className="flex-1 text-[14px] text-foreground placeholder:text-muted outline-none bg-transparent"
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="shrink-0 w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center hover:bg-accent/90 disabled:opacity-30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          <button onClick={onClose} className="shrink-0 text-muted hover:text-foreground transition-colors cursor-pointer">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {['Summarize content', 'Improve writing', 'Make professional', 'Continue drafting'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="text-[11px] font-medium text-muted hover:text-accent transition-colors bg-accent/5 hover:bg-accent/10 px-2 py-0.5 rounded whitespace-nowrap cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
