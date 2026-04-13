'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from '@/app/(dashboard)/w/[workspace_slug]/team-actions';

export default function AcceptInviteClient({ token, workspaceSlug }: { token: string; workspaceSlug?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/w/${workspaceSlug || 'dashboard'}/dashboard`);
      }
    });
  };

  return (
    <div>
      {error && (
        <p className="text-red-400 text-[13px] mb-4">{error}</p>
      )}
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {isPending ? 'Accepting...' : 'Accept Invitation'}
      </button>
    </div>
  );
}
