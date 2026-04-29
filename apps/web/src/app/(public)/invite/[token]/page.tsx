import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AcceptInviteClient from './AcceptInviteClient';
import InviteAuthForm from './InviteAuthForm';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch invitation details securely using the token
  const { data, error } = await supabase
    .rpc('get_invitation_by_token', { p_token: token })
    .single();
    
  const invitation = data as any;

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (invitation.accepted_at) {
    // Already accepted — redirect to workspace
    redirect(`/w/${invitation.business_slug || 'dashboard'}/dashboard`);
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Expired</h1>
          <p className="text-muted">This invitation has expired. Ask the workspace owner to send a new one.</p>
        </div>
      </div>
    );
  }

  const roleLabel = invitation.role === 'ADMIN' ? 'Admin' : invitation.role === 'EDITOR' ? 'Member' : 'Guest';

  // If logged in, show accept button. If not, show the embedded Auth Form.
  if (!user) {
    // Pre-check user existence so the form can ask only for password (returning
    // user) or name + password (new user) — the email is already known from
    // the invitation, no reason to ask for it again.
    const { data: userExists } = await supabase.rpc('check_user_exists', {
      p_email: invitation.email,
    });

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center w-full max-w-sm mx-4">
          <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-foreground">N</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Join {invitation.business_name || 'a workspace'}
          </h1>
          <p className="text-[14px] text-muted mb-2">
            Hi <strong className="text-foreground">{invitation.email}</strong>,
          </p>
          <p className="text-[14px] text-muted mb-8">
            {userExists
              ? <>Sign in to join <strong>{invitation.business_name}</strong> as a <strong>{roleLabel}</strong>.</>
              : <>You've been invited to join <strong>{invitation.business_name}</strong> as a <strong>{roleLabel}</strong>. Set a password below.</>
            }
          </p>

          <InviteAuthForm
            token={token}
            email={invitation.email}
            businessName={invitation.business_name}
            isExisting={!!userExists}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.06] flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-bold text-foreground">N</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          Join {invitation.business_name || 'a workspace'}
        </h1>
        <p className="text-[14px] text-muted mb-6">
          You've been invited as a <strong>{roleLabel}</strong>.
        </p>
        <AcceptInviteClient token={token} workspaceSlug={invitation.business_slug} />
      </div>
    </div>
  );
}
