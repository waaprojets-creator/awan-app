import { test, expect, Page } from '@playwright/test';

/**
 * SMOKE TEST — boot, déverrouillage, navigation des 14 écrans, screenshots.
 * Détecte les régressions massives (écran blanc, crash JS, route cassée).
 */

const SCREENS = [
  { name: 'dashboard',   nav: '/' },
  { name: 'sante',       nav: '/sante' },
  { name: 'sport',       nav: '/sport' },
  { name: 'nutrition',   nav: '/nutrition' },
  { name: 'mensuration', nav: '/mensuration' },
  { name: 'sleep',       nav: '/sleep' },
  { name: 'islam',       nav: '/islam' },
  { name: 'coach',       nav: '/coach' },
  { name: 'journal',     nav: '/journal' },
  { name: 'planning',    nav: '/planning' },
  { name: 'tasks',       nav: '/tasks' },
  { name: 'trajet',      nav: '/trajet' },
  { name: 'analyse',     nav: '/analyse' },
  { name: 'reglages',    nav: '/reglages' },
] as const;

const ALLOWED_CONSOLE_PATTERNS = [
  /React Router/i, /useNativeDriver/i, /pointer-events/i, /findDOMNode/i,
  /defaultProps/i, /shadow.* style/i, /\[Vite\]/i, /react-router/i,
  /Download the React DevTools/i, /Image with src/i, /favicon/i,
  // Ressources externes inaccessibles dans le sandbox de test
  /Failed to load resource/i, /ERR_CERT_AUTHORITY_INVALID/i,
  /ERR_NAME_NOT_RESOLVED/i, /ERR_INTERNET_DISCONNECTED/i,
  /CORS/i, /openrouteservice/i, /tile\.openstreetmap/i,
];

async function unlockApp(page: Page) {
  // Le LockScreen affiche un hexagone tappable au centre + texte "أوان"
  // Tap au centre déclenche unlock() après 1800ms d'animation
  const locked = await page.locator('text=أوان').isVisible().catch(() => false);
  if (!locked) return;

  await page.tap('body', { position: { x: 195, y: 422 } });
  await page.waitForTimeout(2200);
  // Attendre que le LockScreen disparaisse
  await page.waitForSelector('text=أوان', { state: 'detached', timeout: 5000 }).catch(() => {});
}

test.describe('Smoke — boot + navigation 14 écrans', () => {
  for (const screen of SCREENS) {
    test(`écran "${screen.name}" boot sans crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const txt = msg.text();
          if (!ALLOWED_CONSOLE_PATTERNS.some(p => p.test(txt))) {
            errors.push(`console.error: ${txt}`);
          }
        }
      });

      // goto() recharge la page → reset Zustand → re-lock. On unlock à chaque fois.
      await page.goto(screen.nav);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await unlockApp(page);
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `tests/e2e/screenshots/${screen.name}.png`,
        fullPage: true,
      });

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length,
        `Écran "${screen.name}" body trop court (${bodyText.length}) — bloqué sur splash/lock ?`
      ).toBeGreaterThan(50);

      expect(errors,
        `Erreurs JS sur "${screen.name}":\n${errors.join('\n')}`
      ).toEqual([]);
    });
  }
});
