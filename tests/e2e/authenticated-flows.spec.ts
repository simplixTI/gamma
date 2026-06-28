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
  // Auth pages have a TAB "Entrar" and a SUBMIT "Entrar" — pick the last one
  await page.getByRole('button', { name: /^entrar$/i }).last().click();
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
    await loginViaForm(page, '/auth/passenger', PASSENGER_EMAIL, PASSENGER_PASSWORD, /^https?:\/\/[^/]+\/passenger($|\/(?!auth|login))/);
    expect(page.url()).toMatch(/\/passenger/);
  });

  test('passenger can navigate to settings, history, profile, wallet', async ({ page }) => {
    await loginViaForm(page, '/auth/passenger', PASSENGER_EMAIL, PASSENGER_PASSWORD, /^https?:\/\/[^/]+\/passenger($|\/(?!auth|login))/);
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
    await loginViaForm(page, '/auth/pilot', PILOT_EMAIL, PILOT_PASSWORD, /^https?:\/\/[^/]+\/pilot($|\/(?!auth|login))/);
    expect(page.url()).toMatch(/\/pilot/);
  });

  test('pilot can navigate to history, profile, earnings, settings', async ({ page }) => {
    await loginViaForm(page, '/auth/pilot', PILOT_EMAIL, PILOT_PASSWORD, /^https?:\/\/[^/]+\/pilot($|\/(?!auth|login))/);
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

test.describe('Change password flow', () => {
  test.skip(!haveAllCreds, 'E2E_* env vars missing');

  test('passenger can change password and log in with new one', async ({ page, browser }) => {
    const newPwd = `E2eNew-${Date.now()}`;

    // 1. Login com senha original
    await loginViaForm(page, '/auth/passenger', PASSENGER_EMAIL, PASSENGER_PASSWORD, /^https?:\/\/[^/]+\/passenger($|\/(?!auth|login))/);

    // 2. Espera a sessao ser persistida em localStorage antes de navegar
    await page.waitForFunction(
      () => Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')),
      { timeout: 10_000 },
    );

    // 3. Vai pra Settings
    await page.goto('/passenger/settings');
    await expect(page.getByRole('heading', { name: /configura[cç][oõ]es/i })).toBeVisible({ timeout: 15_000 });

    // 3. Abre dialog
    await page.locator('button').filter({ hasText: /alterar senha/i }).first().click();
    await page.locator('input#new-pwd').fill(newPwd);
    await page.locator('input#confirm-pwd').fill(newPwd);
    await page.locator('button[type="submit"]').filter({ hasText: /salvar/i }).click();

    // 4. Confirma sucesso (toast)
    await expect(page.getByText(/senha alterada/i)).toBeVisible({ timeout: 5_000 });

    // 5. Desloga e tenta logar com senha nova em outra sessao
    const ctx = await browser.newContext();
    const fresh = await ctx.newPage();
    await loginViaForm(fresh, '/auth/passenger', PASSENGER_EMAIL, newPwd, /^https?:\/\/[^/]+\/passenger($|\/(?!auth|login))/);
    expect(fresh.url()).toMatch(/\/passenger/);
    await ctx.close();

    // 6. Reseta a senha original via Management API pra nao quebrar testes futuros
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const projectRef = process.env.SUPABASE_PROJECT_REF;
    if (accessToken && projectRef) {
      const sql = `UPDATE auth.users SET encrypted_password = crypt('${PASSENGER_PASSWORD}', gen_salt('bf')) WHERE email = '${PASSENGER_EMAIL}';`;
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      expect(res.ok, `Failed to reset password: ${await res.text()}`).toBeTruthy();
    } else {
      console.warn('SUPABASE_ACCESS_TOKEN missing — passenger password left as new value, manual reset needed');
    }
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
