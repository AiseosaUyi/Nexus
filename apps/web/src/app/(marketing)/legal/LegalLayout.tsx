import Link from 'next/link';

interface Props {
  title: string;
  lastUpdated: string;
  toc: string[];
  children: React.ReactNode;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function LegalLayout({ title, lastUpdated, toc, children }: Props) {
  return (
    <div className="px-6 py-14 max-w-[1120px] mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-[clamp(30px,4vw,48px)] font-semibold tracking-[-0.035em] leading-[1.05] mb-3">
          {title}
        </h1>
        <p className="text-[14px] text-muted">
          Last updated: {lastUpdated} &nbsp;·&nbsp;{' '}
          <em className="not-italic font-medium text-foreground/70">
            This document is a template and should be reviewed by qualified legal counsel before use.
          </em>
        </p>
      </div>

      <div className="border-t border-border" />

      <div className="grid lg:grid-cols-[240px_1fr] gap-14 pt-12">
        {/* TOC sidebar */}
        <nav className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-4">Contents</div>
            <ul className="space-y-1.5">
              {toc.map((item, i) => (
                <li key={item}>
                  <a
                    href={`#${slugify(item)}`}
                    className="flex items-start gap-2 text-[13.5px] text-muted hover:text-accent transition-colors py-0.5"
                  >
                    <span className="shrink-0 tabular-nums opacity-50 mt-px">{String(i + 1).padStart(2, '0')}</span>
                    <span className="capitalize">{item}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-6 border-t border-border space-y-1.5">
              <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-3">Other legal</div>
              {[['Terms of Service', '/legal/terms'], ['Privacy Policy', '/legal/privacy'], ['Cookie Policy', '/legal/cookies']].map(([l, h]) => (
                <Link key={h} href={h} className="block text-[13.5px] text-muted hover:text-accent transition-colors py-0.5">
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="legal-prose text-[15.5px] leading-[1.75] space-y-8 max-w-[70ch]">
          {children}
        </div>
      </div>
    </div>
  );
}
