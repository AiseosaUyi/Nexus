import React from 'react';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/dashboard/PageHeader';
import { 
  Sparkles, 
  Users, 
  Layout, 
  Zap,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface ArticlePageProps {
  params: Promise<{
    workspace_slug: string;
    article_id: string;
  }>;
}

const ARTICLE_CONTENT: Record<string, any> = {
  'blocks-101': {
    title: 'Blocks & Slash Commands',
    icon: '✨',
    content: (
      <div className="space-y-8 text-[17px] text-foreground/80 leading-relaxed font-medium">
        <p>Welcome to the building blocks of Nexus. Unlike traditional editors, every paragraph, heading, and image here is an independent **Block**.</p>
        
        <div className="p-6 rounded-2xl bg-sidebar/50 border border-border/10">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> The Magic '/' Command
          </h3>
          <p>Type <kbd className="px-1.5 py-0.5 bg-background border border-border/10 rounded text-sm font-bold mx-1">/狂</kbd> anywhere in the editor to open the command palette. From there, you can instantly insert:</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 text-sm">
             <li className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/5">H1, H2, H3 Headings</li>
             <li className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/5">Todo Checklists</li>
             <li className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/5">Bullet & Numbered Lists</li>
             <li className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border/5">Tables & Images</li>
          </ul>
        </div>

        <p>Blocks are the DNA of Nexus. You can rearrange them, style them, and even turn a paragraph into a heading with just a click.</p>
      </div>
    )
  },
  'collaboration': {
    title: 'Real-time Teamplay',
    icon: '🤝',
    content: (
      <div className="space-y-8 text-[17px] text-foreground/80 leading-relaxed font-medium">
        <p>Nexus is built for high-performance teams. Work together in the same document without ever worrying about sync conflicts.</p>
        
        <div className="space-y-6">
           <div className="flex gap-4">
              <div className="w-10 h-10 bg-cta/10 rounded-full flex items-center justify-center shrink-0">
                 <Users className="w-5 h-5 text-cta" />
              </div>
              <div>
                 <h4 className="font-bold text-foreground">Live Presence</h4>
                 <p className="text-sm text-muted/60 mt-1">See exactly where your teammates are typing with colored cursors and name tags.</p>
              </div>
           </div>
           
           <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                 <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                 <h4 className="font-bold text-foreground">Sub-millisecond Sync</h4>
                 <p className="text-sm text-muted/60 mt-1">Our Yjs-powered real-time engine ensures that every keystroke is reflected instantly across the globe.</p>
              </div>
           </div>
        </div>
      </div>
    )
  }
};

export default async function HandbookArticlePage({ params }: ArticlePageProps) {
  const { workspace_slug, article_id } = await params;
  const article = ARTICLE_CONTENT[article_id];

  if (!article) return notFound();

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto selection:bg-accent/30 custom-scrollbar">
      
      {/* Navigation Header */}
      <div className="w-full flex items-center px-8 py-4 border-b border-border/5 text-[13px] font-bold text-muted/50 uppercase tracking-widest bg-sidebar/5">
         <Link href={`/w/${workspace_slug}/get-started`} className="flex items-center gap-2 hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Handbook
         </Link>
         <ChevronRight className="w-3 h-3 mx-4 opacity-20" />
         <span className="text-foreground/40">{article.title}</span>
      </div>

      <div className="w-full max-w-3xl mx-auto px-12 md:px-24 py-20 pb-40">
        {/* Simplified Notion Canvas Layout */}
        <div className="mb-12">
           <div className="text-7xl mb-6">{article.icon}</div>
           <h1 className="text-5xl font-black font-display tracking-tight leading-tight text-foreground">
             {article.title}
           </h1>
        </div>

        {/* Content Render */}
        <div className="prose prose-invert prose-nexus max-w-none">
           {article.content}
        </div>

        {/* Next Step Callout */}
        <div className="mt-20 pt-10 border-t border-border/10 flex justify-between items-center group">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1 opacity-50">Next Article</span>
              <span className="text-xl font-bold transition-colors group-hover:text-cta">{article_id === 'blocks-101' ? 'Real-time Teamplay' : 'Structuring Knowledge'}</span>
           </div>
           <button className="w-12 h-12 bg-cta/10 rounded-full flex items-center justify-center text-cta transition-transform group-hover:translate-x-2">
              <ChevronRight className="w-6 h-6" />
           </button>
        </div>
      </div>
    </div>
  );
}
