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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[13px] font-semibold shadow-md hover:opacity-90 transition-all duration-150"
        title="Ask AI"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && state === 'idle' && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {AI_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => runAction(action.id)}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-violet-50 transition-colors text-left group"
            >
              <div className="text-violet-400 group-hover:text-violet-600 transition-colors">
                {action.icon}
              </div>
              <div>
                <div className="text-[13px] font-medium text-slate-700">{action.label}</div>
                <div className="text-[11px] text-slate-400">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-[13px] font-medium">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Writing...</span>
        </div>
      )}

      {/* Accept/Discard Bar */}
      {state === 'done' && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleAccept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-[13px] font-semibold hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Accept
          </button>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-[13px] font-semibold hover:bg-red-50 hover:text-red-500 transition-colors"
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
