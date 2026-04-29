'use client';

import React, { useState, useEffect, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  X,
  Users,
  Mail,
  ChevronDown,
  UserX,
  Shield,
  Eye,
  Edit3,
  Loader2,
  Check,
  Clock,
  Trash2,
  Settings,
  Link2,
  Copy
} from 'lucide-react';
import {
  getWorkspaceMembers,
  getWorkspaceInvitations,
  inviteMember,
  revokeInvitation,
  updateMemberRole,
  removeMember
} from '@/app/(dashboard)/w/[workspace_slug]/team-actions';

type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

const ROLE_CONFIG = {
  ADMIN: { label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, description: 'Full control, can invite and manage members' },
  EDITOR: { label: 'Member', icon: <Edit3 className="w-3.5 h-3.5" />, description: 'Can create, edit, and delete content' },
  VIEWER: { label: 'Guest', icon: <Eye className="w-3.5 h-3.5" />, description: 'View only, cannot edit' },
};

interface TeamSettingsModalProps {
  businessId: string;
  businessName: string;
  currentUserRole: MemberRole;
  trigger?: React.ReactNode;
}

export default function TeamSettingsModal({
  businessId,
  businessName,
  currentUserRole,
  trigger
}: TeamSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const loadData = async () => {
    const [memberData, inviteData] = await Promise.all([
      getWorkspaceMembers(businessId),
      isAdmin ? getWorkspaceInvitations(businessId) : Promise.resolve([]),
    ]);
    setMembers(memberData);
    setInvitations(inviteData);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError(null);
    setSuccess(null);
    setInviteLink(null);

    startTransition(async () => {
      const result = await inviteMember(businessId, inviteEmail.trim(), inviteRole);
      if (result.error) {
        setError(result.error);
      } else {
        const link = `${window.location.origin}/invite/${result.token}`;
        setSuccess(`Invitation created for ${inviteEmail}`);
        setInviteLink(link);
        setInviteEmail('');
        loadData();
      }
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, role);
      if (result.error) {
        setError(result.error);
      }
      loadData();
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    startTransition(async () => {
      const result = await removeMember(memberId);
      if (result.error) {
        setError(result.error);
      }
      loadData();
    });
  };

  const handleRevokeInvite = async (invitationId: string) => {
    startTransition(async () => {
      await revokeInvitation(invitationId);
      loadData();
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-hover rounded-md transition-colors cursor-pointer outline-none text-[14px] group">
            <Settings className="w-4 h-4 text-foreground/40 group-hover:text-foreground shrink-0" strokeWidth={2} />
            <span className="text-foreground/70 group-hover:text-foreground font-medium">Settings & Members</span>
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200 focus:outline-none overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">
                Settings & Members
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted mt-0.5">
                Manage your <span className="font-medium text-foreground">{businessName}</span> workspace
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 hover:bg-hover rounded-lg transition-colors text-muted hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

            {/* Invite Member Section */}
            {isAdmin && (
              <section>
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Invite Member
                </h3>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-foreground/[0.04] text-foreground placeholder:text-muted/50 outline-none focus:border-accent/40"
                    required
                  />
                  {/* Role Picker */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-hover transition-colors whitespace-nowrap text-foreground/70 cursor-pointer">
                        {ROLE_CONFIG[inviteRole].icon}
                        {ROLE_CONFIG[inviteRole].label}
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="bg-background rounded-lg shadow-popover border border-border p-1 z-[100] w-52" sideOffset={4}>
                        {(Object.keys(ROLE_CONFIG) as MemberRole[]).map(role => (
                          <DropdownMenu.Item
                            key={role}
                            onSelect={() => setInviteRole(role)}
                            className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-md cursor-pointer hover:bg-hover outline-none text-foreground"
                          >
                            {inviteRole === role && <Check className="w-3 h-3 text-green-400" />}
                            {inviteRole !== role && <span className="w-3" />}
                            {ROLE_CONFIG[role].icon}
                            <div>
                              <div className="font-medium">{ROLE_CONFIG[role].label}</div>
                              <div className="text-[10px] text-muted">{ROLE_CONFIG[role].description}</div>
                            </div>
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  <button
                    type="submit"
                    disabled={isPending || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Invite
                  </button>
                </form>
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                {success && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>
                    {inviteLink && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-foreground/[0.04] border border-border">
                        <Link2 className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="text-xs text-foreground/70 truncate flex-1 select-all">{inviteLink}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(inviteLink, 'new-invite')}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer"
                        >
                          {copiedId === 'new-invite' ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy link</>}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-muted">Share this link with the invitee so they can join.</p>
                  </div>
                )}
              </section>
            )}

            {/* Members List */}
            <section>
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Members ({members.length})
              </h3>
              <div className="space-y-1">
                {members.map(member => {
                  const user = member.users;
                  const initials = (user?.full_name || user?.email || '?').substring(0, 2).toUpperCase();
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-hover group">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[11px] font-bold">
                            {initials}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">{user?.full_name || user?.email}</div>
                          {user?.full_name && <div className="text-xs text-muted">{user.email}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-md hover:bg-hover transition-colors text-foreground/70 cursor-pointer">
                                {ROLE_CONFIG[member.role as MemberRole]?.icon}
                                {ROLE_CONFIG[member.role as MemberRole]?.label}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="bg-background rounded-lg shadow-popover border border-border p-1 z-[100] w-52" sideOffset={4}>
                                {(Object.keys(ROLE_CONFIG) as MemberRole[]).map(role => (
                                  <DropdownMenu.Item
                                    key={role}
                                    onSelect={() => handleRoleChange(member.id, role)}
                                    className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-md cursor-pointer hover:bg-hover outline-none text-foreground"
                                  >
                                    {member.role === role && <Check className="w-3 h-3 text-green-400" />}
                                    {member.role !== role && <span className="w-3" />}
                                    {ROLE_CONFIG[role].icon}
                                    <div>
                                      <div className="font-medium">{ROLE_CONFIG[role].label}</div>
                                      <div className="text-[10px] text-muted">{ROLE_CONFIG[role].description}</div>
                                    </div>
                                  </DropdownMenu.Item>
                                ))}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-md text-muted">
                            {ROLE_CONFIG[member.role as MemberRole]?.icon}
                            {ROLE_CONFIG[member.role as MemberRole]?.label}
                          </span>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                            title="Remove member"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Pending Invitations */}
            {isAdmin && invitations.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Invitations ({invitations.length})
                </h3>
                <div className="space-y-1">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-hover group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-muted">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground/70">{inv.email}</div>
                          <div className="text-xs text-muted flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-medium">{ROLE_CONFIG[inv.role as MemberRole]?.label || inv.role}</span>
                            <span>· expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/invite/${inv.token}`, inv.id)}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-accent hover:bg-accent/10 rounded-md transition-all cursor-pointer"
                          title="Copy invite link"
                        >
                          {copiedId === inv.id ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></> : <><Link2 className="w-3 h-3" />Copy link</>}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
