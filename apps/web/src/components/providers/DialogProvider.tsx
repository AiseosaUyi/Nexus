'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, X } from 'lucide-react';

// Tone — match the rest of Nexus: terse, plain English, no jargon, no fear-
// mongering. Confirm dialogs lead with what's about to change, not what
// could go wrong. Prompts use the placeholder for the example, not the
// title. Buttons are verbs, not "OK"/"Cancel".

type Variant = 'default' | 'danger';

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
}

interface AlertOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: Variant;
}

interface DialogContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type Mode = 'prompt' | 'confirm' | 'alert';

interface State {
  open: boolean;
  mode: Mode;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  variant?: Variant;
}

const initialState: State = {
  open: false,
  mode: 'confirm',
  title: '',
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [value, setValue] = useState('');
  const resolverRef = useRef<((v: any) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback((result: any) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const open = useCallback((next: Omit<State, 'open'>) => {
    return new Promise<any>((resolve) => {
      resolverRef.current = resolve;
      setValue(next.defaultValue ?? '');
      setState({ ...next, open: true });
      // Autofocus the field on the next paint.
      requestAnimationFrame(() => inputRef.current?.select());
    });
  }, []);

  const prompt = useCallback(
    (opts: PromptOptions) =>
      open({
        mode: 'prompt',
        title: opts.title,
        description: opts.description,
        placeholder: opts.placeholder,
        defaultValue: opts.defaultValue,
        confirmLabel: opts.confirmLabel ?? 'Save',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        required: opts.required ?? true,
      }) as Promise<string | null>,
    [open]
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      open({
        mode: 'confirm',
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'default',
      }) as Promise<boolean>,
    [open]
  );

  const alert = useCallback(
    (opts: AlertOptions) =>
      open({
        mode: 'alert',
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel ?? 'Got it',
        variant: opts.variant ?? 'default',
      }) as Promise<void>,
    [open]
  );

  const ctx = useMemo<DialogContextValue>(
    () => ({ prompt, confirm, alert }),
    [prompt, confirm, alert]
  );

  // Bridge for non-React callers (Tiptap extensions, callbacks created
  // outside the React tree). Keeps a singleton handle on `window` so they
  // can show our designed modals instead of native ones.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__nexusDialog = ctx;
    return () => {
      if ((window as any).__nexusDialog === ctx) {
        delete (window as any).__nexusDialog;
      }
    };
  }, [ctx]);

  const handleConfirm = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (state.mode === 'prompt') {
      const trimmed = value.trim();
      if (state.required && !trimmed) return;
      close(trimmed);
      return;
    }
    if (state.mode === 'confirm') {
      close(true);
      return;
    }
    close(undefined);
  };

  const handleCancel = () => {
    if (state.mode === 'prompt') close(null);
    else if (state.mode === 'confirm') close(false);
    else close(undefined);
  };

  const isDanger = state.variant === 'danger';

  return (
    <DialogContext.Provider value={ctx}>
      {children}
      <Dialog.Root
        open={state.open}
        onOpenChange={(o) => {
          if (!o) handleCancel();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-background/60 backdrop-blur-md z-[200] animate-in fade-in duration-200" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-sidebar border border-border/10 rounded-2xl shadow-popover p-6 z-[201] animate-in zoom-in-95 fade-in duration-200 focus:outline-none"
            onOpenAutoFocus={(e) => {
              if (state.mode === 'prompt') {
                e.preventDefault();
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              {isDanger && (
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-base font-bold text-foreground leading-tight">
                  {state.title}
                </Dialog.Title>
                {state.description && (
                  <Dialog.Description className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
                    {state.description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                onClick={handleCancel}
                className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors rounded shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleConfirm}>
              {state.mode === 'prompt' && (
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={state.placeholder}
                  className="w-full px-3 py-2 mb-4 bg-background border border-border/30 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-cta/50 focus:ring-2 focus:ring-cta/20 transition-all"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}

              <div className="flex items-center justify-end gap-2">
                {state.mode !== 'alert' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground hover:bg-hover rounded-lg transition-colors"
                  >
                    {state.cancelLabel}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    state.mode === 'prompt' && state.required && !value.trim()
                  }
                  className={
                    isDanger
                      ? 'px-4 py-1.5 text-[13px] font-bold bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                      : 'px-4 py-1.5 text-[13px] font-bold bg-cta text-cta-foreground hover:opacity-90 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  }
                >
                  {state.confirmLabel}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used inside <DialogProvider>');
  }
  return ctx;
}
