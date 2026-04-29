import React from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ReadOnlyEditor from '@/components/editor/ReadOnlyEditor';
import RequestAccessForm from './RequestAccessForm';
import GuestEditor from './GuestEditor';

interface PublicPageProps {
  params: Promise<{ node_id: string }>;
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { node_id } = await params;
  const supabase = await createClient();

  const { data: node } = await supabase
    .from('nodes')
    .select('title, icon')
    .eq('id', node_id)
    .eq('is_public', true)
    .single();

  if (!node) return { title: 'Request Access — Nexus' };

  const title = node.title || 'Untitled';
  const displayTitle = node.icon ? `${node.icon} ${title}` : title;

  return {
    title: displayTitle,
    description: `Read ${title} on Nexus`,
    openGraph: {
      title: displayTitle,
      description: `Read ${title} on Nexus`,
      type: 'article',
    },
  };
}

export default async function PublicNodePage({ params }: PublicPageProps) {
  const { node_id } = await params;
  const supabase = await createClient();

  // Access ladder: a viewer is allowed if either
  //   1. the node is public (`is_public = true`), or
  //   2. the viewer is authenticated and their email appears in node_shares
  //      for this node (the email-invite path).
  // We try (1) first because it's the cheap, common case.
  let { data: node } = await supabase
    .from('nodes')
    .select('id, title, icon, is_public')
    .eq('id', node_id)
    .eq('is_public', true)
    .single();

  // Track the viewer's permission so we can pick read-only vs editable below.
  // 'public' means the page is open to the world (read-only). For invited
  // viewers we honor what's stored on node_shares.
  type Perm = 'public' | 'view' | 'comment' | 'edit' | 'full';
  let viewerPermission: Perm = 'public';
  let viewerName = '';
  let viewerEmail = '';

  const { data: { user } } = await supabase.auth.getUser();
  viewerEmail = user?.email?.toLowerCase().trim() ?? '';
  viewerName = (user?.user_metadata?.full_name as string)
    || (user?.user_metadata?.name as string)
    || (viewerEmail ? viewerEmail.split('@')[0] : 'Guest');

  if (!node && viewerEmail) {
    const { data: share } = await supabase
      .from('node_shares')
      .select('permission')
      .eq('node_id', node_id)
      .eq('email', viewerEmail)
      .maybeSingle();
    if (share) {
      const { data: viaShare } = await supabase
        .from('nodes')
        .select('id, title, icon, is_public')
        .eq('id', node_id)
        .single();
      if (viaShare) {
        node = viaShare;
        viewerPermission = (share.permission as Perm) ?? 'view';
      }
    }
  }

  // If still no access, show the "request access" page.
  if (!node) {
    // Verify the node exists at all (without RLS filter)
    const { data: existsCheck } = await supabase
      .from('nodes')
      .select('id')
      .eq('id', node_id)
      .maybeSingle();

    if (!existsCheck) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
            <p className="text-muted">This page doesn't exist or has been deleted.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/10 px-6 py-3 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-black text-xs font-bold">N</span>
            </div>
            <span className="text-foreground/60 text-sm font-medium">Nexus</span>
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-md mx-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">You need access</h1>
            <p className="text-[14px] text-muted mb-8 leading-relaxed">
              This page is restricted to invited people only. Request access and the owner will be notified.
            </p>
            <RequestAccessForm nodeId={node_id} />
          </div>
        </main>
      </div>
    );
  }

  // Fetch the Yjs snapshot (canonical content)
  const { data: nodeWithSnapshot } = await supabase
    .from('nodes')
    .select('yjs_snapshot')
    .eq('id', node_id)
    .single();

  const snapshot = nodeWithSnapshot?.yjs_snapshot as string | null;

  // Editable mode only when the viewer is an invited Guest with edit/full
  // permission. Public viewers and view-only invitees still hit the
  // ReadOnlyEditor. We never expose the dashboard chrome — Guests stay on
  // a single-page surface so they can't navigate to other workspace pages.
  const canEdit = viewerPermission === 'edit' || viewerPermission === 'full';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-black text-xs font-bold">N</span>
          </div>
          <span className="text-foreground/60 text-sm font-medium">Nexus</span>
        </div>
        <span className={
          canEdit
            ? 'text-xs text-cta bg-cta/10 border border-cta/30 px-2 py-1 rounded-full font-bold'
            : 'text-xs text-muted bg-sidebar/50 border border-border/30 px-2 py-1 rounded-full'
        }>
          {canEdit ? 'Guest editor' : 'Read-only'}
        </span>
      </header>

      <main className="w-full max-w-4xl mx-auto px-12 md:px-24 py-12">
        {node.icon && (
          <div className="text-7xl mb-4">{node.icon}</div>
        )}
        <h1 className="text-5xl font-black font-display tracking-tight leading-tight text-foreground mb-8">
          {node.title || 'Untitled'}
        </h1>
        {canEdit ? (
          <GuestEditor
            nodeId={node.id}
            initialSnapshot={snapshot}
            userName={viewerName}
          />
        ) : (
          <ReadOnlyEditor snapshot={snapshot} />
        )}
      </main>
    </div>
  );
}
