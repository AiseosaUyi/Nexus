import { redirect } from 'next/navigation';
import { getUserBusinesses } from '@/app/(auth)/actions';
import { getTeamspaces, getCalendarEntries } from '../actions';
import ContentCalendar from '@/components/dashboard/ContentCalendar';

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ workspace_slug: string }>;
}) {
  const { workspace_slug } = await params;
  const businesses = await getUserBusinesses();
  const activeBusiness = businesses.find((b: any) => b.slug === workspace_slug);
  if (!activeBusiness) redirect('/');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const [teamspaces, { data: initialEntries }] = await Promise.all([
    getTeamspaces(activeBusiness.id),
    getCalendarEntries(activeBusiness.id, year, month),
  ]);

  return (
    <ContentCalendar
      businessId={activeBusiness.id}
      workspaceSlug={workspace_slug}
      teamspaces={teamspaces}
      initialEntries={initialEntries ?? []}
      initialYear={year}
      initialMonth={month}
    />
  );
}
