import React from 'react';
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  FileEdit, 
  PlusCircle,
  Sparkles,
  ChevronRight,
  User,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UpdatesProps {
  params: Promise<{
    workspace_slug: string;
  }>;
}

const ACTIVITIES = [
  {
    id: 1,
    type: 'create',
    user: 'Aise Idahor',
    title: 'Created a new document',
    target: 'Marketing Strategy 2026',
    time: '2m ago',
    icon: PlusCircle,
    color: 'text-cta',
    bg: 'bg-cta/10',
  },
  {
    id: 2,
    type: 'edit',
    user: 'Aise Idahor',
    title: 'Updated blocks in',
    target: 'Nexus Handbook',
    time: '12m ago',
    icon: FileEdit,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 3,
    type: 'ai',
    user: 'Nexus AI',
    title: 'Generated summary for',
    target: 'Internal Research',
    time: '1h ago',
    icon: Sparkles,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 4,
    type: 'comment',
    user: 'Aise Idahor',
    title: 'Left a comment on',
    target: 'Sprint Backlog',
    time: '3h ago',
    icon: MessageSquare,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  }
];

export default async function UpdatesPage({ params }: UpdatesProps) {
  const { workspace_slug } = await params;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto selection:bg-accent/30 custom-scrollbar">
      <div className="w-full max-w-3xl mx-auto px-12 py-20 pb-40">
        
        {/* Header Section */}
        <div className="space-y-2 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-2 text-muted mb-4 uppercase tracking-[0.15em] text-[10px] font-bold">
            <Bell className="w-3.5 h-3.5" />
            <span>Activity Feed</span>
          </div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">
            Updates & Activity
          </h1>
          <p className="text-muted/60 text-[15px] font-medium leading-relaxed">
            Stay in sync with your team. See what’s changed and what’s new in your workspace.
          </p>
        </div>

        {/* AI Summary Banner */}
        <div className="mb-12 p-6 rounded-2xl bg-linear-to-br from-purple-500/5 to-transparent border border-purple-500/10 flex items-center justify-between group cursor-pointer hover:border-purple-500/20 transition-all animate-in fade-in zoom-in-95 duration-1000 delay-200">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                 <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                 <h3 className="text-sm font-bold text-foreground">Nexus AI Morning Summary</h3>
                 <p className="text-[11px] text-muted font-medium">3 documents updated, 1 new member added today.</p>
              </div>
           </div>
           <ChevronRight className="w-5 h-5 text-muted/20 group-hover:text-purple-500 transition-colors" />
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
           {ACTIVITIES.map((activity, idx) => (
             <div key={activity.id} className="relative pl-10 pb-8 group last:pb-0">
                {/* Connector Line */}
                {idx !== ACTIVITIES.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-[1.5px] bg-border/10 group-hover:bg-border/20 transition-colors" />
                )}
                
                {/* Icon Circle */}
                <div className={cn("absolute left-0 top-1 w-10 h-10 rounded-full border border-background shadow-xs flex items-center justify-center z-10 transition-transform group-hover:scale-110", activity.bg, activity.color)}>
                   <activity.icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1 pt-1">
                   <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-foreground/80 group-hover:text-foreground">
                        {activity.user}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted/40 font-bold uppercase tracking-widest whitespace-nowrap ml-4">
                         <Clock className="w-3 h-3" /> {activity.time}
                      </div>
                   </div>
                   <p className="text-sm text-muted/60 leading-relaxed font-medium">
                      {activity.title} <span className="text-cta/60 font-black tracking-tight">{activity.target}</span>
                   </p>
                </div>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
}
