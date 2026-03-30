"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";
import { createBusiness } from "@/app/(auth)/actions";

export default function CreateBusinessModal({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const response = await createBusiness(formData);
      if (response?.error) {
        setError(response.error);
      } else if (response?.data) {
        setIsOpen(false);
        router.push(`/w/${response.data.slug}/dashboard`);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-foreground/5 rounded-sm transition-colors cursor-pointer w-full text-left font-medium opacity-60">
            <Plus className="w-4 h-4" />
            Create Workspace
          </button>
        )}
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-sidebar border border-border/10 rounded-2xl shadow-popover p-8 z-50 animate-in zoom-in-95 fade-in duration-300 focus:outline-none">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-black font-display tracking-tight text-foreground">
              Create workspace
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-hover rounded-full transition-colors text-muted/40 hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-foreground/70 mb-8 font-medium">
            Workspaces are where your team lives and moves. You can create as many as you need.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[11px] font-bold text-foreground/70 ml-0.5 uppercase tracking-widest">
                Workspace Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Acme Inc."
                className="w-full px-4 py-3 rounded-xl border border-border/20 bg-background text-foreground placeholder:text-foreground/30 outline-none focus:ring-4 focus:ring-cta/10 focus:border-cta transition-all text-[15px] font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-[11px] font-bold text-foreground/70 ml-0.5 uppercase tracking-widest">
                Workspace Slug
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-foreground/40 font-mono tracking-tight">nexus-app.com/w/</span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  placeholder="acme"
                  className="flex-1 w-full px-4 py-3 rounded-xl border border-border/20 bg-background text-foreground placeholder:text-foreground/30 outline-none focus:ring-4 focus:ring-cta/10 focus:border-cta transition-all font-mono text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-10">
              <Dialog.Close asChild>
                <button
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-bold border border-border/10 rounded-xl hover:bg-foreground/5 transition-colors cursor-pointer text-muted-foreground"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-foreground text-background rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Workspace
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
