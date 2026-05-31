import type { Metadata } from 'next';
import './globals.css';
import { CSPostHogProvider } from '@/components/providers/PostHogProvider';
import { DialogProvider } from '@/components/providers/DialogProvider';

// Runs before paint: apply the saved theme (or system preference) to <html>
// so there is no light/dark flash on load.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('nexus-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Bumping `?v` busts cached favicons after a redesign. Update this when the
// icon visuals change so existing tabs reload the new mark.
const ICON_VERSION = '4';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Nexus — The calm knowledge workspace for teams | Notion & Google Docs alternative',
    template: '%s · Nexus',
  },
  description:
    'Nexus is a calm, structured knowledge workspace — a Notion and Google Docs alternative that keeps your team’s notes, docs, and plans in one searchable, infinitely-nestable tree. Free to start.',
  keywords: [
    'knowledge workspace',
    'Notion alternative',
    'Google Docs alternative',
    'team wiki',
    'knowledge base software',
    'document collaboration',
    'content calendar',
    'block editor',
    'second brain',
  ],
  applicationName: 'Nexus',
  icons: {
    icon: { url: `/icon.svg?v=${ICON_VERSION}`, type: 'image/svg+xml' },
    shortcut: `/icon.svg?v=${ICON_VERSION}`,
    apple: `/apple-icon?v=${ICON_VERSION}`,
  },
  openGraph: {
    type: 'website',
    siteName: 'Nexus',
    title: 'Nexus — The calm knowledge workspace for teams',
    description:
      'Stop losing your team’s knowledge across scattered Google Docs and a sprawling Notion. Nexus keeps everything in one calm, structured, searchable home.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus — The calm knowledge workspace for teams',
    description:
      'A Notion & Google Docs alternative that keeps your team’s notes, docs, and plans in one structured, searchable tree.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans text-foreground bg-background">
        <CSPostHogProvider>
          <DialogProvider>{children}</DialogProvider>
        </CSPostHogProvider>
      </body>
    </html>
  );
}
