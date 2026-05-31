import Link from 'next/link';
import NexusMark from '@/components/NexusMark';

const COLUMNS: [string, [string, string][]][] = [
  [
    'Product',
    [
      ['Features', '/#features'],
      ['Pricing', '/#pricing'],
      ['Changelog', '#'],
      ['Roadmap', '#'],
    ],
  ],
  [
    'Company',
    [
      ['About', '/about'],
      ['Blog', '/blog'],
      ['Careers', '/careers'],
      ['Security', '/security'],
    ],
  ],
  [
    'Resources',
    [
      ['Docs', '/docs'],
      ['API', '/api'],
      ['Community', '/community'],
      ['Status', '/status'],
    ],
  ],
];

export default function MarketingFooter() {
  return (
    <footer className="px-6 pt-16 pb-12 border-t border-border bg-sidebar">
      <div className="max-w-[1120px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-[1.7fr_1fr_1fr_1fr] gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold text-[16px] tracking-tight"
            >
              <NexusMark size={26} className="text-foreground" />
              Nexus
            </Link>
            <p className="text-[14.5px] text-muted max-w-[30ch] mt-3.5 leading-relaxed">
              A calm home for everything you know. Write, organize, and plan — all in one place.
            </p>
          </div>
          {COLUMNS.map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-[12px] tracking-[0.1em] uppercase text-muted/80 font-semibold mb-4">
                {heading}
              </h4>
              {links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="block text-[14.5px] text-muted hover:text-accent transition-colors mb-2.5"
                >
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-14 pt-7 border-t border-border flex justify-between flex-wrap gap-3 text-[13px] text-muted">
          <span>© {new Date().getFullYear()} Nexus, Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-accent transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-accent transition-colors">
              Terms
            </Link>
            <Link href="/legal/cookies" className="hover:text-accent transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
