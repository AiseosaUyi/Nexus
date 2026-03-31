import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ReadOnlyEditor from '@/components/editor/ReadOnlyEditor';

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

  if (!node) return { title: 'Not Found' };

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

  // Fetch node — anon RLS policy returns it only when is_public = true.
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('id, title, icon, is_public')
    .eq('id', node_id)
    .eq('is_public', true)
    .single();

  if (nodeError || !node) {
    return notFound();
  }

  // Fetch blocks — anon RLS policy allows SELECT when node is public.
  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('type, content, position')
    .eq('node_id', node_id)
    .order('position', { ascending: true });

  if (blocksError) {
    console.error('[Public] Error fetching blocks for node', node_id, blocksError.message);
  }

  // Safely map DB blocks to Tiptap JSON nodes, skipping malformed entries.
  const tiptapNodes =
    blocks && blocks.length > 0
      ? blocks
          .map((b) => {
            if (!b?.type || typeof b.content !== 'object' || b.content === null) return null;
            return {
              type: b.type,
              attrs: (b.content as any).attrs ?? {},
              content: (b.content as any).content ?? [],
            };
          })
          .filter(Boolean)
      : [];

  const content = {
    type: 'doc',
    content: tiptapNodes.length > 0 ? tiptapNodes : [{ type: 'paragraph' }],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal public header */}
      <header className="border-b border-border/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-black text-xs font-bold">N</span>
          </div>
          <span className="text-foreground/60 text-sm font-medium">Nexus</span>
        </div>
        <span className="text-xs text-muted bg-sidebar/50 border border-border/30 px-2 py-1 rounded-full">
          Read-only
        </span>
      </header>

      {/* Page content */}
      <main className="w-full max-w-4xl mx-auto px-12 md:px-24 py-12">
        {node.icon && (
          <div className="text-7xl mb-4">{node.icon}</div>
        )}
        <h1 className="text-5xl font-black font-display tracking-tight leading-tight text-foreground mb-8">
          {node.title || 'Untitled'}
        </h1>
        <ReadOnlyEditor content={content} />
      </main>
    </div>
  );
}
