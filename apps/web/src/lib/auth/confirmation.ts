import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSignupConfirmationEmail } from '@/lib/email';

/**
 * Email confirmation via our own Brevo sender (not Supabase's mailer).
 *
 * We ask GoTrue's admin API for a one-time token (generateLink never sends
 * mail itself), then email a link to OUR /auth/confirm page carrying the
 * hashed token. That page verifies it with verifyOtp() on an explicit button
 * press — not on GET — so email security scanners that pre-open links can't
 * burn the token before the user clicks.
 */

export type ConfirmationKind = 'signup' | 'resend';

/** OTP types /auth/confirm accepts. 'signup' for new accounts; 'magiclink'
 * for resends to an existing unconfirmed account (verifying it confirms the email). */
export const CONFIRM_OTP_TYPES = ['signup', 'magiclink'] as const;
export type ConfirmOtpType = (typeof CONFIRM_OTP_TYPES)[number];

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Same-origin relative paths only (rejects "//evil.com" and absolute URLs). */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}

export function buildConfirmUrl(tokenHash: string, type: ConfirmOtpType, next = '/dashboard'): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: safeNextPath(next) });
  return `${appUrl()}/auth/confirm?${params.toString()}`;
}

export type SendConfirmationResult =
  | { ok: true }
  | { ok: false; reason: 'email_exists' | 'link_failed' | 'send_failed'; detail?: string };

export async function sendConfirmation(
  admin: SupabaseClient,
  opts: { kind: ConfirmationKind; email: string; password?: string; fullName?: string; next?: string },
): Promise<SendConfirmationResult> {
  const { kind, email, password, fullName } = opts;

  const { data, error } =
    kind === 'signup'
      ? await admin.auth.admin.generateLink({
          type: 'signup',
          email,
          password: password ?? '',
          options: { data: fullName ? { full_name: fullName } : undefined },
        })
      : await admin.auth.admin.generateLink({ type: 'magiclink', email });

  if (error || !data?.properties?.hashed_token) {
    const code = (error as { code?: string } | null)?.code;
    const message = error?.message ?? '';
    if (code === 'email_exists' || /already (been )?registered|already exists/i.test(message)) {
      return { ok: false, reason: 'email_exists' };
    }
    return { ok: false, reason: 'link_failed', detail: message || 'no token returned' };
  }

  if (kind === 'signup' && data.user?.email_confirmed_at) {
    // GoTrue only pre-confirms when the project's "Confirm email" setting is
    // OFF — then users can sign in without clicking the link.
    console.error(
      '[auth] Supabase auto-confirmed a new signup. Turn ON "Confirm email" in Supabase → Authentication → Sign In / Providers → Email, or email verification is not enforced.',
    );
  }

  const url = buildConfirmUrl(
    data.properties.hashed_token,
    kind === 'signup' ? 'signup' : 'magiclink',
    opts.next,
  );
  const sent = await sendSignupConfirmationEmail({ to: email, name: fullName, confirmUrl: url });
  if ('error' in sent) return { ok: false, reason: 'send_failed', detail: sent.error };
  return { ok: true };
}
