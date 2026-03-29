'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Sparkles, Send, X } from 'lucide-react';

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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden ring-2 ring-violet-400/30">
        {/* Purple gradient accent at the top */}
        <div className="h-[2px] w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500" />
        
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-violet-500 shrink-0">
            <Sparkles className="w-4 h-4" />
            <span className="text-[13px] font-semibold text-violet-600">Ask AI</span>
          </div>

          <div className="w-px h-4 bg-slate-200" />

          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to write or transform?"
            className="flex-1 text-[14px] text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
            disabled={isLoading}
          />

          {isLoading ? (
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-2 flex items-center gap-3">
          {['Summarize this page', 'Write an introduction', 'Draft a conclusion', 'Continue writing'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="text-[11px] text-slate-400 hover:text-violet-500 transition-colors bg-slate-50 hover:bg-violet-50 px-2 py-0.5 rounded-full"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
