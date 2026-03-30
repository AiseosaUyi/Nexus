"use client";

import { useState, useEffect } from "react";
import { FileText, FolderOpen, Calendar, Plus, ChevronRight, Search, Zap, ArrowRight, Clock, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const GREETING = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const QUICK_ACTIONS = [
  {
    icon: Plus,
    label: "New Page",
    description: "Start with a blank canvas",
    color: "text-blue-400",
    bg: "bg-blue-500/10 group-hover:bg-blue-500/20",
    href: "#",
  },
  {
    icon: Calendar,
    label: "Calendar",
    description: "Plan and schedule events",
    color: "text-amber-400",
    bg: "bg-amber-500/10 group-hover:bg-amber-500/20",
    href: "#",
  },
  {
    icon: FolderOpen,
    label: "Files",
    description: "Manage shared assets",
    color: "text-purple-400",
    bg: "bg-purple-500/10 group-hover:bg-purple-500/20",
    href: "#",
  },
  {
    icon: Search,
    label: "Search",
    description: "Find anything instantly",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
    href: "#",
  },
];

const RECENT_DOCS = [
  { title: "Product Roadmap Q2", icon: "📋", updated: "2 min ago", pinned: true },
  { title: "Team Meeting Notes", icon: "📝", updated: "1 hour ago", pinned: false },
  { title: "Design System v2", icon: "🎨", updated: "3 hours ago", pinned: false },
  { title: "Launch Checklist", icon: "✅", updated: "Yesterday", pinned: false },
  { title: "API Documentation", icon: "📚", updated: "2 days ago", pinned: false },
];

export default function WorkspaceDashboard() {
  const params = useParams();
  const workspaceSlug = params?.workspace_slug as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-8 py-16 space-y-14">

        {/* Hero Greeting */}
        <div
          className="space-y-2"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <p className="text-sm font-medium text-foreground/40 uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            {GREETING()} 👋
          </h1>
          <p className="text-foreground/55 text-base font-normal leading-relaxed max-w-lg">
            Your workspace is ready. Pick up where you left off or start something new.
          </p>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
          }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                className="group flex flex-col items-start gap-3 p-4 rounded-xl border border-border 
                  bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-foreground/15
                  transition-all duration-200 cursor-pointer text-left"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${action.bg}`}>
                  <action.icon className={`w-4 h-4 ${action.color}`} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{action.label}</div>
                  <div className="text-xs text-foreground/45 mt-0.5 leading-relaxed">{action.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border" />

        {/* Recent Documents */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
              Recently Visited
            </h2>
            <button className="flex items-center gap-1 text-xs font-medium text-foreground/45 hover:text-foreground transition-colors cursor-pointer">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {RECENT_DOCS.map((doc, i) => (
              <button
                key={doc.title}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg 
                  hover:bg-foreground/[0.05] transition-colors duration-150 cursor-pointer group"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.4s ease ${0.25 + i * 0.06}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base leading-none select-none">{doc.icon}</span>
                  <span className="text-sm font-medium text-foreground">{doc.title}</span>
                  {doc.pinned && (
                    <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      Pinned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground/35">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    {doc.updated}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tip Banner */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-foreground/[0.02] p-6"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s",
          }}
        >
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-5xl opacity-10 select-none">
            ⚡
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-blue-400" strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Pro Tip</p>
              <p className="text-sm text-foreground/55 leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/70 text-xs font-mono">⌘ K</kbd> anywhere to search across all your documents, settings, and pages instantly.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
