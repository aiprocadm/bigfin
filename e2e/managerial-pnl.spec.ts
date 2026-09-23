import { test, expect } from '@playwright/test';
import { goTo, hasCredentials, login } from './_login';

/**
 * Управленческий ОПиУ (FT-010, FT-016 ТЗ-3) — глазами человека.
 *
 * Сценарий ничего не создаёт и не удаляет: он смотрит лестницу прибыли и
 * переключается на бухгалтерский вид и обратно.
 */
test.describe('управленческий ОПиУ', () => {
  test.skip(
    !hasCredentials(),
    'Нужны PLAYWRIGHT_EMAIL и PLAYWRIGHT_PASSWORD — см. e2e/_login.ts',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('лестница прибыли: маржинальный доход, ВП и чистая прибыль', async ({ page }) => {
    await goTo(
      page,
      '/financial-reports/profit-loss-sheet?view=managerial&fromDate=2026-01-01&toDate=2026-12-31',
    );

    await expect(
      page.getByRole('heading', { name: 'Управленческий ОПиУ' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    for (const line of ['Маржинальный доход', 'Валовая прибыль общая (ВП2)', 'Чистая прибыль']) {
      await expect(page.getByText(line, { exact: true }).first()).toBeVisible();
    }
    // У итога яруса есть подсказка-формула (FT-016).
    await expect(
      page.getByRole('button', { name: /Маржинальный доход: МД = Выручка/ }),
    ).toBeVisible();
  });

  test('переключение на бухгалтерский вид и обратно — ссылкой', async ({ page }) => {
    await goTo(page, '/financial-reports/profit-loss-sheet?view=managerial');

    await page.getByRole('button', { name: 'Бухгалтерский' }).click();
    await expect(page).toHaveURL(/view=accounting/);

    await page.getByRole('button', { name: 'Управленческий' }).click();
    await expect(page).toHaveURL(/view=managerial/);
  });
});
