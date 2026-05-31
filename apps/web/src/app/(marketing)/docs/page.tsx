import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Pencil, Layers, Users, Download, Zap } from 'lucide-react';
import { DOC_SECTIONS } from '@/lib/docs';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Everything you need to get the most out of Nexus — from quick start to advanced collaboration.',
};

const QUICK_START = [
  {
    icon: Zap,
    title: 'Quick start',
    desc: 'Create your first workspace and start writing in under five minutes.',
    href: '/docs/quick-start',
  },
  {
    icon: Pencil,
    title: 'Writing with blocks',
    desc: 'The block editor, slash commands, and how to structure a document.',
    href: '/docs/writing-with-blocks',
  },
  {
    icon: Layers,
    title: 'The node tree',
    desc: 'How Nexus organizes everything into one navigable hierarchy.',
    href: '/docs/the-node-tree',
  },
  {
    icon: Users,
    title: 'Roles & permissions',
    desc: 'Invite your team and set the right access level for everyone.',
    href: '/docs/roles-and-permissions',
  },
  {
    icon: Download,
    title: 'Import from Notion',
    desc: 'Bring your existing knowledge over in minutes, not days.',
    href: '/docs/import-notion',
  },
];

export default function DocsPage() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-[clamp(28px,3.8vw,44px)] font-semibold tracking-[-0.035em] leading-[1.05] mb-4">
          Welcome to Nexus Docs
        </h1>
        <p className="text-[17px] text-muted leading-relaxed max-w-[52ch]">
          Everything you need to build a calm, well-organized workspace — from first login to advanced team workflows.
        </p>
      </div>

      <div className="border-t border-border mb-10" />

      {/* Quick start cards */}
      <div className="mb-12">
        <h2 className="text-[16px] font-semibold tracking-tight mb-5">Start here</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {QUICK_START.map(({ icon: Icon, title, desc, href }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg border border-border bg-background flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-colors">
                <Icon className="w-4 h-4" strokeWidth={1.9} />
              </div>
              <div>
                <div className="text-[14.5px] font-semibold tracking-tight group-hover:text-accent transition-colors">
                  {title}
                </div>
                <div className="text-[13px] text-muted leading-relaxed mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* All sections */}
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight mb-5">All topics</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {DOC_SECTIONS.map((section) => (
            <div key={section.slug}>
              <h3 className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    className="flex items-center justify-between group text-[14px] text-muted hover:text-foreground hover:bg-hover rounded-lg px-2.5 py-2 transition-colors"
                  >
                    {item.title}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-accent transition-opacity" strokeWidth={2} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border mt-12 pt-8">
        <p className="text-[14px] text-muted">
          Something missing or unclear?{' '}
          <a href="mailto:support@usenexus.app" className="text-accent hover:opacity-80 transition-opacity">
            Let us know
          </a>{' '}
          and we&apos;ll improve it.
        </p>
      </div>
    </div>
  );
}
