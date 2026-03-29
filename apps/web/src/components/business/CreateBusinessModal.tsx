"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Loader2 } from "lucide-react";
import { createBusiness } from "@/app/(auth)/actions"; // I'll add this action later

export default function CreateBusinessModal({ trigger }: { trigger?: React.ReactNode }) {
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
      } else {
        setIsOpen(false);
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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl p-6 z-50 animate-in zoom-in-95 fade-in duration-200 focus:outline-none">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-semibold text-[#37352f]">
              Create new workspace
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-foreground/5 rounded-full transition-colors opacity-40 hover:opacity-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-[#37352f]/60 mb-6">
            Workspaces are where your team lives. You can create as many as you need.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#37352f]/80 mb-1">
                Workspace Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Acme Inc."
                className="w-full px-3 py-2 text-sm rounded-md border border-[#37352f]/20 bg-white text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:ring-2 focus:ring-[#37352f]/20 focus:border-[#37352f]/40 transition-all"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-[#37352f]/80 mb-1">
                Workspace Slug
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#37352f]/40 font-mono">nexus.so/w/</span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  placeholder="acme"
                  className="flex-1 w-full px-3 py-2 text-sm rounded-md border border-[#37352f]/20 bg-white text-[#37352f] placeholder:text-[#37352f]/30 outline-none focus:ring-2 focus:ring-[#37352f]/20 focus:border-[#37352f]/40 transition-all font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <Dialog.Close asChild>
                <button
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium border border-[#37352f]/10 rounded-md hover:bg-foreground/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#37352f] text-white rounded-md hover:bg-[#37352f]/90 transition-colors cursor-pointer disabled:opacity-50"
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
