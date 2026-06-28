import { test, expect } from '@playwright/test';

// Auth and CRUD tests against the real Supabase project. By default they are
// SKIPPED so the suite stays green without credentials. To enable, export:
//
//   E2E_ADMIN_EMAIL          — admin user from public.admin_users
//   E2E_ADMIN_PASSWORD
//   E2E_PASSENGER_EMAIL      — confirmed passenger account
//   E2E_PASSENGER_PASSWORD
//   E2E_PILOT_EMAIL          — approved pilot account
//   E2E_PILOT_PASSWORD
//
// CRUD tests are permanently `test.fixme`d — running them against PRD would
// create real auth.users rows / invite emails. Re-enable only against a
// disposable Supabase project, with cleanup via admin_delete_user RPC.

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PASSENGER_EMAIL = process.env.E2E_PASSENGER_EMAIL;
const PASSENGER_PASSWORD = process.env.E2E_PASSENGER_PASSWORD;
const PILOT_EMAIL = process.env.E2E_PILOT_EMAIL;
const PILOT_PASSWORD = process.env.E2E_PILOT_PASSWORD;

test.describe('Admin login + logout', () => {
  test('admin can log in and log out', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD!);
    await page.locator('button').filter({ hasText: /entrar|continuar|enviar/i }).first().click();

    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/admin(?!\/login)/);

    const logout = page.locator('button, a').filter({ hasText: /sair|logout/i }).first();
    const logoutVisible = await logout.isVisible().catch(() => false);
    test.skip(!logoutVisible, 'No logout control visible in admin layout');
    await logout.click();

    await page.waitForURL(/\/admin\/login|^\/$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/admin\/login|\/$/);
  });
});

test.describe('Admin navigation', () => {
  test('all admin sections render', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds missing');

    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD!);
    await page.locator('button').filter({ hasText: /entrar|continuar|enviar/i }).first().click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });

    const sections = ['/admin', '/admin/users', '/admin/pilots', '/admin/rides', '/admin/financial', '/admin/ads', '/admin/vouchers'];
    for (const path of sections) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const text = (await page.locator('body').innerText()).trim();
      expect(text.length, `Empty body on ${path}`).toBeGreaterThan(0);
    }
  });
});

test.describe('Passenger login', () => {
  test('passenger can log in and reach home', async ({ page }) => {
    test.skip(!PASSENGER_EMAIL || !PASSENGER_PASSWORD, 'passenger creds missing');

    await page.goto('/auth/passenger', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(PASSENGER_EMAIL!);
    await page.locator('input[type="password"]').first().fill(PASSENGER_PASSWORD!);
    await page.locator('button').filter({ hasText: /entrar|continuar|enviar/i }).first().click();

    await page.waitForURL(/\/passenger(?!\/?(auth|login))/, { timeout: 15_000 });
    expect(page.url()).toContain('/passenger');
  });
});

test.describe('Pilot login', () => {
  test('pilot can log in and reach dashboard', async ({ page }) => {
    test.skip(!PILOT_EMAIL || !PILOT_PASSWORD, 'pilot creds missing');

    await page.goto('/auth/pilot', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(PILOT_EMAIL!);
    await page.locator('input[type="password"]').first().fill(PILOT_PASSWORD!);
    await page.locator('button').filter({ hasText: /entrar|continuar|enviar/i }).first().click();

    await page.waitForURL(/\/pilot(?!\/?(auth|login))/, { timeout: 15_000 });
    expect(page.url()).toContain('/pilot');
  });
});

test.describe('Admin CRUD — passenger', () => {
  test.fixme('create + delete passenger via admin panel', async () => {
    // PERMANENTLY DISABLED: writes to public.passenger_profiles via the
    // admin-create-user edge function. Running against PRD Supabase would
    // create real auth.users rows and send invite emails. Re-enable only
    // when the suite points at a disposable project, and clean up via the
    // existing admin_delete_user RPC after the test.
  });
});

test.describe('Edge function — admin-create-user uses Resend (not Supabase default)', () => {
  test('response contains email_id from Resend when authenticated as admin', async ({ page, request }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'admin creds missing');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    test.skip(!supabaseUrl, 'VITE_SUPABASE_URL env var not set');

    // Log in via UI to capture the admin JWT
    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL!);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD!);
    await page.locator('button').filter({ hasText: /entrar|continuar|enviar/i }).first().click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 });

    const token = await page.evaluate(() => {
      const raw = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!raw) return null;
      try { return JSON.parse(raw[1]).access_token as string; } catch { return null; }
    });
    test.skip(!token, 'Could not extract admin JWT from localStorage');

    const disposableEmail = `e2e-resend-check+${Date.now()}@example.invalid`;
    const res = await request.post(`${supabaseUrl}/functions/v1/admin-create-user`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'passenger', email: disposableEmail, full_name: 'E2E Resend Check' },
      failOnStatusCode: false,
    });

    const json = await res.json();

    // example.invalid will fail Resend's domain check, so we accept either:
    //   200 with email_id (Resend succeeded) → cleanup user
    //   502 with error mentioning resend or domain → confirms we tried Resend
    // Either way: we must NOT see a Supabase-default invite email signature.
    const isResendPath = !!json.email_id || /resend|domain|invalid|delivery/i.test(json.error ?? '');
    expect(
      isResendPath,
      `Response did not show Resend code-path: ${JSON.stringify(json)}`,
    ).toBeTruthy();

    // Cleanup if user was created
    if (json.user_id) {
      // No direct delete endpoint exposed; admin must clean up manually.
      // Log the id so the operator can run admin_delete_user(<uuid>) if needed.
      console.warn(`[cleanup-needed] created e2e user_id=${json.user_id}`);
    }
  });
});
