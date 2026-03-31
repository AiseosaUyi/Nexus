import { redirect } from 'next/navigation';
import { getUserBusinesses } from '@/app/(auth)/actions';
import { getUserNodes, getTeamspaces } from '../actions';
import WorkspaceDashboardClient from '@/components/dashboard/WorkspaceDashboardClient';

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspace_slug: string }>;
}) {
  const { workspace_slug } = await params;
  const businesses = await getUserBusinesses();
  const activeBusiness = businesses.find((b: any) => b.slug === workspace_slug);
  if (!activeBusiness) redirect('/');

  const [teamspaces, allNodes] = await Promise.all([
    getTeamspaces(activeBusiness.id),
    getUserNodes(activeBusiness.id),
  ]);

  const recentNodes = [...allNodes]
    .filter((n: any) => n.type === 'document')
    .sort(
      (a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 6);

  return (
    <WorkspaceDashboardClient
      businessId={activeBusiness.id}
      workspaceSlug={workspace_slug}
      teamspaces={teamspaces}
      recentNodes={recentNodes}
    />
  );
}
