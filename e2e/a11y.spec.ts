import AxeBuilder from '@axe-core/playwright';
import { BrowserContext, expect, test } from '@playwright/test';
import { SCREENS } from './visual/screens';
import { canSignIn, guestContext, signedInContext } from './visual/signin';

/**
 * Доступность 26 эталонных экранов (UI-055-1 ТЗ-4, DoD этапа 54).
 *
 * Правило: ни одного нарушения уровня «критичное» и «серьёзное» по WCAG 2 A/AA
 * — в светлой и в тёмной теме. Контраст текста ≥ 4.5:1 входит сюда же
 * (правило `color-contrast` axe): его и проверяли глазами в этапе 54, теперь
 * проверяет машина.
 *
 * Нарушение печатается списком «правило → элементы», чтобы чинить сразу, а не
 * разбирать отчёт.
 */
const THEMES = ['light', 'dark'] as const;

/** Элемент и, для контраста, сами цвета: чинить по ним, а не по догадке. */
function describeNode(node: { target: unknown[]; any: { data?: any }[] }): string {
  const data = node.any[0]?.data;
  const colors =
    data && data.fgColor
      ? ` (${data.fgColor} на ${data.bgColor}, ${data.contrastRatio}:1, нужно ${data.expectedContrastRatio})`
      : '';
  return node.target.join(' ') + colors;
}

for (const theme of THEMES) {
  test.describe(`доступность — ${theme === 'light' ? 'светлая' : 'тёмная'} тема`, () => {
    test.skip(!canSignIn(), 'нет данных входа: PLAYWRIGHT_EMAIL/PASSWORD или PLAYWRIGHT_SIGNIN_FILE');

    let context: BrowserContext;
    test.beforeAll(async ({ browser, baseURL }) => {
      context = await signedInContext(browser, baseURL!, {
        viewport: { width: 1440, height: 900 },
        colorScheme: theme,
      });
    });
    test.afterAll(async () => context?.close());

    for (const screen of SCREENS) {
      test(screen.title, async ({ browser, baseURL }) => {
        const guest = screen.guest
          ? await guestContext(browser, baseURL!, { viewport: { width: 1440, height: 900 }, colorScheme: theme })
          : null;
        const page = await (guest ?? context).newPage();
        await page.goto(baseURL + screen.path);
        await page.waitForLoadState('networkidle');
        // Вход истёк — продукт тихо уводит на страницу входа, и проверялась
        // бы она, а не экран. Такой прогон зелёным быть не должен.
        if (!screen.guest) expect(page.url(), 'вход истёк: экран увёл на страницу входа').not.toContain('/auth/');
        if (screen.open) await screen.open(page);
        // Появление блоков (скелеты → данные) — спокойное, но не мгновенное.
        await page.waitForTimeout(800);

        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          // Панель отладки запросов есть только в сборке для разработки.
          .exclude('.ReactQueryDevtools')
          // Фирменный знак: жёлтое «fin» — логотип, контраст к нему не
          // применяется (WCAG 1.4.3). Метка ставится только в Logo.tsx.
          .exclude('[data-brand-logo]')
          .analyze();
        const serious = result.violations
          .filter((v) => v.impact === 'critical' || v.impact === 'serious')
          .map((v) => `${v.id}: ${v.nodes.slice(0, 5).map(describeNode).join(' | ')}`);

        await page.close();
        await guest?.close();
        expect(serious, `${screen.title} (${screen.path})`).toEqual([]);
      });
    }
  });
}
