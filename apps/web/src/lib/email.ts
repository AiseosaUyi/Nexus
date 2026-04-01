import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Nexus <onboarding@resend.dev>';

// ─── Team Invite Email ──────────────────────────────────────────────────────

export async function sendTeamInviteEmail({
  to,
  inviterName,
  workspaceName,
  role,
  acceptUrl,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  acceptUrl: string;
}) {
  const roleLabel = role === 'ADMIN' ? 'Admin' : role === 'EDITOR' ? 'Member' : 'Guest';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${inviterName} invited you to ${workspaceName} on Nexus`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 32px;">
            <div style="width: 32px; height: 32px; background: #111; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">N</div>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">Join ${workspaceName} on Nexus</h1>
          <p style="font-size: 15px; color: #666; line-height: 1.6; margin: 0 0 24px;">
            <strong>${inviterName}</strong> has invited you to join as a <strong>${roleLabel}</strong>.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Accept Invitation
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px; line-height: 1.5;">
            This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send team invite:', error);
      return { error: error.message };
    }

    console.log('[Email] Team invite sent to', to, 'id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Exception sending team invite:', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

// ─── Page Share Email ────────────────────────────────────────────────────────

export async function sendPageShareEmail({
  to,
  inviterName,
  pageTitle,
  pageUrl,
}: {
  to: string;
  inviterName: string;
  pageTitle: string;
  pageUrl: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${inviterName} shared "${pageTitle}" with you on Nexus`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 32px;">
            <div style="width: 32px; height: 32px; background: #111; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">N</div>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #111; margin: 0 0 8px;">${inviterName} shared a page with you</h1>
          <p style="font-size: 15px; color: #666; line-height: 1.6; margin: 0 0 24px;">
            You've been given access to <strong>"${pageTitle}"</strong>.
          </p>
          <a href="${pageUrl}" style="display: inline-block; background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Open Page
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px; line-height: 1.5;">
            If you don't have a Nexus account, you'll be asked to sign up first.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send page share:', error);
      return { error: error.message };
    }

    console.log('[Email] Page share sent to', to, 'id:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[Email] Exception sending page share:', err);
    return { error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}
