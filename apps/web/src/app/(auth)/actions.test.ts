import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, signOut } from './actions';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Mock Next.js and Supabase
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// signUp dynamically imports @supabase/supabase-js to make an admin client
// when no session is returned. Mock it so the test doesn't require real env.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
  })),
}));

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('signUp', () => {
    it('redirects to dashboard when session exists (email confirmed)', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('full_name', 'Test User');

      mockSupabase.auth.signUp.mockResolvedValue({ 
        data: { session: { user: { id: '123' } } }, 
        error: null 
      });

      await signUp(formData);

      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('auto-confirms and signs in when session is null (email unconfirmed)', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('full_name', 'Test User');

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { session: null, user: { id: '123' } },
        error: null,
      });
      // Auto-confirm path then signs in via the same supabase client.
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      await signUp(formData);

      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects with error message on failure', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');
      formData.append('full_name', 'Test User');

      mockSupabase.auth.signUp.mockResolvedValue({ 
        data: { session: null, user: null }, 
        error: { message: 'Signup failed' } 
      });

      await signUp(formData);

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining('signup?error=Signup%20failed')
      );
    });
  });

  describe('signIn', () => {
    it('redirects to dashboard on success', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ 
        data: { user: { id: '123' } }, 
        error: null 
      });

      await signIn(formData);

      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to login with error on failure', async () => {
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password123');

      mockSupabase.auth.signInWithPassword.mockResolvedValue({ 
        data: { user: null }, 
        error: { message: 'Invalid credentials' } 
      });

      await signIn(formData);

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining('login?error=Invalid%20credentials')
      );
    });
  });
});
