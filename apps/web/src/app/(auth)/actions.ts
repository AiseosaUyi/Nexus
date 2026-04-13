'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const fullName = (formData.get('full_name') as string)?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirect(`/signup?error=${encodeURIComponent('Please enter a valid email address')}`);
  }
  if (!password || password.length < 6) {
    return redirect(`/signup?error=${encodeURIComponent('Password must be at least 6 characters')}`);
  }

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

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return redirect(`/login?error=${encodeURIComponent('Email and password are required')}`);
  }

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
  try {
    const supabase = await createClient();
    
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;
    const fullName = (formData.get('full_name') as string)?.trim();
    const token = formData.get('token') as string;
    const isExisting = formData.get('is_existing') === 'true';

    if (!email || !password || !token) {
      return { error: 'Missing required email, password, or invite token' };
    }

    // 1. Authenticate (Login or Signup)
    if (isExisting) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      // Self-healing: If login fails due to unconfirmed email, try to confirm it now (since we have the key)
      if (signInError?.message === 'Email not confirmed') {
        const { data: userCheck } = await supabase.from('users').select('id').eq('email', email).single();
        if (userCheck?.id) {
          const { createClient: createAdminClient } = await import('@supabase/supabase-js');
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

          if (serviceRoleKey && supabaseUrl) {
            const admin = createAdminClient(supabaseUrl, serviceRoleKey);
            await admin.auth.admin.updateUserById(userCheck.id, { email_confirm: true });
            // Retry sign-in
            const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
            if (retryError) return { error: retryError.message };
          } else {
            return { error: 'Your email is not confirmed. Please check your inbox or contact the workspace owner.' };
          }
        } else {
          return { error: 'Email not confirmed. Please check your inbox.' };
        }
      } else if (signInError) {
        return { error: signInError.message };
      }
    } else {
      if (!fullName) return { error: 'Please provide your full name to create an account' };
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (signUpError) return { error: signUpError.message };

      // Auto-confirm logic for new accounts if no session was returned
      if (!signUpData.session && signUpData.user) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
          return { error: 'Server configuration error: Missing API keys for auto-confirmation.' };
        }

        const admin = createAdminClient(supabaseUrl, serviceRoleKey);
        await admin.auth.admin.updateUserById(signUpData.user.id, { email_confirm: true });
        
        // Final sign-in to establish session
        const { error: finalSignInError } = await supabase.auth.signInWithPassword({ email, password });
        if (finalSignInError) return { error: 'Account created but could not sign in automatically: ' + finalSignInError.message };
      }
    }

    // 2. Accept the Invitation using the RPC
    const { data, error: inviteError } = await supabase.rpc('accept_invitation', { p_token: token });

    const inviteData = data as any;

    if (inviteError || inviteData?.error) {
      return { error: inviteError?.message || inviteData?.error || 'Could not join workspace with that token.' };
    }

    if (!inviteData?.business_id) {
      return { error: 'Invitation accepted but no workspace was returned.' };
    }

    // 3. Find the workspace slug for redirection
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('slug, name')
      .eq('id', inviteData.business_id)
      .single();

    if (businessError || !business) {
      return { error: 'Joined workspace but could not retrieve its details for redirection.' };
    }

    revalidatePath('/', 'layout');

    // Success!
    return { 
      success: true, 
      businessSlug: business.slug, 
      businessName: business.name 
    };
  } catch (err: any) {
    console.error('[CRITICAL] authenticateAndAcceptInvite crash:', err);
    return { error: 'An unexpected server error occurred. Please try again or contact support.' };
  }
}

