import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Users, 
  Layout, 
  ArrowRight,
  Zap,
  ShieldCheck,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HandbookProps {
  params: Promise<{
    workspace_slug: string;
  }>;
}

const ARTICLES = [
  {
    id: 'blocks-101',
    title: 'Blocks & Slash Commands',
    description: 'Master the art of fast editing with Notion-style blocks and the powerful / command.',
    icon: Sparkles,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'collaboration',
    title: 'Real-time Teamplay',
    description: 'How to share pages, manage permissions, and edit simultaneously with your team.',
    icon: Users,
    color: 'text-cta',
    bg: 'bg-cta/10',
  },
  {
    id: 'organization',
    title: 'Structuring Knowledge',
    description: 'Using the hierarchical sidebar, folders, and nested documents to stay organized.',
    icon: Layout,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'ai-nexus',
    title: 'Nexus AI Power-ups',
    description: 'Using artificial intelligence to summarize, brainstorm, and generate content.',
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  }
];

export default async function GetStartedPage({ params }: HandbookProps) {
  const { workspace_slug } = await params;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto selection:bg-accent/30 custom-scrollbar">
      <div className="w-full max-w-4xl mx-auto px-12 md:px-24 py-20 pb-40">
        {/* Header Section */}
        <div className="space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cta/10 rounded-xl flex items-center justify-center text-cta">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted">Handbook</span>
          </div>
          
          <h1 className="text-6xl font-black font-display tracking-tighter text-foreground leading-[0.9]">
            Welcome to <span className="text-cta">Nexus</span>.
          </h1>
          <p className="text-xl text-muted/80 max-w-2xl font-medium leading-relaxed">
            Your all-in-one workspace for knowledge, notes, and team collaboration. Master the basics in minutes.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          {ARTICLES.map((article, idx) => (
            <Link 
              key={article.id}
              href={`/w/${workspace_slug}/get-started/${article.id}`}
              className="group relative p-8 rounded-2xl border border-border/10 bg-sidebar/30 hover:bg-sidebar/50 hover:border-border/30 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", article.bg, article.color)}>
                <article.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2 group-hover:text-cta transition-colors">
                {article.title}
                <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </h3>
              <p className="text-sm text-muted/70 leading-relaxed font-medium">
                {article.description}
              </p>
              
              {/* Subtle accent line on hover */}
              <div className="absolute bottom-0 left-0 h-1 bg-cta/30 w-0 group-hover:w-full transition-all duration-700" />
            </Link>
          ))}
        </div>

        {/* Search Callout */}
        <div className="mt-20 p-10 rounded-3xl bg-linear-to-br from-sidebar/50 to-background border border-border/10 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="w-16 h-16 bg-background border border-border/10 rounded-full flex items-center justify-center shadow-xl">
            <Search className="w-7 h-7 text-muted" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Can't find what you need?</h2>
            <p className="text-sm text-muted/60 max-w-md mx-auto">
              Our global search is always available via <kbd className="px-1.5 py-0.5 bg-muted/10 border border-border/20 rounded text-[11px] font-bold">⌘K</kbd>. Search through documents, folders, and blocks instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
