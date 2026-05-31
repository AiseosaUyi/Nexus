import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { getPost, getPosts, formatDate } from '@/lib/blog';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article' },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const all = getPosts();
  const related = all.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="px-6 py-14 max-w-[1120px] mx-auto">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} /> All posts
      </Link>

      <div className="grid lg:grid-cols-[1fr_280px] gap-14">
        {/* Article */}
        <article>
          {/* Banner */}
          <div className="relative h-[260px] rounded-2xl overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>

          <header className="mb-10">
            <div className="flex flex-wrap gap-2 mb-5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full border border-border"
                  style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)', color: 'var(--accent)' }}
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="font-display text-[clamp(28px,4vw,46px)] font-semibold tracking-[-0.035em] leading-[1.1] mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-3.5 pb-8 border-b border-border">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                style={{ background: 'var(--accent)' }}
              >
                {post.author.initials}
              </span>
              <div>
                <div className="text-[14px] font-medium">{post.author.name}</div>
                <div className="text-[13px] text-muted flex items-center gap-2">
                  {post.author.role}
                  <span className="opacity-40">·</span>
                  {formatDate(post.date)}
                  <span className="opacity-40">·</span>
                  <Clock className="w-3 h-3 inline-block" strokeWidth={2} /> {post.readTime} min
                </div>
              </div>
            </div>
          </header>

          <div
            className="prose-nexus text-[16.5px] leading-[1.75] text-foreground"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        </article>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            <div className="p-6 rounded-2xl border border-border bg-card">
              <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-4">
                About the author
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                  style={{ background: 'var(--accent)' }}
                >
                  {post.author.initials}
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold">{post.author.name}</div>
                  <div className="text-[13px] text-muted">{post.author.role}</div>
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <div>
                <div className="text-[12px] tracking-[0.08em] uppercase text-muted font-semibold mb-4">
                  More posts
                </div>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="block p-4 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors"
                    >
                      <div className="text-[13.5px] font-medium leading-snug hover:text-accent transition-colors">
                        {r.title}
                      </div>
                      <div className="text-[12px] text-muted mt-1">{formatDate(r.date)}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6 rounded-2xl border border-border bg-card text-center">
              <div className="text-[14.5px] font-semibold mb-2">Try Nexus free</div>
              <p className="text-[13px] text-muted mb-4 leading-relaxed">
                Your first workspace. No credit card required.
              </p>
              <Link
                href="/signup"
                className="block text-center py-2.5 px-4 rounded-xl text-[13.5px] font-medium bg-cta text-cta-foreground"
              >
                Get started
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
