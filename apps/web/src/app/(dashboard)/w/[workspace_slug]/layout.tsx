import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/app/(auth)/actions";
import BusinessSwitcher from "@/components/business/BusinessSwitcher";
import TeamSettingsModal from "@/components/business/TeamSettingsModal";
import { Search, Settings, Clock } from "lucide-react";
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
    <div className="flex h-screen w-full bg-background text-foreground font-sans selection:bg-accent/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 h-full bg-sidebar flex flex-col border-r border-border group/sidebar shrink-0 pb-4">
        <BusinessSwitcher initialBusinesses={initialBusinesses} />

        <div className="px-2 py-2 space-y-0.5">
          <button className="flex items-center justify-between w-full gap-2 p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer group outline-none text-[14px]">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-foreground/40 shrink-0 group-hover:text-foreground" strokeWidth={2} />
              <span className="text-foreground/70 group-hover:text-foreground font-medium">Search</span>
            </div>
            <span className="text-[10px] text-foreground/30 group-hover:text-foreground/60 font-mono tracking-widest leading-none">⌘K</span>
          </button>
          
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group">
            <Clock className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
            <span className="text-foreground/70 group-hover:text-foreground font-medium">Updates</span>
          </button>
          
          {activeBusiness && (
            <TeamSettingsModal
              businessId={activeBusiness.id}
              businessName={activeBusiness.name}
              currentUserRole={currentUserRole}
              trigger={
                <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group">
                  <Settings className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
                  <span className="text-foreground/70 group-hover:text-foreground font-medium">Settings & Members</span>
                </button>
              }
            />
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar flex flex-col">
          <div className="mb-4">
            <h4 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted mb-1">Favorites</h4>
            <div className="space-y-0.5 text-muted/60 italic text-xs px-2 py-2 select-none">
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
      <main className="flex-1 relative overflow-hidden bg-background flex flex-col">
        {children}
      </main>
    </div>
  );
}
