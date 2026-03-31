import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/app/(auth)/actions";
import BusinessSwitcher from "@/components/business/BusinessSwitcher";
import { createClient } from "@/lib/supabase/server";
import { getUserNodes, getTeamspaces } from "./actions";
import SidebarTree from "@/components/dashboard/SidebarTree";
import NavigationProgress from "@/components/dashboard/NavigationProgress";

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
  const initialTeamspaces = activeBusiness ? await getTeamspaces(activeBusiness.id) : [];

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
      <NavigationProgress />
      {/* Sidebar */}
      <aside className="w-64 h-full bg-sidebar flex flex-col border-r border-border group/sidebar shrink-0">
        <BusinessSwitcher initialBusinesses={initialBusinesses} />

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
          <SidebarTree
            initialNodes={initialNodes}
            initialTeamspaces={initialTeamspaces}
            businessId={activeBusiness?.id}
            businessName={activeBusiness?.name || "Workspace"}
            workspaceSlug={workspace_slug}
            currentUserRole={currentUserRole}
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
