import { redirect } from 'next/navigation';
import { getUserBusinesses } from '@/app/(auth)/actions';
import { getCommandCenter } from '../command-actions';
import CommandCenter from '@/components/dashboard/CommandCenter';

export default async function CommandCenterPage({
  params,
}: {
  params: Promise<{ workspace_slug: string }>;
}) {
  const { workspace_slug } = await params;
  const businesses = await getUserBusinesses();
  const activeBusiness = businesses.find((b: any) => b.slug === workspace_slug);
  if (!activeBusiness) redirect('/');

  const { opportunities, health, log } = await getCommandCenter(activeBusiness.id);

  return (
    <CommandCenter
      businessId={activeBusiness.id}
      workspaceSlug={workspace_slug}
      initialOpportunities={opportunities}
      initialHealth={health}
      initialLog={log}
    />
  );
}
