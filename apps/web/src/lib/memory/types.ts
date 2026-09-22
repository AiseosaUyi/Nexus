export type MemoryKind =
  | 'fact'
  | 'decision'
  | 'preference'
  | 'open_loop'
  | 'person'
  | 'project'
  | 'event'
  | 'insight'
  | 'session_summary';

export type MemoryStatus = 'active' | 'resolved' | 'archived' | 'superseded';

export interface Memory {
  id: string;
  business_id: string;
  kind: MemoryKind;
  subject: string;
  content: string;
  tags: string[];
  source: string;
  source_ref: string | null;
  confidence: number;
  status: MemoryStatus;
  supersedes_id: string | null;
  due_at: string | null;
  node_id: string | null;
  dedupe_key: string;
  recall_count: number;
  last_recalled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RememberInput {
  kind: MemoryKind;
  subject: string;
  content: string;
  tags?: string[];
  source?: string;
  sourceRef?: string;
  confidence?: number;
  dueAt?: string;
  nodeId?: string;
  supersede?: boolean;
}

export type RememberAction = 'created' | 'updated' | 'superseded';
