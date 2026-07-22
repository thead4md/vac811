import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error — plain .js worker without type declarations
import worker, { evaluateGoogleIdentity, verifyGoogle, buildProviderRedirect } from './index.js';

type Env = Record<string, string>;

const BASE_ENV: Env = {
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  ALLOWED_DOMAINS: 'beta.vac811.hu,localhost',
  GITHUB_CLIENT_ID: 'gh-id',
  GITHUB_CLIENT_SECRET: 'gh-secret',
};

/** Build a stub tokeninfo `Response` for the mocked Google endpoint. */
const tokeninfoOk = (info: Record<string, unknown>) =>
  new Response(JSON.stringify(info), { status: 200 });

const validInfo = {
  aud: BASE_ENV.GOOGLE_CLIENT_ID,
  email_verified: 'true',
  email: 'vezeto@vac811.hu',
  hd: 'vac811.hu',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Pure identity decision ──────────────────────────────────────────────────

describe('evaluateGoogleIdentity', () => {
  it('accepts a verified @vac811.hu account (hd claim)', () => {
    expect(evaluateGoogleIdentity(validInfo, BASE_ENV)).toEqual({
      ok: true,
      email: 'vezeto@vac811.hu',
    });
  });

  it('accepts when hd is absent but the email suffix matches', () => {
    const info = { ...validInfo, hd: undefined };
    expect(evaluateGoogleIdentity(info, BASE_ENV).ok).toBe(true);
  });

  it('accepts email_verified as a real boolean, not only the string', () => {
    expect(evaluateGoogleIdentity({ ...validInfo, email_verified: true }, BASE_ENV).ok).toBe(true);
  });

  it('rejects a token minted for a different audience', () => {
    const v = evaluateGoogleIdentity({ ...validInfo, aud: 'someone-else' }, BASE_ENV);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/célközönség/);
  });

  it('rejects an unverified email', () => {
    expect(evaluateGoogleIdentity({ ...validInfo, email_verified: 'false' }, BASE_ENV).ok).toBe(false);
    expect(evaluateGoogleIdentity({ ...validInfo, email_verified: undefined }, BASE_ENV).ok).toBe(false);
  });

  it('rejects a non-@vac811.hu identity (no hd, foreign suffix)', () => {
    const v = evaluateGoogleIdentity(
      { ...validInfo, hd: undefined, email: 'someone@gmail.com' },
      BASE_ENV,
    );
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/@vac811\.hu/);
  });

  it('honours ALLOWED_EMAILS when set: blocks non-listed, allows listed', () => {
    const env = { ...BASE_ENV, ALLOWED_EMAILS: 'boss@vac811.hu, vezeto@vac811.hu' };
    expect(evaluateGoogleIdentity(validInfo, env).ok).toBe(true);
    const blocked = evaluateGoogleIdentity({ ...validInfo, email: 'intern@vac811.hu' }, env);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/nincs jóváhagyva/);
  });

  it('rejects a null/empty payload', () => {
    expect(evaluateGoogleIdentity(null, BASE_ENV).ok).toBe(false);
  });

  it('respects a custom ALLOWED_GOOGLE_DOMAIN', () => {
    const env = { ...BASE_ENV, ALLOWED_GOOGLE_DOMAIN: 'example.org' };
    expect(
      evaluateGoogleIdentity({ ...validInfo, hd: 'example.org', email: 'a@example.org' }, env).ok,
    ).toBe(true);
    expect(evaluateGoogleIdentity(validInfo, env).ok).toBe(false);
  });
});

// ── Token verification (fetch to Google mocked) ──────────────────────────────

describe('verifyGoogle', () => {
  it('returns ok for a valid token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => tokeninfoOk(validInfo)));
    const v = await verifyGoogle('good-token', BASE_ENV);
    expect(v.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('rejects a missing token without hitting the network', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const v = await verifyGoogle('', BASE_ENV);
    expect(v.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects when Google returns a non-OK status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 400 })));
    expect((await verifyGoogle('bad', BASE_ENV)).ok).toBe(false);
  });

  it('rejects gracefully when the fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const v = await verifyGoogle('x', BASE_ENV);
    expect(v.ok).toBe(false);
    expect(v.error).toBeTruthy();
  });
});

// ── buildProviderRedirect ────────────────────────────────────────────────────

describe('buildProviderRedirect', () => {
  it('302s to GitHub with a scoped CSRF cookie', () => {
    const res = buildProviderRedirect('github', 'https://auth.example', BASE_ENV);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    expect(res.headers.get('Location')).toContain('client_id=gh-id');
    expect(res.headers.get('Set-Cookie')).toMatch(/csrf-token=github_[0-9a-f]{32};/);
  });

  it('surfaces MISCONFIGURED_CLIENT when the provider secret is absent', async () => {
    const res = buildProviderRedirect('github', 'https://auth.example', {
      ...BASE_ENV,
      GITHUB_CLIENT_SECRET: '',
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('MISCONFIGURED_CLIENT');
  });
});

// ── Router / end-to-end request handling ─────────────────────────────────────

describe('worker.fetch routing + Google gate', () => {
  const call = (input: string, init?: RequestInit, env: Env = BASE_ENV) =>
    worker.fetch(new Request(input, init), env);

  it('rejects an unsupported backend at /auth', async () => {
    const res = await call('https://auth.example/auth?provider=bogus&site_id=beta.vac811.hu');
    expect(await res.text()).toContain('UNSUPPORTED_BACKEND');
  });

  it('rejects a site_id outside ALLOWED_DOMAINS', async () => {
    const res = await call('https://auth.example/auth?provider=github&site_id=evil.example');
    expect(await res.text()).toContain('UNSUPPORTED_DOMAIN');
  });

  it('reports MISCONFIGURED_CLIENT when GOOGLE_CLIENT_ID is unset', async () => {
    const res = await call('https://auth.example/auth?provider=github&site_id=beta.vac811.hu', undefined, {
      ...BASE_ENV,
      GOOGLE_CLIENT_ID: '',
    });
    expect(await res.text()).toContain('MISCONFIGURED_CLIENT');
  });

  it('serves the Google sign-in interstitial (not a provider redirect) for a valid /auth', async () => {
    const res = await call('https://auth.example/auth?provider=github&site_id=beta.vac811.hu');
    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain('https://accounts.google.com');
    const body = await res.text();
    expect(body).toContain('accounts.google.com/gsi/client');
    expect(body).toContain(BASE_ENV.GOOGLE_CLIENT_ID);
  });

  it('blocks /auth/continue when the Google token fails verification (no provider redirect)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    const res = await call('https://auth.example/auth/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ provider: 'github', credential: 'forged' }).toString(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Location')).toBeNull();
    expect(await res.text()).toContain('GOOGLE_AUTH_FAILED');
  });

  it('lets /auth/continue proceed to GitHub after a valid Google sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => tokeninfoOk(validInfo)));
    const res = await call('https://auth.example/auth/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ provider: 'github', credential: 'good' }).toString(),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('github.com/login/oauth/authorize');
    expect(res.headers.get('Set-Cookie')).toMatch(/csrf-token=github_/);
  });

  it('rejects an unsupported backend at /auth/continue before any network call', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const res = await call('https://auth.example/auth/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ provider: 'bogus', credential: 'x' }).toString(),
    });
    expect(await res.text()).toContain('UNSUPPORTED_BACKEND');
    expect(spy).not.toHaveBeenCalled();
  });

  it('detects a CSRF mismatch on /callback', async () => {
    const res = await call('https://auth.example/callback?code=abc&state=deadbeef', {
      headers: { Cookie: `csrf-token=github_${'a'.repeat(32)}` },
    });
    expect(await res.text()).toContain('CSRF_DETECTED');
  });

  it('404s an unknown route', async () => {
    const res = await call('https://auth.example/nope');
    expect(res.status).toBe(404);
  });
});
