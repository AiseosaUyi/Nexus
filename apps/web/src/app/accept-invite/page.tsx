import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitation } from '@/app/(dashboard)/w/[workspace_slug]/team-actions';

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params.token;
  
  if (!token) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login but keep the token to retry after login
    // This requires login to handle callbacks nicely, but for now we just redirect to login
    redirect(`/login?next=/accept-invite?token=${token}`);
  }

  const result = await acceptInvitation(token);

  if (result.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 border border-red-100">
          <h2 className="text-xl font-semibold text-[#37352f] mb-2">Invitation Error</h2>
          <p className="text-[#37352f]/70 mb-4">{result.error}</p>
          <a href="/dashboard" className="inline-block px-4 py-2 bg-[#37352f] text-white rounded-md hover:bg-[#37352f]/90 transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Find the workspace slug to redirect to
  const { data: business } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', result.businessId)
    .single();

  if (business?.slug) {
    redirect(`/w/${business.slug}/dashboard`);
  } else {
    redirect('/dashboard');
  }
}
