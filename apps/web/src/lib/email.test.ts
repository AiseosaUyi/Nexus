import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We dynamically import the module after setting env vars + mocking fetch so
// the module's top-level state picks up the test config.

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.BREVO_API_KEY = 'test-api-key';
  process.env.BREVO_SENDER_EMAIL = 'team@nexus.test';
  process.env.BREVO_SENDER_NAME = 'Nexus Test';
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ messageId: 'msg-1' }), { status: 201 }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe('sendTeamInviteEmail', () => {
  it('POSTs to Brevo with the api-key header and a structured payload', async () => {
    const { sendTeamInviteEmail } = await import('./email');
    const result = await sendTeamInviteEmail({
      to: 'bob@example.com',
      inviterName: 'Alice',
      workspaceName: 'Acme HQ',
      role: 'EDITOR',
      acceptUrl: 'https://nexus.test/invite/tok-1',
    });

    expect(result).toEqual({ success: true, id: 'msg-1' });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');
    expect(init.headers['api-key']).toBe('test-api-key');
    const body = JSON.parse(init.body as string);
    expect(body.sender).toEqual({ email: 'team@nexus.test', name: 'Nexus Test' });
    expect(body.to).toEqual([{ email: 'bob@example.com' }]);
    expect(body.subject).toContain('Acme HQ');
    expect(body.htmlContent).toContain('Acme HQ');
    expect(body.htmlContent).toContain('Member'); // role label
    expect(body.htmlContent).toContain('https://nexus.test/invite/tok-1');
    expect(body.textContent).toBeDefined();
  });

  it('returns an error object when Brevo responds with a non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('bad sender', { status: 400 }))
    );
    const { sendTeamInviteEmail } = await import('./email');
    const result = await sendTeamInviteEmail({
      to: 'bob@example.com',
      inviterName: 'Alice',
      workspaceName: 'Acme',
      role: 'EDITOR',
      acceptUrl: 'https://nexus.test/x',
    });
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toContain('400');
  });

  it('returns an error when env is missing — does not call fetch', async () => {
    delete process.env.BREVO_API_KEY;
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const { sendTeamInviteEmail } = await import('./email');
    const result = await sendTeamInviteEmail({
      to: 'bob@example.com',
      inviterName: 'Alice',
      workspaceName: 'Acme',
      role: 'EDITOR',
      acceptUrl: 'https://nexus.test/x',
    });
    expect(result).toEqual({ error: 'Email not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('escapes HTML-dangerous characters in user-supplied fields', async () => {
    const { sendTeamInviteEmail } = await import('./email');
    await sendTeamInviteEmail({
      to: 'bob@example.com',
      inviterName: '<script>alert(1)</script>',
      workspaceName: 'A & B',
      role: 'ADMIN',
      acceptUrl: 'https://nexus.test/x',
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.htmlContent).not.toContain('<script>alert(1)</script>');
    expect(body.htmlContent).toContain('&lt;script&gt;');
    expect(body.htmlContent).toContain('A &amp; B');
  });
});

describe('sendCommentNotificationEmail', () => {
  it('truncates long snippets to ~240 chars with an ellipsis', async () => {
    const { sendCommentNotificationEmail } = await import('./email');
    const long = 'x'.repeat(500);
    await sendCommentNotificationEmail({
      to: 'bob@example.com',
      commenterName: 'Alice',
      documentName: 'Plan',
      commentSnippet: long,
      commentUrl: 'https://nexus.test/c',
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.htmlContent).toContain('…');
    // The truncated x's should appear, but not all 500 of them.
    const xCount = (body.htmlContent.match(/x/g) || []).length;
    expect(xCount).toBeLessThan(500);
    expect(xCount).toBeGreaterThan(200);
  });

  it('includes recipient toName when provided', async () => {
    const { sendCommentNotificationEmail } = await import('./email');
    await sendCommentNotificationEmail({
      to: 'bob@example.com',
      toName: 'Bob Smith',
      commenterName: 'Alice',
      documentName: 'Plan',
      commentSnippet: 'check this',
      commentUrl: 'https://nexus.test/c',
    });
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.to).toEqual([{ email: 'bob@example.com', name: 'Bob Smith' }]);
  });
});
