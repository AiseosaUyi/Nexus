'use client';

// Four vertical sections (API tokens, connected apps, Gruve, Pulse),
// matching the existing settings page's own convention (settings/page.tsx
// is a column of full-width <section>s, not a card grid — the design
// review's Pass 1 finding was that "4 cards" would have introduced an
// unjustified new pattern for this codebase).

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Key, Link2, Zap, Radio, Loader2, Check, Copy, X, AlertTriangle, Trash2 } from 'lucide-react';
import {
  mintApiTokenAction,
  revokeApiTokenAction,
  revokeConnectedApp,
  saveGruveIntegration,
  disconnectGruve,
  savePulseIntegration,
} from '../../connections-actions';
import { MCP_SCOPE_GROUPS } from '@/lib/mcp/scopes';

type ApiToken = { id: string; name: string; token_prefix: string; scopes: string; last_used_at: string | null; revoked_at: string | null };
type ConnectedApp = { clientId: string; clientName: string; scopes: string[]; createdAt: string };
type GruveState = { connected: false } | { connected: true; baseUrl: string | null };
type PulseState = { connected: false } | { connected: true; tenantSlug: string; baseUrl: string };

interface Props {
  businessId: string;
  businessSlug: string;
  initialTokens: ApiToken[];
  initialConnectedApps: ConnectedApp[];
  initialGruve: GruveState;
  initialPulse: PulseState;
}

// ─── Small shared pieces ────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: typeof Key; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/5 pb-4">
      <Icon className="w-4 h-4 text-muted/60" />
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-[13px] text-muted/60">{message}</p>
      <button
        onClick={onAction}
        className="w-full py-3 rounded-xl border border-dashed border-border/20 text-muted/50 text-[13px] font-bold hover:border-cta/30 hover:text-cta transition-all cursor-pointer"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** Built on the @radix-ui/react-dialog already used by TeamSettingsModal —
 * no new dependency for something this codebase has never needed a
 * confirmation pattern for before. Requires an explicit typed confirmation
 * for a destructive, immediate-effect action (revoke/disconnect). */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <Dialog.Title className="text-sm font-bold text-foreground">{title}</Dialog.Title>
              <Dialog.Description className="text-[13px] text-muted mt-1">{description}</Dialog.Description>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-2">
            <Dialog.Close asChild>
              <button className="px-3 py-2 text-[13px] font-bold text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={pending}
              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[13px] font-black rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function ConnectionsClient({ businessId, initialTokens, initialConnectedApps, initialGruve, initialPulse }: Props) {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto selection:bg-accent/30 custom-scrollbar">
      <div className="w-full max-w-3xl mx-auto px-12 py-20 pb-40 space-y-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Connections</h1>
          <p className="text-muted/60 text-[15px] font-medium leading-relaxed">
            API tokens, connected apps, and integrations for the Nexus Brain MCP.
          </p>
        </div>

        <ApiTokensSection businessId={businessId} initialTokens={initialTokens} />
        <ConnectedAppsSection businessId={businessId} initialApps={initialConnectedApps} />
        <GruveSection businessId={businessId} initial={initialGruve} />
        <PulseSection businessId={businessId} initial={initialPulse} />
      </div>
    </div>
  );
}

// ─── API tokens ─────────────────────────────────────────────────────────────

function ApiTokensSection({ businessId, initialTokens }: { businessId: string; initialTokens: ApiToken[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['memory:read', 'memory:write', 'docs:read', 'calendar:read', 'command:read', 'gruve:read']);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiToken | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleScope = (scope: string) =>
    setSelectedScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  const handleMint = () => {
    setError(null);
    startTransition(async () => {
      const result = await mintApiTokenAction(businessId, name, selectedScopes);
      if ('error' in result) {
        setError(result.error!);
        return;
      }
      setMintedToken(result.token!);
      setCopied(false);
      setAcknowledged(false);
      setShowForm(false);
      setName('');
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    startTransition(async () => {
      const result = await revokeApiTokenAction(businessId, revokeTarget.id);
      if (!('error' in result)) {
        setTokens((prev) => prev.map((t) => (t.id === revokeTarget.id ? { ...t, revoked_at: new Date().toISOString() } : t)));
      }
      setRevokeTarget(null);
    });
  };

  return (
    <section className="space-y-6">
      <SectionHeader icon={Key} title="API Tokens" />

      {/* One-time reveal — distinct warning treatment, not the neutral
          invite-link box: this value is non-recoverable, unlike an invite
          link, so it needs its own designed state (Design Principle 1). */}
      {mintedToken && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2 text-amber-500 text-[11px] font-black uppercase tracking-widest">
            <AlertTriangle className="w-3.5 h-3.5" />
            You won't see this again — copy it now
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background border border-border">
            <code className="text-xs text-foreground/80 truncate flex-1 select-all font-mono">{mintedToken}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(mintedToken);
                setCopied(true);
              }}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-md bg-cta text-cta-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
            </button>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-foreground/70 cursor-pointer">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="accent-cta w-3.5 h-3.5" />
            I've saved this token somewhere safe
          </label>
          <button
            type="button"
            disabled={!acknowledged}
            onClick={() => setMintedToken(null)}
            className="w-full py-2 text-[12px] font-bold rounded-lg bg-foreground/5 text-foreground/70 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/10 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      <div className="space-y-2">
        {tokens.filter((t) => !t.revoked_at).map((token) => (
          <div key={token.id} className="flex items-center justify-between p-4 rounded-xl bg-sidebar/30 border border-border/10">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-bold text-foreground">{token.name}</span>
              <span className="text-[11px] text-muted font-mono">{token.token_prefix}…</span>
              <span className="text-[10px] text-muted/60">
                {token.last_used_at ? `Last used ${new Date(token.last_used_at).toLocaleDateString()}` : 'Never used'}
              </span>
            </div>
            <button
              onClick={() => setRevokeTarget(token)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Revoke
            </button>
          </div>
        ))}

        {tokens.filter((t) => !t.revoked_at).length === 0 && !showForm && (
          <EmptyState
            message="No API tokens yet — mint one to connect a non-interactive agent by URL and bearer header."
            actionLabel="+ Mint a token"
            onAction={() => setShowForm(true)}
          />
        )}

        {!showForm && tokens.filter((t) => !t.revoked_at).length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-xl border border-dashed border-border/20 text-muted/50 text-[13px] font-bold hover:border-cta/30 hover:text-cta transition-all cursor-pointer"
          >
            + Mint a token
          </button>
        )}

        {showForm && (
          <div className="p-4 rounded-xl bg-sidebar/30 border border-border/10 space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scheduled agent"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
            />
            <div className="grid grid-cols-2 gap-2">
              {MCP_SCOPE_GROUPS.flatMap((g) => g.scopes).map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-[12px] text-foreground/70 cursor-pointer">
                  <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} className="accent-cta w-3.5 h-3.5" />
                  {scope}
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-[13px] font-bold text-muted hover:text-foreground rounded-lg cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleMint}
                disabled={isPending || !name.trim()}
                className="px-4 py-2.5 bg-cta text-cta-foreground text-[13px] font-bold rounded-lg disabled:opacity-50 transition-opacity flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Mint token
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name}"?`}
        description="Any agent using this token will lose access immediately. This can't be undone."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        pending={isPending}
      />
    </section>
  );
}

// ─── Connected apps ─────────────────────────────────────────────────────────

function ConnectedAppsSection({ businessId, initialApps }: { businessId: string; initialApps: ConnectedApp[] }) {
  const [apps, setApps] = useState(initialApps);
  const [revokeTarget, setRevokeTarget] = useState<ConnectedApp | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    if (!revokeTarget) return;
    startTransition(async () => {
      const result = await revokeConnectedApp(businessId, revokeTarget.clientId);
      if (!('error' in result)) {
        setApps((prev) => prev.filter((a) => a.clientId !== revokeTarget.clientId));
      }
      setRevokeTarget(null);
    });
  };

  return (
    <section className="space-y-6">
      <SectionHeader icon={Link2} title="Connected Apps" />
      <div className="space-y-2">
        {apps.map((app) => (
          <div key={app.clientId} className="flex items-center justify-between p-4 rounded-xl bg-sidebar/30 border border-border/10">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-bold text-foreground">{app.clientName}</span>
              <span className="text-[10px] text-muted/60">
                {app.scopes.length} scope{app.scopes.length === 1 ? '' : 's'} · connected {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => setRevokeTarget(app)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              <X className="w-3.5 h-3.5" />
              Revoke
            </button>
          </div>
        ))}
        {apps.length === 0 && (
          <p className="text-[13px] text-muted/60 py-2">
            No apps connected yet — connect one via OAuth (e.g. "Add custom connector" in Cowork) to see it here.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.clientName}"?`}
        description="This app will immediately lose access to this workspace. This can't be undone."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        pending={isPending}
      />
    </section>
  );
}

// ─── Gruve ───────────────────────────────────────────────────────────────────

const GRUVE_BASE_URLS = {
  production: 'https://secure.gruve.events',
  staging: 'https://backend.gruve.events',
} as const;

function GruveSection({ businessId, initial }: { businessId: string; initial: GruveState }) {
  const [state, setState] = useState(initial);
  const [envChoice, setEnvChoice] = useState<'production' | 'staging' | 'custom'>('production');
  const [customUrl, setCustomUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [isPending, startTransition] = useTransition();

  const resolvedBaseUrl = envChoice === 'custom' ? customUrl : GRUVE_BASE_URLS[envChoice];

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveGruveIntegration(businessId, resolvedBaseUrl, apiKey);
      if ('error' in result) {
        setError(result.error!);
        return;
      }
      setState({ connected: true, baseUrl: resolvedBaseUrl });
      setApiKey('');
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      await disconnectGruve(businessId);
      setState({ connected: false });
      setConfirmDisconnect(false);
    });
  };

  return (
    <section className="space-y-6">
      <SectionHeader icon={Zap} title="Gruve" />
      {state.connected ? (
        <div className="flex items-center justify-between p-4 rounded-xl bg-sidebar/30 border border-border/10">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
            <span className="text-[11px] text-muted">{state.baseUrl}</span>
          </div>
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="px-3 py-2 text-[11px] font-bold text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer min-h-[44px]"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-sidebar/30 border border-border/10 space-y-4">
          <p className="text-[13px] text-muted/60">Connect a Gruve partner API key to read events, tickets, and sales into memory.</p>
          <div className="flex gap-2">
            {(['production', 'staging', 'custom'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvChoice(env)}
                className={`px-3 py-2 text-[12px] font-bold rounded-lg border transition-colors cursor-pointer capitalize ${
                  envChoice === env ? 'bg-cta text-cta-foreground border-cta' : 'border-border text-foreground/70 hover:bg-hover'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
          {envChoice === 'custom' && (
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-gruve-instance.example.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
            />
          )}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gruve_live_..."
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40 font-mono"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSave}
            disabled={isPending || !apiKey.trim()}
            className="px-4 py-2.5 bg-cta text-cta-foreground text-[13px] font-bold rounded-lg disabled:opacity-50 transition-opacity flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPending ? 'Verifying…' : 'Save'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect Gruve?"
        description="nexus_gruve_* tools will stop working for this workspace until reconnected. This can't be undone."
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
        pending={isPending}
      />
    </section>
  );
}

// ─── Pulse ───────────────────────────────────────────────────────────────────

function PulseSection({ businessId, initial }: { businessId: string; initial: PulseState }) {
  const [tenantSlug, setTenantSlug] = useState(initial.connected ? initial.tenantSlug : '');
  const [baseUrl, setBaseUrl] = useState(initial.connected ? initial.baseUrl : '');
  const [saved, setSaved] = useState(initial.connected);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await savePulseIntegration(businessId, tenantSlug, baseUrl);
      if ('error' in result) {
        setError(result.error!);
        return;
      }
      setSaved(true);
    });
  };

  return (
    <section className="space-y-6">
      <SectionHeader icon={Radio} title="Pulse" />
      <div className="p-4 rounded-xl bg-sidebar/30 border border-border/10 space-y-4">
        <p className="text-[13px] text-muted/60">
          Store which Pulse tenant matches this workspace — Nexus never calls Pulse's API, this only shows up in nexus_whoami.
        </p>
        <input
          value={tenantSlug}
          onChange={(e) => {
            setTenantSlug(e.target.value);
            setSaved(false);
          }}
          placeholder="Pulse tenant slug"
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
        />
        <input
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://<pulse-domain> (optional)"
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={handleSave}
          disabled={isPending || !tenantSlug.trim()}
          className="px-4 py-2.5 bg-cta text-cta-foreground text-[13px] font-bold rounded-lg disabled:opacity-50 transition-opacity flex items-center gap-1.5 cursor-pointer min-h-[44px]"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saved ? <><Check className="w-3.5 h-3.5" />Saved</> : 'Save'}
        </button>
      </div>
    </section>
  );
}
