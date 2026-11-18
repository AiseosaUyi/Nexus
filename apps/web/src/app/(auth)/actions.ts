'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toUserError } from '@/lib/user-error';
import { createServiceClient } from '@/lib/supabase/service';
import { isEmailConfigured } from '@/lib/email';
import { sendConfirmation, safeNextPath, CONFIRM_OTP_TYPES, type ConfirmOtpType } from '@/lib/auth/confirmation';
import { checkConfirmationEmailRateLimit } from '@/lib/mcp/rate-limit';

/** Local dev without Brevo can't send mail; production must never skip verification. */
function canSkipEmailVerification(): boolean {
  return process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production' && !isEmailConfigured();
}

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

  const admin = createServiceClient();

  // Local dev without Brevo: there's no way to deliver a link, so create the
  // account pre-confirmed and sign straight in. Never in production.
  if (canSkipEmailVerification()) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError) {
      return redirect(`/signup?error=${encodeURIComponent(createError.message)}`);
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return redirect(`/signup?error=${encodeURIComponent(signInError.message)}`);
    revalidatePath('/', 'layout');
    return redirect('/dashboard');
  }

  // Create the account UNCONFIRMED and email a confirmation link through our
  // Brevo sender. Previously the account was auto-confirmed with the admin
  // API, so anyone could register (and receive shares/invites for) an email
  // address they don't own.
  const result = await sendConfirmation(admin, { kind: 'signup', email, password, fullName });

  if (!result.ok) {
    if (result.reason === 'email_exists') {
      return redirect(`/signup?error=${encodeURIComponent('An account with this email already exists. Sign in instead.')}`);
    }
    console.error('[signUp] confirmation failed:', result.reason, result.detail);
    return redirect(
      `/signup?error=${encodeURIComponent(
        result.reason === 'send_failed'
          ? 'Your account was created, but we couldn’t send the confirmation email. Sign in to get a new link.'
          : 'We couldn’t create your account right now. Please try again.',
      )}`,
    );
  }

  return redirect('/signup?sent=1');
}

/**
 * Confirms an email from the link in the confirmation email. Called by the
 * button on /auth/confirm (POST), never on page load — link scanners in
 * corporate inboxes pre-open URLs and would otherwise consume the token.
 */
export async function confirmEmail(formData: FormData) {
  const tokenHash = String(formData.get('token_hash') ?? '');
  const type = String(formData.get('type') ?? '') as ConfirmOtpType;
  const next = safeNextPath(String(formData.get('next') ?? ''));

  if (!tokenHash || !(CONFIRM_OTP_TYPES as readonly string[]).includes(type)) {
    return redirect(`/login?error=${encodeURIComponent('That confirmation link is invalid. Sign in to get a new one.')}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return redirect(
      `/login?error=${encodeURIComponent('That confirmation link has expired or was already used. Sign in to get a new one.')}`,
    );
  }

  revalidatePath('/', 'layout');
  return redirect(next);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const next = formData.get('next') as string | null;

  if (!email || !password) {
    return redirect(`/login?error=${encodeURIComponent('Email and password are required')}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // GoTrue only reports "not confirmed" after the password checks out, so
    // only the account's owner can trigger a resend.
    if ((error as { code?: string }).code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
      const limit = checkConfirmationEmailRateLimit(email);
      if (limit.ok) {
        const sent = await sendConfirmation(createServiceClient(), {
          kind: 'resend',
          email,
          next: safeNextPath(next),
        });
        if (!sent.ok) console.error('[signIn] resend confirmation failed:', sent.reason, sent.detail);
      }
      return redirect(`/login?notice=confirm-sent${next ? `&next=${encodeURIComponent(safeNextPath(next))}` : ''}`);
    }
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  // Only redirect to `next` when it's a same-origin relative path — must
  // reject "//attacker.com" too, which also starts with "/" but browsers
  // resolve as a full off-site redirect (protocol-relative URL).
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    redirect(next);
  }
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get('email') as string)?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirect(`/forgot-password?error=${encodeURIComponent('Please enter a valid email address')}`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
  });

  if (error) {
    return redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/forgot-password?success=${encodeURIComponent('Check your email for a reset link')}`);
}

export async function createBusiness(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();

  if (name.length < 1 || name.length > 80) {
    return { error: 'Workspace name must be between 1 and 80 characters.' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)) {
    return { error: 'Slug can only use lowercase letters, numbers and dashes (max 48).' };
  }

  // Insert WITHOUT .select(): INSERT ... RETURNING must also pass the SELECT
  // policy, and the owner's membership row is only created by the AFTER
  // INSERT trigger — so returning the row failed with an RLS error. Generate
  // the id here, insert, then read it back once the membership exists.
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('businesses')
    .insert([{ id, name, slug, owner_id: user.id }]);

  if (error) {
    console.error('[createBusiness] insert failed:', error);
    if (error.code === '23505') return { error: 'That workspace URL is already taken. Try another slug.' };
    return { error: toUserError(error, 'Couldn’t create the workspace. Please try again.') };
  }

  const { data, error: readError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (readError) {
    console.error('[createBusiness] read-back failed:', readError);
    // The workspace exists; return the minimum the client needs to navigate.
    revalidatePath('/', 'layout');
    return { data: { id, name, slug, owner_id: user.id } };
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

    // 0. The invite must be live AND addressed to this email. Holding a token
    // that was emailed to an address is our proof of owning that address, so
    // it's the only case where an account may be confirmed without clicking a
    // confirmation link. (Previously any unconfirmed account was confirmed
    // here before the invite was even checked.)
    const { data: inviteRows } = await supabase.rpc('get_invitation_by_token', { p_token: token });
    const invite = Array.isArray(inviteRows) ? inviteRows[0] : inviteRows;
    const inviteIsLive =
      !!invite && !invite.accepted_at && new Date(invite.expires_at).getTime() > Date.now();
    if (!inviteIsLive) {
      return { error: 'This invitation is invalid, expired, or already used.' };
    }
    if (String(invite.email).trim().toLowerCase() !== email) {
      return { error: 'This invitation was sent to a different email address. Use the invited email to accept it.' };
    }

    // 1. Authenticate (Login or Signup)
    if (isExisting) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError && ((signInError as { code?: string }).code === 'email_not_confirmed' || /email not confirmed/i.test(signInError.message))) {
        // Password already verified by GoTrue; the invite above proves the email.
        const admin = createServiceClient();
        const { data: userRow } = await admin.from('users').select('id').eq('email', email).maybeSingle();
        if (!userRow?.id) return { error: 'Your email is not confirmed. Please check your inbox.' };
        await admin.auth.admin.updateUserById(userRow.id, { email_confirm: true });
        const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
        if (retryError) return { error: retryError.message };
      } else if (signInError) {
        return { error: signInError.message };
      }
    } else {
      if (!fullName) return { error: 'Please provide your full name to create an account' };
      if (!password || password.length < 6) return { error: 'Password must be at least 6 characters' };

      // admin.createUser doesn't trigger Supabase's own confirmation mail.
      const admin = createServiceClient();
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError) {
        const exists = (createError as { code?: string }).code === 'email_exists' || /already (been )?registered|already exists/i.test(createError.message);
        return { error: exists ? 'An account with this email already exists. Sign in to accept the invitation.' : createError.message };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return { error: 'Account created but could not sign in automatically: ' + signInError.message };
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

