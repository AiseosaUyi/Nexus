// schema.ts
// Shared TypeScript types matching the Nexus database schema.
// These types are used across the monorepo for type-safe data access.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type MemberRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type NodeType = 'folder' | 'document' | 'calendar';

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'image'
  | 'video'
  | 'file'
  | 'embed'
  | 'divider'
  | 'code'
  | 'quote'
  | 'callout'
  | 'table';

export type CalendarStatus = 'draft' | 'scheduled' | 'published' | 'cancelled';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface Teamspace {
  id: string;
  business_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  position: number;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Node {
  id: string;
  business_id: string;
  parent_id: string | null;
  teamspace_id: string | null;
  type: NodeType;
  title: string;
  name: string | null;
  is_name_custom: boolean;
  icon: string | null;
  cover_url: string | null;
  position: number;
  is_archived: boolean;
  is_public: boolean;
  public_slug: string | null;
  yjs_snapshot: Uint8Array | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A node with its children pre-fetched for the sidebar tree. */
export interface NodeWithChildren extends Node {
  children: NodeWithChildren[];
}

export interface Block {
  id: string;
  node_id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Generic JSONB content payload for a block. */
export type BlockContent = Record<string, unknown>;

export interface Asset {
  id: string;
  business_id: string;
  node_id: string | null;
  file_url: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface CalendarEntry {
  id: string;
  node_id: string;
  business_id: string;
  publish_date: string | null;
  platform: string | null;
  status: CalendarStatus;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentThread {
  id: string;
  node_id: string;
  is_resolved: boolean;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  thread_id: string;
  user_id: string;
  content: Record<string, unknown>;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SharePermission = 'view' | 'comment' | 'edit' | 'full';
export type AccessRequestStatus = 'pending' | 'approved' | 'denied';

export interface NodeShare {
  id: string;
  node_id: string;
  email: string;
  permission: SharePermission;
  invited_by: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: string;
  node_id: string;
  requester_email: string;
  requester_name: string | null;
  status: AccessRequestStatus;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateBusinessPayload {
  name: string;
  slug: string;
}

export interface CreateNodePayload {
  business_id: string;
  parent_id?: string | null;
  teamspace_id?: string | null;
  type: NodeType;
  title?: string;
  icon?: string;
  position?: number;
}

export interface CreateBlockPayload {
  node_id: string;
  type: BlockType;
  content: BlockContent;
  position: number;
}

export interface UpdateBlockPayload {
  type?: BlockType;
  content?: BlockContent;
  position?: number;
}

export interface CreateCalendarEntryPayload {
  node_id: string;
  business_id: string;
  publish_date?: string;
  platform?: string;
  status?: CalendarStatus;
  notes?: string;
}

// ─── Command Center ───────────────────────────────────────────────────────────

export type OpportunityStatus =
  | 'new' | 'drafted' | 'approved' | 'sent' | 'rejected' | 'quarantined';
export type OpportunityType = 'message' | 'comment' | 'job' | 'invite';
export type PlatformKind = 'inbound' | 'content' | 'both';

export interface Opportunity {
  id: string;
  business_id: string;
  platform: string;
  type: OpportunityType;
  status: OpportunityStatus;
  contact: string | null;
  source_url: string | null;
  message: string | null;
  draft_reply: string | null;
  fit_score: number;
  scam_score: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

export type PlatformDifficulty = 'easy' | 'medium' | 'hard';

export type PlatformPotential = 'high' | 'very_high' | 'extremely_high';

export type PlatformOnboarding =
  | 'not_started'
  | 'profile_building'
  | 'applied'
  | 'screening'
  | 'active'
  | 'rejected'
  | 'paused';

export interface PlatformHealth {
  id: string;
  business_id: string;
  platform: string;
  kind: PlatformKind;
  handle: string | null;
  health_score: number;
  top_fix: string | null;
  last_checked: string | null;
  /** 0-5 stars. 0 means the platform has not been researched yet. */
  region_friendly: number;
  difficulty: PlatformDifficulty | null;
  potential: PlatformPotential | null;
  onboarding_status: PlatformOnboarding;
  profile_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommandActionLog {
  id: string;
  business_id: string;
  platform: string | null;
  kind: string;
  ref_id: string | null;
  detail: string | null;
  created_at: string;
}

// ─── Nexus Brain MCP: auth ─────────────────────────────────────────────────────

export interface WorkspaceApiToken {
  id: string;
  business_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes: string;
  created_by: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface OAuthClientRow {
  id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
  created_at: string;
}

export interface OAuthAuthorizationCode {
  id: string;
  code_hash: string;
  client_id: string;
  user_id: string;
  business_id: string;
  scopes: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface OAuthRefreshToken {
  id: string;
  token_hash: string;
  client_id: string;
  user_id: string;
  business_id: string;
  scopes: string;
  expires_at: string | null;
  revoked_at: string | null;
  rotated_from: string | null;
  created_at: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error_code: string;
  message: string;
}
