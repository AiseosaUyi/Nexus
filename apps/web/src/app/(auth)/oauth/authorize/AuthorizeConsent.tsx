'use client';

// Raw Tailwind JSX matching this codebase's existing conventions
// (TeamSettingsModal.tsx, login/page.tsx) — NOT Pulse's AuthorizeConsent.tsx,
// which is built on a shadcn-style Card/Button component layer
// (@/components/ui/card, @/components/ui/button) that doesn't exist here.
//
// Visual hierarchy, top to bottom: client name (h1) -> "Signed in as
// {email}" -> workspace picker (radio list, pre-selected when there's
// exactly one) -> explicit scope disclosure list -> Deny/Authorize. The
// workspace being granted access is the single most prominent element on
// the page, since this is a security decision, not a form.

import { useState } from 'react';
import { Shield, Check } from 'lucide-react';
import { approveAuthorization, denyAuthorization } from './actions';

interface EligibleBusiness {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  clientName: string;
  userEmail: string;
  eligibleBusinesses: EligibleBusiness[];
  scopeDescriptions: string[];
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export function AuthorizeConsent({
  clientName,
  userEmail,
  eligibleBusinesses,
  scopeDescriptions,
  clientId,
  redirectUri,
  scope,
  state,
  codeChallenge,
  codeChallengeMethod,
}: Props) {
  const [businessId, setBusinessId] = useState(eligibleBusinesses[0]?.id ?? '');

  const hiddenFields = (
    <>
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
      <input type="hidden" name="scope" value={scope} />
      {state && <input type="hidden" name="state" value={state} />}
      <input type="hidden" name="code_challenge" value={codeChallenge} />
      <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />
      <input type="hidden" name="business_id" value={businessId} />
    </>
  );

  if (eligibleBusinesses.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-black font-display tracking-tight text-foreground">Nothing to connect</h1>
        <p className="text-sm text-muted max-w-sm">
          {clientName} needs admin access to a Nexus workspace. {userEmail} isn't an admin of any workspace yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black font-display tracking-tight text-foreground">Connect {clientName}</h1>
        <p className="text-sm text-muted">Signed in as {userEmail}</p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {eligibleBusinesses.map((b) => (
          <label
            key={b.id}
            className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="business_picker"
                checked={businessId === b.id}
                onChange={() => setBusinessId(b.id)}
                className="accent-cta w-4 h-4"
                aria-label={`Grant access to ${b.name}`}
              />
              <span className="text-sm font-medium text-foreground">{b.name}</span>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cta/5 border border-cta/10 text-cta text-[10px] font-black uppercase tracking-widest">
              <Shield className="w-2.5 h-2.5" />
              Admin
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">This will be able to:</p>
        <ul className="space-y-1.5">
          {scopeDescriptions.map((desc) => (
            <li key={desc} className="flex items-start gap-2 text-sm text-foreground/80">
              <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" strokeWidth={2.5} />
              <span>{desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted/70">Until you revoke it from workspace settings.</p>
      </div>

      <div className="flex items-center gap-3">
        <form action={denyAuthorization} className="flex-1">
          {hiddenFields}
          <button
            type="submit"
            className="w-full py-3 px-4 border border-border text-foreground/70 text-sm font-bold rounded-lg hover:bg-hover transition-colors cursor-pointer"
          >
            Deny
          </button>
        </form>
        <form action={approveAuthorization} className="flex-1">
          {hiddenFields}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-cta hover:opacity-90 text-cta-foreground text-sm font-bold rounded-lg shadow-lg shadow-cta/20 transition-all cursor-pointer"
          >
            Authorize
          </button>
        </form>
      </div>
    </div>
  );
}
