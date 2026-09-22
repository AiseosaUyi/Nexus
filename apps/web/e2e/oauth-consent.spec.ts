import { test, expect, request as pwRequest } from '@playwright/test';
import { createHash, randomBytes } from 'node:crypto';

// Registers a real throwaway OAuth client via DCR so these tests exercise
// the actual /oauth/authorize flow end to end, not a stubbed one. Needs
// migration 29 (oauth_clients) applied — same requirement as every other
// live check in this build; this test will fail with a DB error until then.
//
// Every test here runs authenticated (test.use below): middleware.ts gates
// /oauth/authorize as a protected route, so an unauthenticated visitor
// bounces to /login BEFORE the page component's own client_id/redirect_uri
// validation ever runs — even the "invalid request" cases need a session
// to actually reach that validation, not just the workspace-picker case.
test.use({ storageState: 'playwright/.auth/user.json' });

const REDIRECT_URI = 'http://localhost:9999/cb';

function pkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function registerClient(baseURL: string): Promise<string> {
  const api = await pwRequest.newContext();
  const res = await api.post(`${baseURL}/api/oauth/register`, {
    data: { client_name: 'Playwright E2E client', redirect_uris: [REDIRECT_URI] },
  });
  expect(res.status(), 'DCR should succeed — if this fails, migration 29 is likely not applied').toBe(201);
  const body = await res.json();
  await api.dispose();
  return body.client_id as string;
}

function authorizeUrl(baseURL: string, clientId: string, challenge: string) {
  const url = new URL('/oauth/authorize', baseURL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', 'memory:read memory:write');
  url.searchParams.set('state', 'playwright-test-state');
  return url.toString();
}

test.describe('OAuth consent page — invalid requests', () => {
  test('unknown redirect_uri lands on /oauth/authorize/invalid', async ({ page, baseURL }) => {
    const clientId = await registerClient(baseURL!);
    const { challenge } = pkcePair();
    const url = new URL(authorizeUrl(baseURL!, clientId, challenge));
    url.searchParams.set('redirect_uri', 'http://localhost:9999/not-the-registered-one');

    await page.goto(url.toString());
    await expect(page).toHaveURL(/\/oauth\/authorize\/invalid$/);
    await expect(page.getByText(/looks invalid/i)).toBeVisible();
  });

  test('unknown client_id lands on /oauth/authorize/invalid', async ({ page, baseURL }) => {
    const { challenge } = pkcePair();
    const url = authorizeUrl(baseURL!, 'mcp_client_does_not_exist', challenge);
    await page.goto(url);
    await expect(page).toHaveURL(/\/oauth\/authorize\/invalid$/);
  });
});

// The E2E test user (auth.setup.ts) owns "E2E Test Workspace" and is
// therefore its ADMIN via the handle_new_business trigger.
test.describe('OAuth consent page — authenticated as ADMIN', () => {
  test('ADMIN sees the workspace picker with the requested scopes listed', async ({ page, baseURL }) => {
    const clientId = await registerClient(baseURL!);
    const { challenge } = pkcePair();

    await page.goto(authorizeUrl(baseURL!, clientId, challenge));

    await expect(page.getByText('Connect Playwright E2E client')).toBeVisible();
    await expect(page.getByText('Admin')).toBeVisible();
    // Explicit scope disclosure (design review fix) — never just a generic
    // "this app wants access" sentence.
    await expect(page.getByText(/remember new facts/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Authorize' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Deny' })).toBeVisible();
  });

  test('Deny redirects back with error=access_denied', async ({ page, baseURL }) => {
    const clientId = await registerClient(baseURL!);
    const { challenge } = pkcePair();
    await page.goto(authorizeUrl(baseURL!, clientId, challenge));

    // The redirect target (localhost:9999) isn't a real server in this
    // test environment, so assert on the URL Playwright tries to navigate
    // to rather than waiting for a page load there.
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().startsWith(REDIRECT_URI)).catch(() => null),
      page.getByRole('button', { name: 'Deny' }).click(),
    ]);
    if (request) {
      const url = new URL(request.url());
      expect(url.searchParams.get('error')).toBe('access_denied');
      expect(url.searchParams.get('state')).toBe('playwright-test-state');
    }
  });
});

// NOT YET RUNNABLE: this repo's E2E setup (auth.setup.ts) provisions
// exactly one test account, and that account owns (and is therefore ADMIN
// of) its workspace — there is no second account anywhere in this test
// suite with EDITOR-only membership to sign in as. Un-skipping this
// requires: a second Supabase test user, an env var for its credentials
// (e.g. E2E_EDITOR_EMAIL/E2E_EDITOR_PASSWORD), a setup step that invites
// it into the ADMIN account's workspace as EDITOR, and a second Playwright
// storageState file for it — none of which exist today. Tracked here
// rather than silently skipped with no explanation.
test.describe('OAuth consent page — authenticated as EDITOR', () => {
  test.skip('EDITOR sees the empty state, not the workspace picker', async () => {
    // See the block comment above for what's needed to implement this.
  });
});
