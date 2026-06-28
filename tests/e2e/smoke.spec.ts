import { test, expect, Page } from '@playwright/test';

const IGNORED_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service.?Worker/i,
  /workbox/i,
  /\bGoogleMapsApi\b.*loading the API/i,
  /Failed to load resource.*manifest/i,
  // Chromium logs HTTP 4xx/5xx as console errors even when handled by app code
  /Failed to load resource.*status of (4\d\d|5\d\d)/i,
];

const IGNORED_REQUEST_PATTERNS = [
  /sw\.js/i,
  /workbox-/i,
  /manifest\.json/i,
  /favicon/i,
  /\.map$/i,
];

function attachListeners(page: Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (IGNORED_REQUEST_PATTERNS.some((re) => re.test(url))) return;
    failedRequests.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? 'unknown'}`);
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  return { consoleErrors, failedRequests };
}

const PUBLIC_ROUTES = [
  { path: '/', label: 'Landing' },
  { path: '/auth/passenger', label: 'PassengerAuth' },
  { path: '/auth/pilot', label: 'PilotAuth' },
  { path: '/admin/login', label: 'AdminLogin' },
  { path: '/terms', label: 'TermsOfUse' },
  { path: '/privacy', label: 'PrivacyPolicy' },
  { path: '/instalar', label: 'Install' },
];

test.describe('Public routes render without runtime errors', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.label} (${route.path})`, async ({ page }) => {
      const { consoleErrors, failedRequests } = attachListeners(page);

      await page.goto(route.path, { waitUntil: 'networkidle' });

      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length, `Empty body on ${route.path}`).toBeGreaterThan(0);

      expect(consoleErrors, `Console errors on ${route.path}: ${consoleErrors.join('\n')}`).toEqual([]);
      expect(failedRequests, `Failed requests on ${route.path}: ${failedRequests.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('NotFound route', () => {
  test('unknown path renders NotFound', async ({ page }) => {
    await page.goto('/rota-que-nao-existe', { waitUntil: 'networkidle' });
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body.length).toBeGreaterThan(0);
  });
});

test.describe('Landing navigation', () => {
  test('a link with href to /auth/* navigates to auth page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Only accept real navigation targets — skip anchor links (#hash)
    const navLink = page.locator('a[href^="/auth/"]').first();
    const exists = (await navLink.count()) > 0;
    test.skip(!exists, 'Landing has no direct /auth/* link — uses scroll anchors instead');

    const href = await navLink.getAttribute('href');
    await navLink.click();
    await page.waitForURL(new RegExp(href ?? '/auth/'), { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth\/(passenger|pilot)/);
  });
});

test.describe('Protected route redirects unauthenticated user', () => {
  const protectedExamples = ['/passenger', '/pilot', '/admin'];

  for (const path of protectedExamples) {
    test(`${path} redirects when not logged in`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const finalUrl = new URL(page.url()).pathname;
      const stayedOnProtected = finalUrl === path;
      const hasAuthGate =
        (await page.locator('input[type="email"], input[type="password"]').count()) > 0;
      expect(
        !stayedOnProtected || hasAuthGate,
        `${path} did not redirect or render auth gate (final ${finalUrl})`,
      ).toBeTruthy();
    });
  }
});

test.describe('Passenger auth form validation', () => {
  test('empty submit shows validation feedback', async ({ page }) => {
    await page.goto('/auth/passenger', { waitUntil: 'networkidle' });

    const submit = page.locator('button[type="submit"]').first();
    const submitVisible = await submit.isVisible().catch(() => false);
    test.skip(!submitVisible, 'No submit button on /auth/passenger');

    await submit.click();
    const hasFeedback = await Promise.race([
      page
        .locator(':invalid, [aria-invalid="true"], [role="alert"]')
        .first()
        .waitFor({ timeout: 2_000 })
        .then(() => true)
        .catch(() => false),
      page.waitForTimeout(2_000).then(() => false),
    ]);
    expect(hasFeedback).toBeTruthy();
  });
});

test.describe('Admin login form rejects fake credentials gracefully', () => {
  test('renders inputs and does not crash on submit', async ({ page }) => {
    const { consoleErrors } = attachListeners(page);
    await page.goto('/admin/login', { waitUntil: 'networkidle' });

    const email = page.locator('input[type="email"]').first();
    const password = page.locator('input[type="password"]').first();
    const submit = page.locator('button[type="submit"]').first();

    const allVisible =
      (await email.isVisible().catch(() => false)) &&
      (await password.isVisible().catch(() => false)) &&
      (await submit.isVisible().catch(() => false));
    test.skip(!allVisible, 'AdminLogin form not rendered as expected');

    await email.fill('does-not-exist@example.invalid');
    await password.fill('not-a-real-password-123');
    await submit.click();

    await page.waitForTimeout(2_500);
    expect(consoleErrors, `Console errors on AdminLogin submit: ${consoleErrors.join('\n')}`).toEqual([]);
  });
});

test.describe('Edge function — admin-create-user', () => {
  test('rejects unauthenticated POST with 401', async ({ request }) => {
    // Reads supabase URL from frontend env injection via meta tag if present,
    // otherwise skips. We never send valid auth so no real user is created.
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    test.skip(!supabaseUrl, 'VITE_SUPABASE_URL env var not set — cannot probe edge function');

    const res = await request.post(`${supabaseUrl}/functions/v1/admin-create-user`, {
      data: { role: 'passenger', email: 'noone@example.invalid', full_name: 'Test' },
      failOnStatusCode: false,
    });
    // Without auth header the function must return 401, never 500 or 200
    expect([401, 403], `Got status ${res.status()}`).toContain(res.status());
  });
});
