import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CSPostHogProvider } from '@/components/providers/PostHogProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Bumping `?v` busts cached favicons after a redesign. Update this when the
// icon visuals change so existing tabs reload the new mark.
const ICON_VERSION = '3';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Nexus — Your Knowledge Base',
    template: '%s · Nexus',
  },
  description:
    'A block-based knowledge system for your team. Write, organize, and collaborate — all in one place.',
  applicationName: 'Nexus',
  icons: {
    icon: { url: `/icon.svg?v=${ICON_VERSION}`, type: 'image/svg+xml' },
    shortcut: `/icon.svg?v=${ICON_VERSION}`,
    apple: `/apple-icon?v=${ICON_VERSION}`,
  },
  openGraph: {
    type: 'website',
    siteName: 'Nexus',
    title: 'Nexus — Your Knowledge Base',
    description:
      'A calm, block-based workspace to write, structure ideas, and collaborate — all in one place.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus — Your Knowledge Base',
    description:
      'A calm, block-based workspace to write, structure ideas, and collaborate — all in one place.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] text-foreground bg-background">
        <CSPostHogProvider>{children}</CSPostHogProvider>
      </body>
    </html>
  );
}
