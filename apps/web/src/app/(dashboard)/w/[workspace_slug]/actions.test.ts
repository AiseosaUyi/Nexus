import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNode, createTeamspace } from './actions';
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
});
