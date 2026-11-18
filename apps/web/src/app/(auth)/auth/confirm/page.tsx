import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { confirmEmail } from '../../actions';
import { CONFIRM_OTP_TYPES, safeNextPath } from '@/lib/auth/confirmation';

export const metadata = { title: 'Confirm your email — Nexus' };

/**
 * Landing page for the link in the confirmation email. Verification happens
 * on the button press (a POST to the confirmEmail action), NOT on page load:
 * inbox link scanners (Outlook Safe Links, Gmail) open URLs automatically and
 * would otherwise consume the one-time token before the user ever clicks.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  const valid = !!token_hash && !!type && (CONFIRM_OTP_TYPES as readonly string[]).includes(type);

  if (!valid) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 text-center">
        <h1 className="text-2xl font-black font-display tracking-tight text-foreground">Link not valid</h1>
        <p className="text-sm text-muted">
          This confirmation link is incomplete. Sign in and we&apos;ll email you a fresh one.
        </p>
        <Link href="/login" className="inline-block text-sm font-bold text-foreground hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
        <MailCheck className="w-6 h-6 text-accent" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-black font-display tracking-tight text-foreground">Confirm your email</h1>
        <p className="text-sm text-muted">One click and your Nexus account is ready.</p>
      </div>
      <form action={confirmEmail}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={safeNextPath(next)} />
        <button
          type="submit"
          className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          Confirm my email
        </button>
      </form>
    </div>
  );
}
