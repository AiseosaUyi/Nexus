'use client';

import React, { useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Sparkles, 
  AlignLeft, 
  Wand2, 
  CheckCircle, 
  RefreshCw, 
  X,
  ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const AI_ACTIONS: AIAction[] = [
  { id: 'improve',          label: 'Improve Writing',     icon: <Wand2 className="w-4 h-4" />,     description: 'Enhance clarity and flow' },
  { id: 'fix_grammar',      label: 'Fix Grammar',         icon: <CheckCircle className="w-4 h-4" />, description: 'Correct spelling & grammar' },
  { id: 'simplify',         label: 'Simplify',            icon: <AlignLeft className="w-4 h-4" />,   description: 'Make it easier to read' },
  { id: 'summarize',        label: 'Summarize',           icon: <AlignLeft className="w-4 h-4" />,   description: 'Shorten to key points' },
  { id: 'make_professional',label: 'Make Professional',   icon: <Sparkles className="w-4 h-4" />,   description: 'More formal tone' },
  { id: 'make_casual',      label: 'Make Casual',         icon: <Sparkles className="w-4 h-4" />,   description: 'More conversational tone' },
  { id: 'continue',         label: 'Continue Writing',    icon: <RefreshCw className="w-4 h-4" />,  description: 'Generate more content' },
];

type AIBubbleMenuState = 'idle' | 'loading' | 'done';

interface AIBubbleMenuProps {
  editor: Editor;
}

export default function AIBubbleMenu({ editor }: AIBubbleMenuProps) {
  const [state, setState] = useState<AIBubbleMenuState>('idle');
  const [generatedText, setGeneratedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAction = useCallback(async (actionId: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (!selectedText.trim() && actionId !== 'continue') {
      setError('Please select some text first.');
      return;
    }

    setIsOpen(false);
    setState('loading');
    setActiveAction(actionId);
    setError(null);

    // Store the original text so we can revert
    setOriginalText(selectedText);

    // Delete the selection and start inserting streamed content
    editor.chain().focus().deleteSelection().run();
    
    let accumulated = '';

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionId,
          selectedText,
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse Vercel AI SDK data stream format
        accumulated += chunk;
        editor.commands.insertContent(chunk);
      }

      setGeneratedText(accumulated);
      setState('done');
    } catch (err: any) {
      console.error('[AI] Error:', err);
      // Restore the original text on failure
      editor.commands.insertContent(originalText);
      setError('AI generation failed. Please try again.');
      setState('idle');
    }
  }, [editor, originalText]);

  const handleAccept = useCallback(() => {
    setState('idle');
    setGeneratedText('');
    setOriginalText('');
    setActiveAction(null);
    editor.commands.focus();
  }, [editor]);

  const handleDiscard = useCallback(() => {
    // Remove AI-inserted text and restore original
    const { from } = editor.state.selection;
    editor.chain()
      .focus()
      .setTextSelection({ from: from - generatedText.length, to: from })
      .deleteSelection()
      .insertContent(originalText)
      .run();
    setState('idle');
    setGeneratedText('');
    setOriginalText('');
    setActiveAction(null);
  }, [editor, generatedText, originalText]);

  const handleRetry = useCallback(() => {
    if (!activeAction) return;
    handleDiscard();
    // Re-select the original text and re-run
    setTimeout(() => runAction(activeAction), 100);
  }, [activeAction, handleDiscard, runAction]);

  return (
    <div className="relative">
      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent/10 border border-accent/20 text-accent text-[13px] font-bold hover:bg-accent/20 transition-all cursor-pointer"
        title="Ask AI"
      >
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
        <span>AI</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform opacity-60", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && state === 'idle' && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-background rounded-lg shadow-popover border border-border p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {AI_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => runAction(action.id)}
              className="flex w-full items-center gap-3 px-3 py-1.5 rounded-md hover:bg-hover transition-colors text-left group cursor-pointer"
            >
              <div className="text-accent/60 group-hover:text-accent transition-colors">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground">{action.label}</div>
                <div className="text-[11px] text-muted truncate">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-1 rounded bg-accent/5 border border-accent/10 text-accent text-[13px] font-medium animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-display">Nexus AI writing...</span>
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded shadow-sm animate-in fade-in">
          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-accent text-accent-foreground text-[12px] font-bold hover:bg-accent/90 transition-colors cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Accept
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-hover text-foreground/80 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-red-500/10 text-red-500 text-[12px] font-medium transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Discard
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}
