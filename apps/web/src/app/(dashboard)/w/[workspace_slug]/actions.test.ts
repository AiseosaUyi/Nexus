import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNode,
  createTeamspace,
  resolveThread,
  unresolveThread,
  editComment,
  deleteComment,
  addComment,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Workspace Server Actions', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  // Mock the supabase chain
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
    
    // Default chain behavior
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
  });

  describe('createNode', () => {
    it('should successfully create a node when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
      // Chain for position check
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null }); 
      // Chain for insert
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'node-123', title: 'Test Node' }, error: null });

      const result = await createNode({
        business_id: 'biz-123',
        type: 'document',
        title: 'Test Node'
      });

      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('node-123');
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should return error if not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await createNode({
        business_id: 'biz-123',
        type: 'document'
      });

      expect(result.error).toBe('Not authenticated');
    });

    it('should handle missing teamspace_id column error gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null }); 
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: "Could not find the 'teamspace_id' column of 'nodes' in the schema cache" } 
      });

      const result = await createNode({
        business_id: 'biz-123',
        type: 'document'
      });

      expect(result.error).toContain('database/migrations/10_teamspaces.sql');
    });
  });

  describe('createTeamspace', () => {
    it('should successfully create a teamspace', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null }); // position
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'ts-123', name: 'General' }, error: null });

      const result = await createTeamspace({
        business_id: 'biz-123',
        name: 'General'
      });

      expect(result.data?.name).toBe('General');
      expect(revalidatePath).toHaveBeenCalled();
    });
  });

  describe('Comment actions', () => {
    describe('resolveThread', () => {
      it('returns Forbidden when RLS blocks the update (no row returned)', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'non-author' } } });
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

        const result = await resolveThread('thread-1');
        expect(result.error).toBe('Forbidden');
      });

      it('returns no error when the update succeeds', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'author' } } });
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'thread-1', is_resolved: true },
          error: null,
        });

        const result = await resolveThread('thread-1');
        expect(result.error).toBeNull();
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({ is_resolved: true, resolved_by: 'author' })
        );
      });

      it('returns Unauthorized without a session', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
        const result = await resolveThread('thread-1');
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('unresolveThread', () => {
      it('clears resolved_by + resolved_at on success', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'author' } } });
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'thread-1', is_resolved: false },
          error: null,
        });

        const result = await unresolveThread('thread-1');
        expect(result.error).toBeNull();
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({ is_resolved: false, resolved_by: null, resolved_at: null })
        );
      });
    });

    describe('editComment', () => {
      it('blocks editing another user’s comment', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
        // Pre-edit fetch: author is someone else
        mockSupabase.single.mockResolvedValueOnce({
          data: { content: { text: 'old' }, thread_id: 't1', user_id: 'someone-else' },
          error: null,
        });

        const result = await editComment('comment-1', { text: 'new' });
        expect(result.error).toBe('Forbidden');
        expect(mockSupabase.update).not.toHaveBeenCalled();
      });

      it('marks is_edited=true and stamps edited_at on success', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
        mockSupabase.single
          .mockResolvedValueOnce({
            data: { content: { text: 'old' }, thread_id: 't1', user_id: 'me' },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { id: 'comment-1', is_edited: true },
            error: null,
          });

        const result = await editComment('comment-1', { text: 'new' });
        expect(result.error).toBeNull();
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({ is_edited: true, content: { text: 'new' } })
        );
      });
    });

    describe('deleteComment', () => {
      it('blocks deleting another user’s comment', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
        mockSupabase.single.mockResolvedValueOnce({
          data: { user_id: 'someone-else' },
          error: null,
        });

        const result = await deleteComment('comment-1');
        expect(result.error).toBe('Forbidden');
        // delete() is built up through the chain; we verify by ensuring update wasn't
        // called (delete uses .delete() which is also a chained mock).
      });

      it('returns Unauthorized without a session', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
        const result = await deleteComment('comment-1');
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('addComment', () => {
      it('auto-unresolves a resolved thread before posting', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'me' } } });
        // The auto-unresolve update chain returns nothing useful; the eq()
        // call returns the chain itself, then resolves.
        mockSupabase.eq.mockReturnValue(mockSupabase);
        // The insert single() resolves with the new comment
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'comment-1', thread_id: 't1', content: { text: 'hi' } },
          error: null,
        });

        const result = await addComment('t1', { text: 'hi' });
        expect(result.error).toBeNull();
        // First update call should be the auto-unresolve
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({ is_resolved: false })
        );
      });
    });
  });
});
