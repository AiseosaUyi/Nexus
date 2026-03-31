import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FileText, Folder, Calendar } from 'lucide-react';

interface TeamspacePageProps {
  params: Promise<{ workspace_slug: string; teamspace_id: string }>;
}

export default async function TeamspacePage({ params }: TeamspacePageProps) {
  const { workspace_slug, teamspace_id } = await params;
  const supabase = await createClient();

  const { data: teamspace, error } = await supabase
    .from('teamspaces')
    .select('id, name, icon, description')
    .eq('id', teamspace_id)
    .single();

  if (error || !teamspace) {
    redirect(`/w/${workspace_slug}/dashboard`);
  }

  const { data: nodes } = await supabase
    .from('nodes')
    .select('id, title, name, type, icon, updated_at, parent_id')
    .eq('teamspace_id', teamspace_id)
    .eq('is_archived', false)
    .is('parent_id', null)
    .order('updated_at', { ascending: false });

  const pages = nodes ?? [];

  const TypeIcon = { folder: Folder, document: FileText, calendar: Calendar } as const;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-4xl mx-auto px-12 md:px-24 py-16">
        {/* Header */}
        <div className="mb-10">
          {teamspace.icon && (
            <div className="text-5xl mb-3">{teamspace.icon}</div>
          )}
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground mb-2">
            {teamspace.name}
          </h1>
          {teamspace.description && (
            <p className="text-base text-foreground/50">{teamspace.description}</p>
          )}
        </div>

        {/* Pages grid */}
        {pages.length === 0 ? (
          <p className="text-sm text-foreground/40 italic">No pages in this teamspace yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pages.map((node) => {
              const Icon = TypeIcon[node.type as keyof typeof TypeIcon] ?? FileText;
              return (
                <Link
                  key={node.id}
                  href={`/w/${workspace_slug}/n/${node.id}`}
                  className="group flex flex-col gap-2 p-4 rounded-xl border border-border bg-sidebar hover:bg-hover transition-colors"
                >
                  <div className="flex items-center gap-2 text-foreground/70 group-hover:text-foreground">
                    {node.icon ? (
                      <span className="text-xl leading-none">{node.icon}</span>
                    ) : (
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    )}
                    <span className="font-medium text-sm truncate">
                      {node.name || node.title || 'Untitled'}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/30">
                    {new Date(node.updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
