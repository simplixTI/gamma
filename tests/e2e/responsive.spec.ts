import { test, expect } from '@playwright/test';

const PUBLIC_PATHS = ['/', '/auth/passenger', '/auth/pilot', '/admin/login', '/terms', '/privacy'];

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test.describe('Responsive — page renders without horizontal overflow', () => {
  for (const viewport of VIEWPORTS) {
    for (const path of PUBLIC_PATHS) {
      test(`${path} on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(path, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const horizontalOverflow = overflow.scrollWidth - overflow.clientWidth;
        expect(
          horizontalOverflow,
          `Horizontal overflow ${horizontalOverflow}px on ${path} at ${viewport.name}`,
        ).toBeLessThanOrEqual(2);
      });
    }
  }
});
