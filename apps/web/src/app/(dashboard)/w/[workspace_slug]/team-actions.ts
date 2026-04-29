'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── Workspace Actions ─────────────────────────────────────────────────────────

/**
 * Updates an existing workspace's name and/or slug.
 * Only the workspace ADMIN can perform this action (enforced by RLS).
 */
export async function updateWorkspace(businessId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  if (!name?.trim() || !slug?.trim()) return { error: 'Name and slug are required' };

  const { error } = await supabase
    .from('businesses')
    .update({ name: name.trim(), slug: slug.trim().toLowerCase() })
    .eq('id', businessId);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: true };
}

// ─── Member Management Actions ─────────────────────────────────────────────────

/**
 * Fetches all members for a business workspace.
 */
export async function getWorkspaceMembers(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_members')
    .select(`
      id,
      role,
      joined_at,
      users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('business_id', businessId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[BACKEND] Error fetching workspace members:', error);
    return [];
  }

  return data as any[];
}

/**
 * Updates a member's role in a workspace.
 * Only ADMINs can change roles (enforced by RLS).
 */
export async function updateMemberRole(memberId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_members')
    .update({ role })
    .eq('id', memberId)
    .select();

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'Could not update role — only admins can change member roles.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Removes a member from a workspace.
 * Only ADMINs can remove members (enforced by RLS).
 */
export async function removeMember(memberId: string) {
  const supabase = await createClient();

  // .select() forces PostgREST to return the deleted rows, so we can detect
  // when RLS silently blocks the delete (0 rows back, no error). Without this
  // the action used to return {success: true} on a denied delete.
  const { data, error } = await supabase
    .from('business_members')
    .delete()
    .eq('id', memberId)
    .select();

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'Could not remove member — only admins can remove members.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// ─── Invitation Actions ────────────────────────────────────────────────────────

/**
 * Fetches all pending (un-accepted) invitations for a workspace.
 */
export async function getWorkspaceInvitations(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('business_id', businessId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BACKEND] Error fetching invitations:', error);
    return [];
  }

  return data;
}

/**
 * Invites a new member to a workspace by email with a given role.
 */
export async function inviteMember(
  businessId: string,
  email: string,
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' = 'EDITOR'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (!email?.trim()) return { error: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { error: 'Please enter a valid email address' };

  const normalizedEmail = email.trim().toLowerCase();

  // If the email already belongs to an active member of this workspace, block
  // the invite with a clearer message. Otherwise the unique-constraint error
  // below would surface as "already invited" even when they're already in.
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', existingUser.id)
      .maybeSingle();

    if (existingMember) {
      return { error: 'This person is already a member of this workspace.' };
    }
  }

  // Clear any stale invitation row for this (business_id, email). The unique
  // constraint persists across accepted/revoked invites, so without this a
  // re-invite after removing a member silently 23505's.
  await supabase
    .from('invitations')
    .delete()
    .eq('business_id', businessId)
    .eq('email', normalizedEmail);

  const { data, error } = await supabase
    .from('invitations')
    .insert([{
      business_id: businessId,
      email: normalizedEmail,
      role,
      invited_by: user.id,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'This email has already been invited.' };
    return { error: error.message };
  }

  // Send invitation email via Resend
  try {
    const { sendTeamInviteEmail } = await import('@/lib/email');

    // Fetch workspace name and inviter name
    const { data: business } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    const inviterName = user.user_metadata?.full_name || user.email || 'Someone';
    const workspaceName = business?.name || 'a workspace';

    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${data.token}`;

    await sendTeamInviteEmail({
      to: email.trim().toLowerCase(),
      inviterName,
      workspaceName,
      role,
      acceptUrl,
    });
  } catch (emailErr) {
    console.error('[BACKEND] Email send failed (invite still created):', emailErr);
  }

  console.log(`[BACKEND] Invitation created for ${email} | token: ${data.token}`);

  revalidatePath('/', 'layout');
  return { success: true, token: data.token };
}

/**
 * Revokes (deletes) a pending invitation.
 */
export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Accepts an invitation using its token.
 * Uses the SECURITY DEFINER PostgreSQL function for safe atomic acceptance.
 */
export async function acceptInvitation(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };

  revalidatePath('/', 'layout');
  return { success: true, businessId: data.business_id };
}
