'use client';
import { useEffect } from 'react';

/**
 * Loads posthog-js lazily, after hydration, and only when a key is set — it
 * used to be imported statically into the root layout, adding a ~170 KB chunk
 * to every route (including the landing page) even with analytics disabled.
 * Nothing in the app reads PostHog via React context, so no provider is needed.
 */
export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    let cancelled = false;
    const load = () => {
      import('posthog-js').then(({ default: posthog }) => {
        if (cancelled || posthog.__loaded) return;
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          person_profiles: 'identified_only',
          capture_pageview: false, // App Router paths are captured manually
        });
      });
    };
    // Don't compete with the page's own JS for the main thread. (Safari has
    // no requestIdleCallback, so fall back to a short timeout.)
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const handle = hasIdle ? window.requestIdleCallback(load) : window.setTimeout(load, 1500);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  return <>{children}</>;
}
