import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getUserBusinessesCached,
  getTreeNodesCached,
  getTeamspacesCached,
  getMemberRole,
} from "@/lib/data/queries";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace_slug: string }>;
}) {
  const { workspace_slug } = await params;
  // Independent lookups run in parallel; cached so the page below reuses them.
  const [user, initialBusinesses] = await Promise.all([
    getCurrentUser(),
    getUserBusinessesCached(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const activeBusiness = initialBusinesses.find(b => b.slug === workspace_slug) || initialBusinesses[0];

  // Tree, teamspaces and role only depend on the business — fetch together.
  const [initialNodes, initialTeamspaces, currentUserRole] = activeBusiness
    ? await Promise.all([
        getTreeNodesCached(activeBusiness.id),
        getTeamspacesCached(activeBusiness.id),
        getMemberRole(activeBusiness.id, user.id),
      ])
    : [[], [], 'VIEWER' as const];

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
