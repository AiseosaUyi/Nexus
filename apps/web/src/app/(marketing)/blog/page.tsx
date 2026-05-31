import type { Metadata } from 'next';
import Link from 'next/link';
import { getPosts, formatDate } from '@/lib/blog';
import RevealOnScroll from '@/components/marketing/RevealOnScroll';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Thinking on knowledge management, team productivity, and building Nexus — from the team behind it.',
};

export default function BlogPage() {
  const posts = getPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="px-6">
      <section className="pt-20 pb-16 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <div className="text-[13px] font-semibold tracking-[0.1em] uppercase text-accent mb-5">Blog</div>
          <h1 className="font-display text-[clamp(34px,5vw,58px)] font-semibold tracking-[-0.04em] leading-[1.0] mb-4">
            Ideas, updates, and thinking
          </h1>
          <p className="text-[18px] text-muted max-w-[52ch] leading-relaxed">
            How we think about knowledge management, why we build the way we do, and what we&apos;re learning along the way.
          </p>
        </RevealOnScroll>
      </section>

      <div className="max-w-[1120px] mx-auto border-t border-border" />

      {/* Featured post */}
      <section className="py-14 max-w-[1120px] mx-auto">
        <RevealOnScroll>
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid lg:grid-cols-[1.3fr_1fr] rounded-2xl border border-border bg-card hover:border-accent/40 transition-colors overflow-hidden"
          >
            <div className="p-8 lg:p-10">
              <div className="flex items-center gap-3 mb-4">
                {featured.tags.map((t) => (
                  <span key={t} className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border border-border" style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)', color: 'var(--accent)' }}>
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="font-display text-[clamp(22px,2.6vw,30px)] font-semibold tracking-[-0.025em] leading-[1.2] mb-4 group-hover:text-accent transition-colors">
                {featured.title}
              </h2>
              <p className="text-[15.5px] text-muted leading-relaxed mb-6">{featured.excerpt}</p>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ background: 'var(--accent)' }}>
                  {featured.author.initials}
                </span>
                <div className="text-[13.5px]">
                  <span className="font-medium text-foreground">{featured.author.name}</span>
                  <span className="text-muted"> · {formatDate(featured.date)} · {featured.readTime} min read</span>
                </div>
              </div>
            </div>

            {/* Cover photo */}
            <div className="hidden lg:block relative min-h-[260px] border-l border-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.coverImage}
                alt={featured.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Link>
        </RevealOnScroll>
      </section>

      {/* Post grid */}
      <section className="pb-20 max-w-[1120px] mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {rest.map((post, i) => (
            <RevealOnScroll key={post.slug} delay={i * 60}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col h-full rounded-2xl border border-border bg-card hover:border-accent/40 transition-colors overflow-hidden"
              >
                {/* Cover photo */}
                <div className="relative h-[160px] overflow-hidden border-b border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((t) => (
                      <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border" style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)', color: 'var(--accent)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-[16px] leading-[1.35] tracking-tight mb-2.5 group-hover:text-accent transition-colors flex-1">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-muted leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-2 pt-3.5 border-t border-border">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>
                      {post.author.initials}
                    </span>
                    <span className="text-[12px] text-muted">{post.author.name} · {formatDate(post.date)}</span>
                  </div>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </section>
    </div>
  );
}
