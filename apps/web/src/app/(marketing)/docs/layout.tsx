import Link from 'next/link';
import { DOC_SECTIONS } from '@/lib/docs';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24">
              <Link
                href="/docs"
                className="flex items-center gap-2 font-semibold text-[14.5px] tracking-tight mb-6 text-muted hover:text-foreground transition-colors"
              >
                Documentation
              </Link>
              <div className="space-y-6">
                {DOC_SECTIONS.map((section) => (
                  <div key={section.slug}>
                    <div className="text-[11.5px] tracking-[0.08em] uppercase text-muted font-semibold mb-2 px-2">
                      {section.title}
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <Link
                          key={item.slug}
                          href={`/docs/${item.slug}`}
                          className="block text-[13.5px] text-muted hover:text-foreground hover:bg-hover rounded-lg px-2 py-1.5 transition-colors"
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
