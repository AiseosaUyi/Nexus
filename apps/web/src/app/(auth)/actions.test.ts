import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUp, signIn, confirmEmail, authenticateAndAcceptInvite } from './actions';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSignupConfirmationEmail, isEmailConfigured } from '@/lib/email';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendSignupConfirmationEmail: vi.fn(),
  isEmailConfigured: vi.fn(),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const ORIGINAL_ENV = { ...process.env };

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      verifyOtp: vi.fn(),
    },
    rpc: vi.fn(),
  };

  const adminUsersQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  const mockAdmin = {
    auth: {
      admin: {
        generateLink: vi.fn(),
        createUser: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    from: vi.fn(() => adminUsersQuery),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_APP_URL: 'https://nexus.test', VERCEL_ENV: 'production' };
    (createClient as any).mockResolvedValue(mockSupabase);
    (createServiceClient as any).mockReturnValue(mockAdmin);
    (isEmailConfigured as any).mockReturnValue(true);
    (sendSignupConfirmationEmail as any).mockResolvedValue({ success: true });
    adminUsersQuery.select.mockReturnValue(adminUsersQuery);
    adminUsersQuery.eq.mockReturnValue(adminUsersQuery);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('signUp', () => {
    const valid = { email: 'New@Example.com ', password: 'password123', full_name: 'Test User' };

    it('creates the account unconfirmed and emails a confirmation link — no session, no auto-confirm', async () => {
      mockAdmin.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'hash-abc' } },
        error: null,
      });

      await signUp(form(valid));

      expect(mockAdmin.auth.admin.generateLink).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signup', email: 'new@example.com', password: 'password123' }),
      );
      const call = (sendSignupConfirmationEmail as any).mock.calls[0][0];
      expect(call.to).toBe('new@example.com');
      expect(call.confirmUrl).toBe(
        'https://nexus.test/auth/confirm?token_hash=hash-abc&type=signup&next=%2Fdashboard',
      );
      expect(mockAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
      expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/signup?sent=1');
    });

    it('tells the user to sign in when the email is already registered', async () => {
      mockAdmin.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
      });

      await signUp(form(valid));

      expect(sendSignupConfirmationEmail).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('already%20exists'));
    });

    it('reports a send failure without confirming the account', async () => {
      mockAdmin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h' } }, error: null });
      (sendSignupConfirmationEmail as any).mockResolvedValue({ error: 'Brevo 500' });

      await signUp(form(valid));

      expect(mockAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/signup?error='));
    });

    it('never skips verification in production, even if Brevo is not configured', async () => {
      (isEmailConfigured as any).mockReturnValue(false);
      mockAdmin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h' } }, error: null });
      (sendSignupConfirmationEmail as any).mockResolvedValue({ error: 'Email not configured' });

      await signUp(form(valid));

      expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalledWith('/dashboard');
    });

    it('local dev without Brevo: creates a confirmed account and signs in', async () => {
      process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development', VERCEL_ENV: '' } as NodeJS.ProcessEnv;
      (isEmailConfigured as any).mockReturnValue(false);
      mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

      await signUp(form(valid));

      expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', email_confirm: true }),
      );
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('validates email and password before touching auth', async () => {
      await signUp(form({ email: 'nope', password: 'password123' }));
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('valid%20email'));
      await signUp(form({ email: 'a@b.co', password: '123' }));
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('at%20least%206'));
      expect(mockAdmin.auth.admin.generateLink).not.toHaveBeenCalled();
    });
  });

  describe('confirmEmail', () => {
    it('verifies the token and redirects to the safe next path', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({ error: null });
      await confirmEmail(form({ token_hash: 'hash-abc', type: 'signup', next: '/dashboard' }));
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'hash-abc' });
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('refuses open redirects in next', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({ error: null });
      await confirmEmail(form({ token_hash: 'h', type: 'magiclink', next: '//evil.example' }));
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('rejects unexpected OTP types without calling verifyOtp', async () => {
      await confirmEmail(form({ token_hash: 'h', type: 'recovery' }));
      expect(mockSupabase.auth.verifyOtp).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='));
    });

    it('sends an expired/used token back to login', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } });
      await confirmEmail(form({ token_hash: 'h', type: 'signup' }));
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('expired'));
    });
  });

  describe('signIn', () => {
    it('redirects to dashboard on success', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
      await signIn(form({ email: 'test@example.com', password: 'password123' }));
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('redirects to login with error on failure', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } });
      await signIn(form({ email: 'test@example.com', password: 'password123' }));
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('login?error=Invalid%20credentials'));
    });

    it('resends a confirmation link when the email is not confirmed', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });
      mockAdmin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h2' } }, error: null });

      await signIn(form({ email: 'pending-1@example.com', password: 'password123' }));

      expect(mockAdmin.auth.admin.generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'pending-1@example.com' });
      expect((sendSignupConfirmationEmail as any).mock.calls[0][0].confirmUrl).toContain('type=magiclink');
      expect(redirect).toHaveBeenCalledWith('/login?notice=confirm-sent');
    });

    it('rate-limits confirmation resends per email', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });
      mockAdmin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h' } }, error: null });

      for (let i = 0; i < 5; i++) await signIn(form({ email: 'pending-2@example.com', password: 'pw123456' }));

      expect(sendSignupConfirmationEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe('authenticateAndAcceptInvite', () => {
    const liveInvite = {
      email: 'invitee@example.com',
      accepted_at: null,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    it('refuses an invite addressed to a different email before creating anything', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [liveInvite], error: null });

      const res = await authenticateAndAcceptInvite(
        form({ email: 'someone-else@example.com', password: 'password123', full_name: 'X', token: 't' }),
      );

      expect(res).toEqual({ error: expect.stringContaining('different email') });
      expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
      expect(mockAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('refuses an expired invite', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{ ...liveInvite, expires_at: new Date(Date.now() - 1000).toISOString() }],
        error: null,
      });
      const res = await authenticateAndAcceptInvite(
        form({ email: 'invitee@example.com', password: 'password123', full_name: 'X', token: 't' }),
      );
      expect(res).toEqual({ error: expect.stringContaining('invalid, expired') });
      expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('does not confirm an existing unconfirmed account unless the invite matches its email', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [liveInvite], error: null });
      const res = await authenticateAndAcceptInvite(
        form({ email: 'squatter@example.com', password: 'password123', token: 't', is_existing: 'true' }),
      );
      expect(res).toHaveProperty('error');
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(mockAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('creates a confirmed account for the invited email and joins the workspace', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [liveInvite], error: null }) // get_invitation_by_token
        .mockResolvedValueOnce({ data: { success: true, business_id: 'biz-1' }, error: null }); // accept_invitation
      mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
      mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
      const businessesQuery: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
      businessesQuery.select.mockReturnValue(businessesQuery);
      businessesQuery.eq.mockReturnValue(businessesQuery);
      businessesQuery.single.mockResolvedValue({ data: { slug: 'acme', name: 'Acme' }, error: null });
      (mockSupabase as any).from = vi.fn(() => businessesQuery);

      const res = await authenticateAndAcceptInvite(
        form({ email: 'Invitee@Example.com', password: 'password123', full_name: 'Invited Person', token: 't' }),
      );

      expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'invitee@example.com', email_confirm: true }),
      );
      expect(res).toEqual({ success: true, businessSlug: 'acme', businessName: 'Acme' });
    });
  });
});
