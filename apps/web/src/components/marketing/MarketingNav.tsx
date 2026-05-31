'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import NexusMark from '@/components/NexusMark';

const NAV_LINKS: [string, string][] = [
  ['Blog', '/blog'],
  ['About', '/about'],
  ['Docs', '/docs'],
];

export default function MarketingNav() {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('businesses')
          .select('slug')
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) setWorkspaceSlug(data.slug);
          });
      }
    });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        stuck
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-[19px] tracking-tight"
        >
          <NexusMark size={26} className="text-foreground" />
          Nexus
        </Link>

        <div className="hidden md:flex items-center gap-1 text-[14px]">
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2 rounded-lg text-muted hover:text-foreground hover:bg-hover transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {workspaceSlug ? (
            <Link
              href={`/w/${workspaceSlug}/dashboard`}
              className="nb-press px-4 py-2 rounded-xl text-[14px] font-medium bg-cta text-cta-foreground"
            >
              Workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:block px-3 py-2 text-[14px] text-muted hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="nb-press px-4 py-2 rounded-xl text-[14px] font-medium bg-cta text-cta-foreground"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
