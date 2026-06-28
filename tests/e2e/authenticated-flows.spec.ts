import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;
const PASSENGER_EMAIL = process.env.E2E_PASSENGER_EMAIL!;
const PASSENGER_PASSWORD = process.env.E2E_PASSENGER_PASSWORD!;
const PILOT_EMAIL = process.env.E2E_PILOT_EMAIL!;
const PILOT_PASSWORD = process.env.E2E_PILOT_PASSWORD!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;

const haveAllCreds = !!(ADMIN_EMAIL && ADMIN_PASSWORD && PASSENGER_EMAIL && PASSENGER_PASSWORD && PILOT_EMAIL && PILOT_PASSWORD && SUPABASE_URL);

const SUBMIT_RE = /entrar|continuar|enviar/i;

async function loginViaForm(page: Page, path: string, email: string, password: string, expectUrl: RegExp) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button').filter({ hasText: SUBMIT_RE }).first().click();
  await page.waitForURL(expectUrl, { timeout: 20_000 });
}

async function extractToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const entry = Object.entries(localStorage).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!entry) return null;
    try { return JSON.parse(entry[1]).access_token as string; } catch { return null; }
  });
}

test.describe('Admin flow', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('admin logs in and reaches dashboard', async ({ page }) => {
    await loginViaForm(page, '/admin/login', ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin(?!\/login)/);
    expect(page.url()).toMatch(/\/admin/);
  });

  test('admin can navigate all admin sections', async ({ page }) => {
    await loginViaForm(page, '/admin/login', ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin(?!\/login)/);
    const sections = ['/admin', '/admin/users', '/admin/pilots', '/admin/rides', '/admin/financial', '/admin/ads', '/admin/vouchers'];
    for (const path of sections) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const body = (await page.locator('body').innerText()).trim();
      expect(body.length, `Empty body on ${path}`).toBeGreaterThan(100);
    }
  });
});

test.describe('Passenger flow', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('passenger logs in via /auth/passenger', async ({ page }) => {
    await loginViaForm(page, '/auth/passenger', PASSENGER_EMAIL, PASSENGER_PASSWORD, /\/passenger(?!\/?(auth|login))/);
    expect(page.url()).toMatch(/\/passenger/);
  });

  test('passenger can navigate to settings, history, profile, wallet', async ({ page }) => {
    await loginViaForm(page, '/auth/passenger', PASSENGER_EMAIL, PASSENGER_PASSWORD, /\/passenger(?!\/?(auth|login))/);
    const routes = ['/passenger/settings', '/passenger/history', '/passenger/profile', '/passenger/wallet', '/passenger/favorites', '/passenger/help', '/passenger/referral'];
    for (const path of routes) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const body = (await page.locator('body').innerText()).trim();
      expect(body.length, `White screen on ${path}`).toBeGreaterThan(50);
    }
  });
});

test.describe('Pilot flow', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('pilot logs in via /auth/pilot', async ({ page }) => {
    await loginViaForm(page, '/auth/pilot', PILOT_EMAIL, PILOT_PASSWORD, /\/pilot(?!\/?(auth|login))/);
    expect(page.url()).toMatch(/\/pilot/);
  });

  test('pilot can navigate to history, profile, earnings, settings', async ({ page }) => {
    await loginViaForm(page, '/auth/pilot', PILOT_EMAIL, PILOT_PASSWORD, /\/pilot(?!\/?(auth|login))/);
    const routes = ['/pilot/history', '/pilot/profile', '/pilot/earnings', '/pilot/settings', '/pilot/documents'];
    for (const path of routes) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const body = (await page.locator('body').innerText()).trim();
      expect(body.length, `White screen on ${path}`).toBeGreaterThan(50);
    }
  });
});

test.describe('Admin creates user via edge function (real end-to-end)', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('passenger creation returns email_id (Resend) and user_id', async ({ page, request }) => {
    await loginViaForm(page, '/admin/login', ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin(?!\/login)/);
    const token = await extractToken(page);
    expect(token, 'Admin JWT not found in localStorage').toBeTruthy();

    const disposable = `e2e-flow-passenger-${Date.now()}@gamma.app.br`;
    const res = await request.post(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'passenger', email: disposable, full_name: 'E2E Flow Passenger', phone: '21900000001', cpf: '00000000001' },
      failOnStatusCode: false,
    });

    const json = await res.json();
    expect(res.status(), `Status ${res.status()} body=${JSON.stringify(json)}`).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user_id, 'No user_id in response').toBeTruthy();
    expect(json.email_id, 'No email_id (Resend) in response').toBeTruthy();

    console.warn(`[cleanup] e2e passenger ${disposable} id=${json.user_id}`);
  });

  test('pilot creation returns email_id and user_id', async ({ page, request }) => {
    await loginViaForm(page, '/admin/login', ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin(?!\/login)/);
    const token = await extractToken(page);
    expect(token).toBeTruthy();

    const disposable = `e2e-flow-pilot-${Date.now()}@gamma.app.br`;
    const res = await request.post(`${SUPABASE_URL}/functions/v1/admin-create-user`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        role: 'pilot',
        email: disposable,
        full_name: 'E2E Flow Pilot',
        phone: '21900000002',
        cpf: '00000000002',
        boat_type: 'Lancha',
        boat_identification: 'E2E-001',
        pilot_type: 'pilot',
      },
      failOnStatusCode: false,
    });

    const json = await res.json();
    expect(res.status(), `Status ${res.status()} body=${JSON.stringify(json)}`).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user_id).toBeTruthy();
    expect(json.email_id).toBeTruthy();

    console.warn(`[cleanup] e2e pilot ${disposable} id=${json.user_id}`);
  });
});

test.describe('Direct signup form on /auth/passenger', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('passenger signup form exposes all required fields', async ({ page }) => {
    await page.goto('/auth/passenger', { waitUntil: 'networkidle' });
    const toggleBtn = page.locator('button, a').filter({ hasText: /criar conta|cadastrar|registrar/i }).first();
    await toggleBtn.click();
    await expect(page.locator('input#fullName, input[placeholder*="nome" i]').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    const cpfField = await page.locator('input#cpf, input[placeholder*="cpf" i]').count();
    const phoneField = await page.locator('input#phone, input[placeholder*="telefone" i], input[type="tel"]').count();
    expect(cpfField + phoneField, 'No CPF or phone field on signup').toBeGreaterThan(0);
  });
});
