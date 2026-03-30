import React from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Users, 
  Shield, 
  Globe, 
  Bell,
  Trash2,
  ChevronRight,
  Monitor,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsProps {
  params: Promise<{
    workspace_slug: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsProps) {
  const { workspace_slug } = await params;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto selection:bg-accent/30 custom-scrollbar">
      <div className="w-full max-w-3xl mx-auto px-12 py-20 pb-40">
        
        {/* Header Section */}
        <div className="space-y-2 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-2 text-muted mb-4 uppercase tracking-[0.15em] text-[10px] font-bold">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Workspace Settings</span>
          </div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">
            {workspace_slug.charAt(0).toUpperCase() + workspace_slug.slice(1)} Settings
          </h1>
          <p className="text-muted/60 text-[15px] font-medium leading-relaxed">
            Manage your workspace configuration, security, and team members.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          
          {/* General Section */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 border-b border-border/5 pb-4">
               <Globe className="w-4 h-4 text-muted/60" />
               <h3 className="text-sm font-bold text-foreground">General Configuration</h3>
             </div>
             <div className="space-y-4 pt-2">
                <SettingsField 
                  label="Workspace Name" 
                  value={workspace_slug.toUpperCase()} 
                  description="This is your public name seen by all members."
                />
                <SettingsField 
                  label="Workspace URL" 
                  value={`nexus-app.com/w/${workspace_slug}`} 
                  description="Your unique workspace identifier."
                  isImmutable
                />
             </div>
          </section>

          {/* Members Section */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 border-b border-border/5 pb-4">
               <Users className="w-4 h-4 text-muted/60" />
               <h3 className="text-sm font-bold text-foreground">Team Management</h3>
             </div>
             <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-4 rounded-xl bg-sidebar/30 border border-border/10 hover:bg-sidebar/50 transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-cta/10 rounded-full flex items-center justify-center text-cta font-bold">A</div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-foreground">Aise Idahor</span>
                         <span className="text-[11px] text-muted">Owner (You)</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-full bg-cta/5 border border-cta/10 text-cta text-[10px] font-black uppercase tracking-widest">Admin</span>
                      <ChevronRight className="w-4 h-4 text-muted/20" />
                   </div>
                </div>
                <button className="w-full py-3 rounded-xl border border-dashed border-border/20 text-muted/50 text-[13px] font-bold hover:border-cta/30 hover:text-cta transition-all cursor-pointer">
                  + Invite Team Member
                </button>
             </div>
          </section>

          {/* Security / Dangerous Section */}
          <section className="space-y-6 pt-10">
             <div className="flex items-center gap-2 text-red-500/50 border-b border-red-500/5 pb-4">
               <Shield className="w-4 h-4" />
               <h3 className="text-sm font-bold">Danger Zone</h3>
             </div>
             <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-4">
                <div className="flex items-start justify-between">
                   <div className="space-y-1">
                      <h4 className="text-sm font-bold text-red-500/80">Delete Workspace</h4>
                      <p className="text-xs text-red-500/40 max-w-md">Once deleted, all your documents, blocks, and settings will be permanently removed. This action cannot be undone.</p>
                   </div>
                   <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer border border-red-500/20">
                      Delete Forever
                   </button>
                </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, value, description, isImmutable }: { label: string; value: string; description: string; isImmutable?: boolean }) {
  return (
    <div className="flex flex-col gap-2 group">
       <label className="text-[12px] font-bold text-muted ml-0.5">{label}</label>
       <div className="relative">
          <input 
            type="text" 
            readOnly={isImmutable}
            value={value}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl border bg-sidebar/20 text-foreground transition-all outline-none text-[15px] font-medium",
              isImmutable ? "border-border/5 opacity-50 cursor-not-allowed" : "border-border/10 focus:border-cta focus:ring-4 focus:ring-cta/5"
            )}
          />
          {!isImmutable && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-cta opacity-0 group-hover:opacity-100 transition-opacity">Edit</div>}
       </div>
       <p className="text-[11px] text-muted/40 ml-0.5">{description}</p>
    </div>
  );
}
