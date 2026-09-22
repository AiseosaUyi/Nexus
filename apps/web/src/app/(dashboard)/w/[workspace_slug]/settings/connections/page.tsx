import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  listApiTokens,
  listConnectedApps,
  getGruveIntegration,
  getPulseIntegration,
} from '../../connections-actions';
import ConnectionsClient from './ConnectionsClient';

interface ConnectionsPageProps {
  params: Promise<{ workspace_slug: string }>;
}

export default async function ConnectionsPage({ params }: ConnectionsPageProps) {
  const { workspace_slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase.from('businesses').select('id, name, slug').eq('slug', workspace_slug).single();
  if (!business) redirect(`/w/${workspace_slug}/settings`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('business_members')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle();
  // ADMIN-only page — a non-admin who navigates here directly is sent back
  // to the general settings page rather than shown a half-working screen.
  if (membership?.role !== 'ADMIN') redirect(`/w/${workspace_slug}/settings`);

  const [tokens, connectedApps, gruve, pulse] = await Promise.all([
    listApiTokens(business.id),
    listConnectedApps(business.id),
    getGruveIntegration(business.id),
    getPulseIntegration(business.id),
  ]);

  return (
    <ConnectionsClient
      businessId={business.id}
      businessSlug={business.slug}
      initialTokens={tokens.data ?? []}
      initialConnectedApps={connectedApps.data ?? []}
      initialGruve={gruve}
      initialPulse={pulse}
    />
  );
}
