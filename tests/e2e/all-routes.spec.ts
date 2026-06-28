import { test, expect, Page } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/auth/passenger',
  '/auth/pilot',
  '/auth/callback',
  '/terms',
  '/privacy',
  '/admin/login',
  '/instalar',
];

const PASSENGER_ROUTES = [
  '/passenger',
  '/passenger/request',
  '/passenger/searching',
  '/passenger/tracking',
  '/passenger/in-ride',
  '/passenger/completed',
  '/passenger/history',
  '/passenger/profile',
  '/passenger/referral',
  '/passenger/payment',
  '/passenger/wallet',
  '/passenger/favorites',
  '/passenger/settings',
  '/passenger/help',
  '/passenger/saved-cards',
];

const PILOT_ROUTES = [
  '/pilot',
  '/pilot/history',
  '/pilot/profile',
  '/pilot/profile/edit',
  '/pilot/earnings',
  '/pilot/settings',
  '/pilot/documents',
];

const PILOT_RIDE_ROUTES = [
  '/pilot/ride/00000000-0000-0000-0000-000000000000',
  '/pilot/rate/00000000-0000-0000-0000-000000000000',
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/pilots',
  '/admin/rides',
  '/admin/financial',
  '/admin/ads',
  '/admin/vouchers',
];

const ALL_PROTECTED = [...PASSENGER_ROUTES, ...PILOT_ROUTES, ...PILOT_RIDE_ROUTES, ...ADMIN_ROUTES];

const IGNORED_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service.?Worker/i,
  /workbox/i,
  /Failed to load resource.*manifest/i,
  /Failed to load resource.*status of (4\d\d|5\d\d)/i,
  /GoogleMapsApi/i,
];

function attachListeners(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  return errors;
}

test.describe('Public routes render without crashing', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route}`, async ({ page }) => {
      const errors = attachListeners(page);
      const res = await page.goto(route, { waitUntil: 'networkidle' }).catch(() => null);
      if (res) expect(res.status(), `HTTP status for ${route}`).toBeLessThan(500);
      const body = (await page.locator('body').innerText()).trim();
      expect(body.length, `Empty body on ${route}`).toBeGreaterThan(0);
      expect(errors, `Console errors on ${route}: ${errors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('Protected routes redirect or show auth gate', () => {
  for (const route of ALL_PROTECTED) {
    test(`${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      const finalPath = new URL(page.url()).pathname;

      const body = (await page.locator('body').innerText()).trim();
      expect(body.length, `White screen on protected ${route}`).toBeGreaterThan(0);

      const stayed = finalPath === route;
      const hasAuthGate =
        (await page.locator('input[type="email"], input[type="password"]').count()) > 0;

      const looksLikeError = /error|something went wrong|400|500/i.test(body);
      expect(
        (!stayed || hasAuthGate) && !looksLikeError,
        `${route}: stayed=${stayed} hasAuthGate=${hasAuthGate} bodyStart="${body.slice(0, 80)}"`,
      ).toBeTruthy();
    });
  }
});

// Auth pages use onClick handlers (not <form onSubmit>), so the submit button
// is just a regular <button>. Match by accessible text instead.
const SUBMIT_BTN_RE = /entrar|continuar|cadastrar|criar conta|enviar/i;

test.describe('Auth pages — passenger form structure', () => {
  test('login mode has email + password + submit', async ({ page }) => {
    await page.goto('/auth/passenger', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: SUBMIT_BTN_RE }).first()).toBeVisible();
  });

  test('register mode shows full_name field', async ({ page }) => {
    await page.goto('/auth/passenger', { waitUntil: 'networkidle' });
    const registerToggle = page.locator('button, a').filter({ hasText: /criar conta|cadastrar|registrar/i }).first();
    const exists = await registerToggle.count();
    test.skip(exists === 0, 'No register toggle found');
    await registerToggle.click();
    const nameField = page.locator('input[placeholder*="nome" i], input[name*="name" i], input#fullName, input#full_name').first();
    await expect(nameField).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Auth pages — pilot form structure', () => {
  test('login mode has email + password + submit', async ({ page }) => {
    await page.goto('/auth/pilot', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: SUBMIT_BTN_RE }).first()).toBeVisible();
  });
});

test.describe('Admin login form', () => {
  test('renders email + password + submit', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'networkidle' });
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: SUBMIT_BTN_RE }).first()).toBeVisible();
  });
});

test.describe('Landing page sections', () => {
  test('has passenger and pilot CTAs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const passengerSignal =
      (await page.locator('a[href="/auth/passenger"], a[href*="passageiro"]').count()) +
      (await page.getByText(/passageiro/i).count());
    const pilotSignal =
      (await page.locator('a[href="/auth/pilot"], a[href*="piloto"]').count()) +
      (await page.getByText(/piloto/i).count());
    expect(passengerSignal, 'No passenger CTA/text on landing').toBeGreaterThan(0);
    expect(pilotSignal, 'No pilot CTA/text on landing').toBeGreaterThan(0);
  });

  test('has Gamma brand visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const brand =
      (await page.getByText(/gamma/i).count()) + (await page.locator('img[alt*="Gamma" i]').count());
    expect(brand, 'No Gamma brand visible on landing').toBeGreaterThan(0);
  });
});
