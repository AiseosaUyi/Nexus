'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Sparkles, 
  ArrowRight, 
  Search,
  Globe,
  BarChart3,
  MousePointer2,
  Zap,
  TrendingUp,
  Layout,
  Layers,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('slug')
          .limit(1)
          .single();
        
        if (businesses) {
          setWorkspaceSlug(businesses.slug);
        }
      }
      setLoading(false);
    }
    checkUser();

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/30 overflow-x-hidden custom-scrollbar">
      {/* Sticky Navbar */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-100 h-16 border-b border-transparent transition-all duration-300 px-6 flex items-center justify-between",
        scrolled ? "bg-background/80 backdrop-blur-md border-border/10" : ""
      )}>
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cta rounded flex items-center justify-center text-[13px] font-black text-cta-foreground uppercase tracking-widest">N</div>
            <span className="text-lg font-black font-display tracking-tight leading-none">Nexus</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-bold text-muted uppercase tracking-widest">
            <a href="#features" className="hover:text-foreground transition-colors">Product</a>
            <a href="#seo" className="hover:text-foreground transition-colors">SEO Performance</a>
            <a href="#marketing" className="hover:text-foreground transition-colors">Marketing</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && workspaceSlug ? (
            <Link href={`/w/${workspaceSlug}/dashboard`}>
              <button className="h-9 px-5 bg-cta hover:opacity-90 text-cta-foreground text-xs font-bold rounded shadow-lg shadow-cta/20 transition-all cursor-pointer">
                Workspace
              </button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-xs font-bold text-muted uppercase tracking-widest hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/signup">
                <button className="h-9 px-5 bg-cta hover:opacity-90 text-cta-foreground text-xs font-bold rounded shadow-lg shadow-cta/20 transition-all cursor-pointer">
                  Get Started
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full flex flex-col">
        
        {/* Animated Hero Section */}
        <section className="relative px-6 pt-40 pb-32 flex flex-col items-center text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cta/5 rounded-full blur-[150px] -z-10" />
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] -z-10" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cta/10 border border-cta/20 text-cta text-[11px] font-black uppercase tracking-widest mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            Designed for Tomorrow
          </div>

          <h1 className="text-7xl md:text-[5.5rem] font-black font-display tracking-tighter leading-[0.9] text-foreground mb-10 max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Your second brain, <br />
            <span className="text-cta">reimagined.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted max-w-2xl mx-auto leading-relaxed font-medium mb-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Nexus is a blazingly fast, collaborative knowledge base 
            inspired by the simplicity of Notion and the power of AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Link href="/signup">
              <button className="h-14 px-10 bg-cta hover:opacity-90 text-cta-foreground text-lg font-bold rounded-xl shadow-2xl shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center group">
                Get Started Free <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <div className="flex items-center gap-2 text-muted px-4 py-2 rounded-lg text-sm bg-sidebar/30 border border-border/5">
               <MousePointer2 className="w-4 h-4" /> 1K+ active users
            </div>
          </div>
        </section>

        {/* SEO Insights Section */}
        <section id="seo" className="px-6 py-32 bg-sidebar/10 border-y border-border/5 overflow-hidden">
           <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
              <div className="flex-1 space-y-8 text-center md:text-left">
                 <div className="inline-flex items-center gap-2 text-cta uppercase tracking-widest text-xs font-black">
                    <Globe className="w-4 h-4" />
                    Global Search Visibility
                 </div>
                 <h2 className="text-5xl font-black font-display tracking-tight text-foreground leading-tight">
                   SEO Performance that <br />
                   <span className="text-accent">moves the needle.</span>
                 </h2>
                 <p className="text-muted text-lg font-medium leading-relaxed">
                   Nexus automatically analyzes your content structure, suggesting keywords and on-page optimizations as you type. Real-time marketing insights, built-in.
                 </p>
                 <div className="grid grid-cols-2 gap-6 pt-4">
                    <div className="space-y-1">
                       <dt className="text-[11px] uppercase font-bold text-muted/50 tracking-widest">Search Growth</dt>
                       <dd className="text-3xl font-black text-foreground">+142%</dd>
                    </div>
                    <div className="space-y-1">
                       <dt className="text-[11px] uppercase font-bold text-muted/50 tracking-widest">Monthly Rank</dt>
                       <dd className="text-3xl font-black text-foreground">Top 1%</dd>
                    </div>
                 </div>
              </div>

              {/* Mock SEO Dashboard */}
              <div className="flex-1 w-full relative">
                 <div className="absolute inset-0 bg-cta/10 blur-[80px]" />
                 <div className="relative bg-background border border-border/10 rounded-2xl shadow-popover overflow-hidden animate-in fade-in duration-1000">
                    <div className="h-10 border-b border-border/10 px-4 flex items-center justify-between">
                       <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500/30" />
                          <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                          <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                       </div>
                       <div className="text-[11px] font-bold text-muted uppercase tracking-widest">Dashboard Preview</div>
                    </div>
                    <div className="p-8 space-y-8">
                       <div className="flex items-end gap-2 h-32">
                          {[40, 60, 45, 90, 65, 80, 50, 95, 75, 85].map((h, i) => (
                             <div key={i} className="flex-1 bg-cta/20 rounded-t-sm hover:bg-cta/40 transition-all cursor-pointer" style={{ height: `${h}%` }} />
                          ))}
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-sidebar/50 border border-border/5 space-y-2">
                             <div className="flex items-center gap-2 text-xs font-bold text-muted tracking-tight">
                                <TrendingUp className="w-3.5 h-3.5 text-cta" /> Ranking Keywords
                             </div>
                             <div className="text-2xl font-black text-foreground">2.4k</div>
                          </div>
                          <div className="p-4 rounded-xl bg-sidebar/50 border border-border/5 space-y-2">
                             <div className="flex items-center gap-2 text-xs font-bold text-muted tracking-tight">
                                <BarChart3 className="w-3.5 h-3.5 text-cta" /> Marketing Insight
                             </div>
                             <div className="text-xs text-cta-foreground bg-cta px-2 py-0.5 rounded-full w-fit font-bold">Positive</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Marketing Features Grid */}
        <section id="marketing" className="px-6 py-32 bg-background">
          <div className="max-w-6xl mx-auto space-y-20">
             <div className="text-center space-y-6 max-w-2xl mx-auto">
                <h2 className="text-5xl font-black font-display tracking-tight text-foreground">
                  Everything you need to ship faster.
                </h2>
                <p className="text-muted text-lg font-medium leading-relaxed">
                  The world's most detailed knowledge base, equipped with tools that actually work.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard 
                  icon={Zap} 
                  title="Blazingly Fast" 
                  description="Optimized with sub-millisecond real-time synchronization so your team never lags."
                />
                <FeatureCard 
                  icon={Layers} 
                  title="Highly Organized" 
                  description="A recursive sidebar that stays clean even as your project scales to thousands of nodes."
                />
                <FeatureCard 
                  icon={Layout} 
                  title="Block-based Editor" 
                  description="Compose complex documents instantly using our intuitive slash-command block system."
                />
             </div>
          </div>
        </section>

        {/* Final CTA Footer */}
        <section className="px-6 py-40 border-t border-border/5 relative overflow-hidden flex flex-col items-center text-center">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cta/5 via-transparent to-transparent -z-10" />
           <h2 className="text-6xl font-black font-display tracking-tight text-foreground mb-12">
             Start your journey today.
           </h2>
           <Link href="/signup">
             <button className="h-16 px-12 bg-foreground text-background text-xl font-bold rounded-2xl shadow-2xl transition-all hover:scale-[1.05] active:scale-[0.95] cursor-pointer">
               Unlock Your Second Brain
             </button>
           </Link>
           <p className="mt-8 text-sm text-muted font-medium flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cta" /> Free trial</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cta" /> Personal workspace</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-cta" /> Advanced search</span>
           </p>
        </section>

      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-border/5 bg-sidebar/10 space-y-6 hover:border-cta/20 hover:bg-sidebar/20 transition-all group">
       <div className="w-12 h-12 bg-cta/10 rounded-xl flex items-center justify-center text-cta group-hover:bg-cta group-hover:text-cta-foreground transition-all">
          <Icon className="w-6 h-6" />
       </div>
       <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted/80 font-medium leading-relaxed">{description}</p>
       </div>
    </div>
  )
}
