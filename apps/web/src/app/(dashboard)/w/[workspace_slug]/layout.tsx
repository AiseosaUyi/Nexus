import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/app/(auth)/actions";
import BusinessSwitcher from "@/components/business/BusinessSwitcher";
import TeamSettingsModal from "@/components/business/TeamSettingsModal";
import { 
  Search, 
  Settings, 
  Clock, 
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserNodes } from "./actions";
import SidebarTree from "@/components/dashboard/SidebarTree";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace_slug: string }>;
}) {
  const { workspace_slug } = await params;
  const initialBusinesses = await getUserBusinesses();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const activeBusiness = initialBusinesses.find(b => b.slug === workspace_slug) || initialBusinesses[0];
  const initialNodes = activeBusiness ? await getUserNodes(activeBusiness.id) : [];

  // Fetch current user's role in the active workspace for RBAC
  let currentUserRole: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'VIEWER';
  if (activeBusiness) {
    const { data: memberData } = await supabase
      .from('business_members')
      .select('role')
      .eq('business_id', activeBusiness.id)
      .eq('user_id', user.id)
      .single();
    if (memberData) currentUserRole = memberData.role as any;
  }

  return (
    <div className="flex h-screen w-full bg-background text-[#37352f] font-sans selection:bg-[#2383e2]/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 h-full bg-[#fbfbfa] flex flex-col border-r border-[#37352f]/10 group/sidebar shrink-0">
        <BusinessSwitcher initialBusinesses={initialBusinesses} />

        {/* Action Links */}
        <div className="px-2 py-2 space-y-0.5">
          <button className="flex items-center justify-between w-full gap-2 p-1.5 hover:bg-foreground/5 rounded-md transition-colors cursor-pointer group outline-none text-sm">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 opacity-40 shrink-0" />
              <span className="opacity-70">Search</span>
            </div>
            <span className="text-[10px] opacity-20 group-hover:opacity-40 font-mono tracking-widest leading-none">⌘K</span>
          </button>
          
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-foreground/5 rounded-md transition-colors cursor-pointer outline-none text-sm">
            <Clock className="w-4 h-4 opacity-40 shrink-0" />
            <span className="opacity-70">Updates</span>
          </button>
          
          {activeBusiness && (
            <TeamSettingsModal
              businessId={activeBusiness.id}
              businessName={activeBusiness.name}
              currentUserRole={currentUserRole}
              trigger={
                <button className="flex items-center gap-2 w-full p-1.5 hover:bg-foreground/5 rounded-md transition-colors cursor-pointer outline-none text-sm">
                  <Settings className="w-4 h-4 opacity-40 shrink-0" />
                  <span className="opacity-70">Settings & Members</span>
                </button>
              }
            />
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar flex flex-col">
          <div className="mb-4">
            <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#37352f]/40 mb-1">Favorites</h4>
            <div className="space-y-0.5 opacity-50 italic text-xs px-2 py-2 select-none">
              No favorites yet
            </div>
          </div>

            <SidebarTree 
              initialNodes={initialNodes} 
              businessId={activeBusiness?.id} 
              workspaceSlug={workspace_slug} 
            />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto bg-white flex flex-col">
        {/* Top Header Bar */}
        <header className="h-11 flex items-center justify-between px-4 sticky top-0 bg-white/80 backdrop-blur-sm z-30 select-none">
          <div className="flex items-center gap-2 text-sm text-[#37352f]/60 truncate">
            <span className="truncate">{activeBusiness?.name}</span>
            <span className="opacity-40">/</span>
            <span className="font-medium text-[#37352f] truncate italic">Overview</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-[11px] font-medium">Edited just now</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-[13px] px-2 py-1 hover:bg-foreground/5 rounded-md transition-colors opacity-80 cursor-pointer">Share</button>
              <button className="text-[13px] px-2 py-1 hover:bg-foreground/5 rounded-md transition-colors opacity-80 cursor-pointer">
                <Clock className="w-4 h-4" />
              </button>
              <button className="text-[13px] px-2 py-1 hover:bg-foreground/5 rounded-md transition-colors opacity-80 cursor-pointer">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Actual Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
