'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Auto-confirm user if email confirmation is enabled and no session was returned
  if (!data.session && data.user) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });

    // Sign them in now that they're confirmed
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return redirect(`/signup?error=${encodeURIComponent(signInError.message)}`);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  const { data, error } = await supabase
    .from('businesses')
    .insert([{ name, slug, owner_id: user.id }])
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { data };
}

export async function getUserBusinesses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('business_members')
    .select('businesses (*)')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
  return data.map((item: any) => item.businesses);
}


/**
 * Unified action to Login/Signup and Join a workspace in one motion.
 * Prevents forced personal workspace creation and drops user in the team workspace.
 */
export async function authenticateAndAcceptInvite(formData: FormData) {
  const supabase = await createClient();
  
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string; // Optional (only for signup)
  const token = formData.get('token') as string;
  const isExisting = formData.get('is_existing') === 'true';

  if (!email || !password || !token) {
    return { error: 'Missing required fields' };
  }

  // 1. Authenticate (Login or Signup)
  if (isExisting) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: signInError.message };
  } else {
    if (!fullName) return { error: 'Full name is required for new accounts' };
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) return { error: signUpError.message };

    // Auto-confirm if needed (mirroring existing logic)
    if (!signUpData.session && signUpData.user) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await admin.auth.admin.updateUserById(signUpData.user.id, { email_confirm: true });
      await supabase.auth.signInWithPassword({ email, password });
    }
  }

  // 2. Accept the Invitation using the RPC
  const { data: inviteData, error: inviteError } = await supabase.rpc('accept_invitation', { p_token: token });

  if (inviteError || inviteData?.error) {
    // If auth worked but invite failed (maybe expired while typing?), we still have an account.
    // We just return the error but they are logged in.
    return { error: inviteError?.message || inviteData?.error || 'Account created, but could not join workspace.' };
  }

  // 3. Find the workspace slug for redirection
  const { data: business } = await supabase
    .from('businesses')
    .select('slug, name')
    .eq('id', inviteData.business_id)
    .single();

  revalidatePath('/', 'layout');

  // Success!
  return { 
    success: true, 
    businessSlug: business?.slug, 
    businessName: business?.name 
  };
}

