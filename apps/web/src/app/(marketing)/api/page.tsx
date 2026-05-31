import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Zap, Code2, BookOpen } from 'lucide-react';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

export const metadata: Metadata = {
  title: 'API Reference',
  description:
    'The Nexus API — programmatic access to your workspace data. Documentation for developers.',
};

const ENDPOINTS: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string; desc: string; status: 'stable' | 'beta' | 'soon' }[] = [
  { method: 'GET', path: '/v1/workspaces', desc: 'List workspaces the authenticated user belongs to', status: 'beta' },
  { method: 'GET', path: '/v1/workspaces/:id/nodes', desc: 'List all nodes in a workspace', status: 'beta' },
  { method: 'GET', path: '/v1/nodes/:id', desc: 'Get a single node with its metadata', status: 'beta' },
  { method: 'POST', path: '/v1/nodes', desc: 'Create a new node (document, folder)', status: 'beta' },
  { method: 'PATCH', path: '/v1/nodes/:id', desc: 'Update node metadata (title, parent, position)', status: 'beta' },
  { method: 'DELETE', path: '/v1/nodes/:id', desc: 'Delete a node and its children', status: 'beta' },
  { method: 'GET', path: '/v1/nodes/:id/content', desc: 'Export node content as JSON or Markdown', status: 'soon' },
  { method: 'GET', path: '/v1/workspaces/:id/members', desc: 'List workspace members', status: 'soon' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--nb-green)',
  POST: 'var(--nb-blue)',
  PATCH: 'var(--nb-yellow)',
  DELETE: 'var(--nb-pink)',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className="inline-block text-[11px] font-bold w-[52px] text-center rounded px-1.5 py-0.5 font-mono"
      style={{
        color: METHOD_COLORS[method],
        background: `color-mix(in oklab, ${METHOD_COLORS[method]} 12%, transparent)`,
      }}
    >
      {method}
    </span>
  );
}

function StatusPip({ status }: { status: 'stable' | 'beta' | 'soon' }) {
  if (status === 'stable') return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">Stable</span>;
  if (status === 'beta') return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--nb-yellow) 12%, transparent)', color: 'var(--nb-yellow)' }}>Beta</span>;
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-muted">Coming soon</span>;
}

export default function ApiPage() {
  return (
    <div className="px-6">
      {/* Hero */}
      <section className="pt-20 pb-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <h1 className="font-display text-[clamp(34px,5vw,60px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-6">
            Build on Nexus.
          </h1>
          <p className="text-[19px] text-muted leading-relaxed max-w-[52ch] mb-8">
            Programmatic access to your workspace — read nodes, create documents, automate workflows. The API is in early beta.
          </p>
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card text-[14px] text-muted">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--nb-yellow)' }} />
            The REST API is in beta. Endpoints and authentication may change with notice.
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Auth */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 items-start">
          <RevealOnScroll>
            <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em] mb-4">
              Authentication
            </h2>
            <p className="text-[16px] text-muted leading-relaxed mb-4">
              All API requests are authenticated using a Bearer token. Generate a personal access token from your workspace settings.
            </p>
            <p className="text-[16px] text-muted leading-relaxed">
              Tokens are scoped to a single workspace and inherit the requesting user&apos;s permissions. Treat them like passwords — store securely, rotate regularly.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-accent">
                <Lock className="w-4 h-4" strokeWidth={1.9} />
              </div>
              <div className="text-[14px] text-muted">
                All API traffic is over HTTPS. Requests over HTTP are rejected.
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={80}>
            <div className="rounded-2xl border border-border bg-sidebar overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="text-[12px] text-muted ml-1">Request example</span>
              </div>
              <pre className="p-5 text-[13px] leading-[1.7] overflow-x-auto font-mono">
                <code>{`curl https://api.usenexus.app/v1/nodes \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json"

# Response
{
  "data": [
    {
      "id": "node_01abc...",
      "type": "document",
      "title": "Launch Plan",
      "parent_id": null,
      "created_at": "2025-04-01T10:00:00Z"
    }
  ],
  "total": 42
}`}</code>
              </pre>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Endpoints */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Endpoints
          </h2>
          <p className="text-[15.5px] text-muted mt-2 max-w-[50ch]">
            Base URL: <code className="font-mono text-[14px] bg-sidebar px-1.5 py-0.5 rounded">https://api.usenexus.app</code>
          </p>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {ENDPOINTS.map((ep, i) => (
              <div
                key={ep.path}
                className={`flex items-center gap-4 px-5 py-4 ${i < ENDPOINTS.length - 1 ? 'border-b border-border' : ''}`}
              >
                <MethodBadge method={ep.method} />
                <code className="font-mono text-[13.5px] text-foreground min-w-0 flex-1">{ep.path}</code>
                <span className="text-[13.5px] text-muted hidden md:block flex-1">{ep.desc}</span>
                <StatusPip status={ep.status} />
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* SDKs + resources */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll className="mb-8">
          <h2 className="font-display text-[clamp(22px,2.8vw,32px)] font-semibold tracking-[-0.025em]">
            Resources
          </h2>
        </RevealOnScroll>
        <RevealOnScroll>
          <div className="grid md:grid-cols-3 gap-[18px]">
            {[
              { icon: BookOpen, title: 'Full reference', desc: 'Complete endpoint documentation with examples, request/response schemas, and error codes.', href: '/docs', cta: 'Read the docs' },
              { icon: Code2, title: 'TypeScript SDK', desc: 'Official SDK for Node.js and browser environments. Typed, tree-shakeable, actively maintained.', href: '#', cta: 'Coming soon' },
              { icon: Zap, title: 'Webhooks', desc: 'Receive real-time notifications when nodes are created, updated, or deleted in your workspace.', href: '#', cta: 'Coming soon' },
            ].map(({ icon: Icon, title, desc, href, cta }) => (
              <div key={title} className="p-6 rounded-2xl border border-border bg-card flex flex-col">
                <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center text-accent mb-4">
                  <Icon className="w-5 h-5" strokeWidth={1.9} />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight mb-2">{title}</h3>
                <p className="text-[13.5px] text-muted leading-relaxed flex-1 mb-4">{desc}</p>
                {href === '#' ? (
                  <span className="text-[13.5px] text-muted">{cta}</span>
                ) : (
                  <Link href={href} className="text-[13.5px] font-medium text-accent hover:opacity-80 transition-opacity">
                    {cta} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      <section className="pb-16 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <p className="text-[14px] text-muted">
            API questions?{' '}
            <a href="mailto:api@usenexus.app" className="text-accent hover:opacity-80 transition-opacity">
              api@usenexus.app
            </a>
          </p>
        </RevealOnScroll>
      </section>
    </div>
  );
}
