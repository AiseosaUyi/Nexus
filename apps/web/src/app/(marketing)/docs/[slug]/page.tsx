import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { findDocItem, DOC_SECTIONS, getAllDocSlugs } from '@/lib/docs';
import { DOC_CONTENT } from '@/lib/docs-content';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = findDocItem(slug);
  if (!found) return {};
  return {
    title: found.item.title,
    description: `Nexus documentation: ${found.item.title}`,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const found = findDocItem(slug);
  if (!found) notFound();

  const { section, item } = found;
  const content = DOC_CONTENT[slug];

  const idx = section.items.findIndex((i) => i.slug === slug);
  const prev = idx > 0 ? section.items[idx - 1] : null;
  const next = idx < section.items.length - 1 ? section.items[idx + 1] : null;

  const sectionIdx = DOC_SECTIONS.findIndex((s) => s.slug === section.slug);
  const nextSectionFirst =
    !next && sectionIdx < DOC_SECTIONS.length - 1
      ? DOC_SECTIONS[sectionIdx + 1].items[0]
      : null;
  const prevSectionLast =
    !prev && sectionIdx > 0
      ? DOC_SECTIONS[sectionIdx - 1].items.at(-1)
      : null;

  const nextPage = next ?? nextSectionFirst;
  const prevPage = prev ?? prevSectionLast;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted mb-8">
        <Link href="/docs" className="hover:text-accent transition-colors">Docs</Link>
        <span className="opacity-40">/</span>
        <span>{section.title}</span>
        <span className="opacity-40">/</span>
        <span className="text-foreground">{item.title}</span>
      </div>

      <h1 className="font-display text-[clamp(26px,3.5vw,40px)] font-semibold tracking-[-0.032em] leading-[1.1] mb-8">
        {item.title}
      </h1>

      {content ? (
        <div
          className="prose-nexus text-[15.5px] leading-[1.78]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-border bg-card/60 flex items-start gap-3 mb-8">
          <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--nb-yellow)' }} />
          <div>
            <p className="text-[14.5px] font-medium mb-1">This page is being written</p>
            <p className="text-[13.5px] text-muted leading-relaxed">
              Check the{' '}
              <Link href="/community" className="text-accent hover:opacity-80 transition-opacity">community</Link>
              {' '}or email{' '}
              <a href="mailto:support@usenexus.app" className="text-accent hover:opacity-80 transition-opacity">
                support@usenexus.app
              </a>{' '}for immediate help.
            </p>
          </div>
        </div>
      )}

      {/* Prev / Next */}
      <div className="flex items-stretch justify-between gap-4 mt-14 pt-8 border-t border-border">
        <div className="flex-1">
          {prevPage && (
            <Link
              href={`/docs/${prevPage.slug}`}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors h-full"
            >
              <ArrowLeft className="w-4 h-4 text-muted group-hover:-translate-x-0.5 transition-transform shrink-0" strokeWidth={2} />
              <span>
                <div className="text-[11px] uppercase tracking-wide text-muted mb-0.5">Previous</div>
                <div className="text-[13.5px] font-medium">{prevPage.title}</div>
              </span>
            </Link>
          )}
        </div>
        <div className="flex-1 flex justify-end">
          {nextPage && (
            <Link
              href={`/docs/${nextPage.slug}`}
              className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors text-right"
            >
              <span>
                <div className="text-[11px] uppercase tracking-wide text-muted mb-0.5">Next</div>
                <div className="text-[13.5px] font-medium">{nextPage.title}</div>
              </span>
              <ArrowRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
