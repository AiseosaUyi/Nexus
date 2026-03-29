import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CSPostHogProvider } from '@/components/providers/PostHogProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus — Your Knowledge Base',
  description:
    'A block-based knowledge system for your team. Write, organize, and collaborate — all in one place.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <CSPostHogProvider>{children}</CSPostHogProvider>
      </body>
    </html>
  );
}
