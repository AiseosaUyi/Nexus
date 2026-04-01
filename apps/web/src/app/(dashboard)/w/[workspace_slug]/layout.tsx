import { redirect } from "next/navigation";
import { getUserBusinesses } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { getUserNodes, getTeamspaces } from "./actions";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";

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
    <DashboardLayoutWrapper
      initialNodes={initialNodes}
      initialTeamspaces={initialTeamspaces}
      initialBusinesses={initialBusinesses}
      activeBusiness={activeBusiness}
      workspaceSlug={workspace_slug}
      currentUserRole={currentUserRole}
    >
      {children}
    </DashboardLayoutWrapper>
  );
}
