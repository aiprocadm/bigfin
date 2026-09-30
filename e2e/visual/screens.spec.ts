import { BrowserContext, expect, test } from '@playwright/test';
import { SCREENS } from './screens';
import { canSignIn, guestContext, signedInContext } from './signin';

/**
 * Эталонные снимки 26 экранов (UI-056-1 ТЗ-4): ноутбук 1440×900 и телефон
 * 390×844, светлая и тёмная тема — 104 снимка.
 *
 * Снимаются на локальной копии витрины со стендовыми данными. Эталоны лежат
 * рядом (`screens.spec.ts-snapshots/`); порог расхождения — 0,2 % точек.
 *
 * ДАННЫЕ ЖИВЫЕ. Демо-организация строится от сегодняшней даты, и через месяц
 * суммы и подписи дат разойдутся с эталоном — это ожидаемо. Обновить эталоны:
 *   npx playwright test visual/screens.spec.ts --update-snapshots
 * и просмотреть разницу глазами до коммита.
 */
const SIZES = [
  { name: '1440', viewport: { width: 1440, height: 900 } },
  { name: '390', viewport: { width: 390, height: 844 } },
] as const;
const THEMES = ['light', 'dark'] as const;

for (const size of SIZES) {
  for (const theme of THEMES) {
    test.describe(`эталоны ${size.name} — ${theme === 'light' ? 'светлая' : 'тёмная'}`, () => {
      test.skip(!canSignIn(), 'нет данных входа: PLAYWRIGHT_EMAIL/PASSWORD или PLAYWRIGHT_SIGNIN_FILE');

      let context: BrowserContext;
      test.beforeAll(async ({ browser, baseURL }) => {
        context = await signedInContext(browser, baseURL!, {
          viewport: size.viewport,
          colorScheme: theme,
          deviceScaleFactor: 1,
        });
      });
      test.afterAll(async () => context?.close());

      for (const screen of SCREENS) {
        test(screen.title, async ({ browser, baseURL }) => {
          const guest = screen.guest
            ? await guestContext(browser, baseURL!, { viewport: size.viewport, colorScheme: theme, deviceScaleFactor: 1 })
            : null;
          const page = await (guest ?? context).newPage();
          await page.goto(baseURL + screen.path);
          await page.waitForLoadState('networkidle');
          if (!screen.guest) expect(page.url(), 'вход истёк: экран увёл на страницу входа').not.toContain('/auth/');
          if (screen.open) await screen.open(page);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(800);

          await expect(page).toHaveScreenshot(`${screen.name}-${size.name}-${theme}.png`, {
            maxDiffPixelRatio: 0.002,
            animations: 'disabled',
            caret: 'hide',
            // Значок панели отладки запросов — только в сборке для разработки.
            style: '.ReactQueryDevtools, [aria-label="Open React Query Devtools"] { display: none !important; }',
          });
          await page.close();
          await guest?.close();
        });
      }
    });
  }
}
