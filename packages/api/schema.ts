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

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error_code: string;
  message: string;
}
