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
  Settings
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
  ADMIN: { label: 'Admin', icon: <Shield className="w-3.5 h-3.5" />, description: 'Full control' },
  EDITOR: { label: 'Editor', icon: <Edit3 className="w-3.5 h-3.5" />, description: 'Can edit' },
  VIEWER: { label: 'Viewer', icon: <Eye className="w-3.5 h-3.5" />, description: 'Read only' },
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

    startTransition(async () => {
      const result = await inviteMember(businessId, inviteEmail, inviteRole);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail('');
        loadData();
      }
    });
  };

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    startTransition(async () => {
      await updateMemberRole(memberId, role);
      loadData();
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    startTransition(async () => {
      await removeMember(memberId);
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
          <button className="flex items-center gap-2 w-full p-1.5 hover:bg-foreground/5 rounded-md transition-colors cursor-pointer outline-none text-sm">
            <Settings className="w-4 h-4 opacity-40 shrink-0" />
            <span className="opacity-70">Settings & Members</span>
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200 focus:outline-none overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[#37352f]">
                Settings & Members
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-0.5">
                Manage your <span className="font-medium text-[#37352f]">{businessName}</span> workspace
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

            {/* Invite Member Section */}
            {isAdmin && (
              <section>
                <h3 className="text-[13px] font-semibold text-[#37352f]/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Invite Member
                </h3>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#37352f]/20 bg-transparent text-[#37352f] placeholder:text-slate-400"
                    required
                  />
                  {/* Role Picker */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button type="button" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap text-[#37352f]">
                        {ROLE_CONFIG[inviteRole].icon}
                        {ROLE_CONFIG[inviteRole].label}
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="bg-white rounded-lg shadow-xl border border-slate-100 p-1 z-[100] w-40" sideOffset={4}>
                        {(Object.keys(ROLE_CONFIG) as MemberRole[]).map(role => (
                          <DropdownMenu.Item
                            key={role}
                            onSelect={() => setInviteRole(role)}
                            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-slate-50 outline-none text-[#37352f]"
                          >
                            {inviteRole === role && <Check className="w-3 h-3 text-emerald-500" />}
                            {inviteRole !== role && <span className="w-3" />}
                            {ROLE_CONFIG[role].icon}
                            <span>{ROLE_CONFIG[role].label}</span>
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  <button
                    type="submit"
                    disabled={isPending || !inviteEmail.trim()}
                    className="px-4 py-2 text-sm font-medium bg-[#37352f] text-white rounded-lg hover:bg-[#37352f]/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Invite
                  </button>
                </form>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                {success && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><Check className="w-3 h-3" />{success}</p>}
              </section>
            )}

            {/* Members List */}
            <section>
              <h3 className="text-[13px] font-semibold text-[#37352f]/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Members ({members.length})
              </h3>
              <div className="space-y-1">
                {members.map(member => {
                  const user = member.users;
                  const initials = (user?.full_name || user?.email || '?').substring(0, 2).toUpperCase();
                  return (
                    <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 group">
                      <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">
                            {initials}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-[#37352f]">{user?.full_name || user?.email}</div>
                          {user?.full_name && <div className="text-xs text-slate-400">{user.email}</div>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Role Badge / Changer */}
                        {isAdmin ? (
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-100 transition-colors text-[#37352f]/70 cursor-pointer">
                                {ROLE_CONFIG[member.role as MemberRole]?.icon}
                                {member.role}
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content className="bg-white rounded-lg shadow-xl border border-slate-100 p-1 z-[100] w-40" sideOffset={4}>
                                {(Object.keys(ROLE_CONFIG) as MemberRole[]).map(role => (
                                  <DropdownMenu.Item
                                    key={role}
                                    onSelect={() => handleRoleChange(member.id, role)}
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-slate-50 outline-none text-[#37352f]"
                                  >
                                    {member.role === role && <Check className="w-3 h-3 text-emerald-500" />}
                                    {member.role !== role && <span className="w-3" />}
                                    {ROLE_CONFIG[role].icon}
                                    <span>{ROLE_CONFIG[role].label}</span>
                                  </DropdownMenu.Item>
                                ))}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-slate-100 rounded-md text-[#37352f]/50">
                            {ROLE_CONFIG[member.role as MemberRole]?.icon}
                            {member.role}
                          </span>
                        )}

                        {/* Remove Member */}
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
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
                <h3 className="text-[13px] font-semibold text-[#37352f]/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Invitations ({invitations.length})
                </h3>
                <div className="space-y-1">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#37352f]/70">{inv.email}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">{inv.role}</span>
                            <span>· expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Revoke
                      </button>
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
